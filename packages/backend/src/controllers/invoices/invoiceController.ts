import type { Request, Response } from "express";
import { invoiceFormSchema } from "@jewelledger/shared";
import { created, fail, ok } from "../../lib/apiResponse";
import { computeJewelleryTotals, makeDocumentNumber, splitGst } from "../../lib/documents";
import { evaluatePlaceOfSupply, generateGstJournalPosting, type DocumentTaxSummary, round2 } from "../../lib/gst";
import {
  resolveAccountingAccounts,
  reversePostedJournalsForSource,
  upsertPostedJournalForSource,
} from "../../lib/accounting";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { generateInvoicePdf } from "../../services/invoicePdfService";
import { AuditService } from "../../services/audit/auditService";

const invoiceInclude = {
  customer: true,
  lines: { orderBy: { createdAt: "asc" as const } },
  payments: { orderBy: { date: "desc" as const } },
};

const lineCreates = async (
  companyId: number,
  userId: string,
  lines: Array<{
    sku?: string | null;
    description: string;
    karat: string;
    grossWt: number;
    netWt: number;
    stoneWt: number;
    makingType: string;
    makingRate: number;
    ratePerGram: number;
    discountPct: number;
    gstPct: number;
    hsnCode: string;
    huid?: string | null;
  }>,
) => {
  const totals = computeJewelleryTotals(lines);
  const skus = lines
    .map((line) => line.sku)
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0);

  const items = await prisma.item.findMany({
    where: { companyId, sku: { in: skus } },
  });
  const itemBySku = new Map(items.map((item) => [item.sku, item.id]));

  return {
    totals,
    creates: totals.computedLines.map((line) => ({
      companyId,
      itemId: line.sku ? itemBySku.get(line.sku) : null,
      sku: line.sku || null,
      description: line.description,
      karat: line.karat,
      grossWt: line.grossWt,
      netWt: line.netWt,
      stoneWt: line.stoneWt,
      makingType: line.makingType,
      makingRate: line.makingRate,
      makingAmount: line.makingAmount,
      ratePerGram: line.ratePerGram,
      amount: line.amount,
      discountPct: line.discountPct,
      gstPct: line.gstPct,
      hsnCode: line.hsnCode,
      huid: line.huid,
      total: line.total,
      createdBy: userId,
    })),
  };
};

export const listInvoices = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const rows = await prisma.invoice.findMany({
    where: {
      companyId,
      ...(from || to ? { date: { gte: from, lte: to } } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNo: { contains: search } },
              { customer: { name: { contains: search } } },
            ],
          }
        : {}),
    },
    include: { customer: true, lines: true },
    orderBy: { date: "desc" },
  });

  const totalAmount = rows.reduce((sum, row) => sum + Number(row.grandTotal), 0);
  const paidAmount = rows.reduce((sum, row) => sum + Number(row.paidAmount), 0);
  const balanceDue = rows.reduce((sum, row) => sum + Number(row.balanceDue), 0);

  return ok(res, {
    rows,
    summary: {
      total: totalAmount,
      paid: paidAmount,
      outstanding: balanceDue,
      open: rows.filter((row) => row.status === "OPEN").length,
      overdue: rows.filter((row) => Number(row.balanceDue) > 0 && row.dueDate < new Date()).length,
    },
  });
};

export const getInvoiceById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const [invoice, company, bankAccount] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: Number(req.params.id), companyId },
      include: invoiceInclude,
    }),
    prisma.company.findUnique({
      where: { id: companyId },
    }),
    prisma.account.findFirst({
      where: {
        companyId,
        OR: [{ isBankAccount: true }, { type: "bank" }],
      },
      orderBy: { id: "asc" },
    }),
  ]);

  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");

  const mappedInvoice = {
    ...invoice,
    company: company || {
      name: "HKS JEWELLERS",
      legalName: "HKS JEWELLERS PVT. LTD.",
      gstin: "24AAAAA0000A1Z5",
      state: "Gujarat",
      city: "Ahmedabad",
      addressLine1: "101, Jewel Arcade, C.G. Road",
    },
    bankAccount: bankAccount || null,
    invoiceDate: invoice.date ? new Date(invoice.date).toISOString().slice(0, 10) : null,
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : null,
  };
  return ok(res, mappedInvoice);
};

export const syncInvoiceJournalPosting = async (
  tx: any,
  companyId: number,
  invoice: any,
  actor: string,
) => {
  const [company, customer] = await Promise.all([
    tx.company.findUnique({ where: { id: companyId } }),
    invoice.customerId ? tx.customer.findUnique({ where: { id: invoice.customerId } }) : null,
  ]);

  const posResult = evaluatePlaceOfSupply({
    supplierGstin: company?.gstin,
    supplierState: company?.state,
    recipientGstin: customer?.gstin,
    placeOfSupply: (invoice as any).placeOfSupply || customer?.city,
  });

  const taxSummary: DocumentTaxSummary = {
    lines: [],
    subTotal: Number(invoice.subTotal || 0),
    totalDiscount: Number(invoice.discount || 0),
    taxableAmount: Number(invoice.taxableAmount || 0),
    cgst: Number(invoice.cgst || 0),
    sgst: Number(invoice.sgst || 0),
    igst: Number(invoice.igst || 0),
    cess: 0,
    taxTotal: Number(invoice.cgst || 0) + Number(invoice.sgst || 0) + Number(invoice.igst || 0),
    roundOff: 0,
    grandTotal: Number(invoice.grandTotal || 0),
    rateBreakup: [],
  };

  const accounts = await resolveAccountingAccounts(tx, companyId, actor);
  const postingLines = generateGstJournalPosting({
    documentType: "INVOICE",
    documentNo: invoice.invoiceNo,
    posResult,
    taxSummary,
    accounts,
    partyName: customer?.name,
  });

  await upsertPostedJournalForSource(tx, {
    companyId,
    sourceKey: `INVOICE:${invoice.id}`,
    entryPrefix: "SINV",
    date: new Date(invoice.date),
    narration: `Invoice ${invoice.invoiceNo}${customer?.name ? ` - ${customer.name}` : ""}`,
    actor,
    lines: postingLines,
  });
};

export const createInvoice = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = invoiceFormSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid invoice payload", parsed.error.issues);
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, companyId, status: "ACTIVE" },
  });
  if (!customer) return fail(res, 404, "CUSTOMER_NOT_FOUND", "Customer not found");

  const { lines, ...header } = parsed.data;
  const { totals, creates } = await lineCreates(companyId, getActor(req), lines as any);
  const tax = splitGst(totals.taxTotal, false);
  const actor = getActor(req);

  const record = await prisma.$transaction(async (tx) => {
    const createdInvoice = await tx.invoice.create({
      data: {
        companyId,
        invoiceNo: makeDocumentNumber("INV"),
        date: new Date(header.invoiceDate),
        dueDate: new Date(header.dueDate),
        customerId: header.customerId,
        salespersonId: header.salespersonId,
        status: "OPEN",
        subTotal: totals.subTotal,
        discount: totals.discount,
        taxableAmount: totals.taxableAmount,
        cgst: tax.cgst,
        sgst: tax.sgst,
        igst: tax.igst,
        grandTotal: totals.grandTotal,
        paidAmount: 0,
        balanceDue: totals.grandTotal,
        notes: header.notes,
        terms: header.terms,
        goldRate22k: 0,
        goldRate18k: 0,
        goldRate24k: 0,
        createdBy: actor,
        lines: { create: creates },
      },
      include: invoiceInclude,
    });

    await syncInvoiceJournalPosting(tx, companyId, createdInvoice, actor);

    await AuditService.recordEvent(tx, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: "invoice.created",
      entityType: "Invoice",
      entityId: createdInvoice.id,
      entityNumber: createdInvoice.invoiceNo,
      entityDate: createdInvoice.date,
      amountAfter: Number(createdInvoice.grandTotal),
      after: createdInvoice as any,
    });

    return createdInvoice;
  });

  return created(res, record, "Invoice created and posted successfully");
};

export const updateInvoice = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = invoiceFormSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid invoice payload", parsed.error.issues);
  }

  const existing = await prisma.invoice.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!existing) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");
  if (existing.status === "VOID") {
    return fail(res, 400, "INVALID_STATUS", "Void invoices cannot be updated");
  }

  const { lines, ...header } = parsed.data;
  const { totals, creates } = await lineCreates(companyId, getActor(req), lines as any);
  const tax = splitGst(totals.taxTotal, false);

  const paidAmount = Number(existing.paidAmount || 0);
  const balanceDue = Math.max(0, totals.grandTotal - paidAmount);
  let status = existing.status;
  if (paidAmount >= totals.grandTotal && totals.grandTotal > 0) {
    status = "PAID";
  } else if (paidAmount > 0) {
    status = "PARTIAL";
  } else {
    status = "OPEN";
  }

  const actor = getActor(req);
  const record = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id, companyId } });
    const updatedInvoice = await tx.invoice.update({
      where: { id: existing.id },
      data: {
        date: new Date(header.invoiceDate),
        dueDate: new Date(header.dueDate),
        customerId: header.customerId,
        salespersonId: header.salespersonId,
        subTotal: totals.subTotal,
        discount: totals.discount,
        taxableAmount: totals.taxableAmount,
        cgst: tax.cgst,
        sgst: tax.sgst,
        igst: tax.igst,
        grandTotal: totals.grandTotal,
        paidAmount,
        balanceDue,
        status,
        notes: header.notes,
        terms: header.terms,
        lines: { create: creates },
      },
      include: invoiceInclude,
    });

    // Atomically replace previous journal posting with recalculation
    await syncInvoiceJournalPosting(tx, companyId, updatedInvoice, actor);

    await AuditService.recordEvent(tx, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: "invoice.updated",
      entityType: "Invoice",
      entityId: updatedInvoice.id,
      entityNumber: updatedInvoice.invoiceNo,
      entityDate: updatedInvoice.date,
      amountBefore: Number(existing.grandTotal),
      amountAfter: Number(updatedInvoice.grandTotal),
      before: existing as any,
      after: updatedInvoice as any,
      reason: req.body.reason ? String(req.body.reason) : undefined,
    });

    return updatedInvoice;
  });

  return ok(res, record, "Invoice updated and ledger synchronized");
};

export const postInvoice = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const invoice = await prisma.invoice.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");
  if (invoice.status === "DRAFT") {
    const actor = getActor(req);
    const paidAmount = Number(invoice.paidAmount || 0);
    const finalStatus = paidAmount >= Number(invoice.grandTotal) ? "PAID" : paidAmount > 0 ? "PARTIAL" : "OPEN";
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: finalStatus },
      });
      await syncInvoiceJournalPosting(tx, companyId, invoice, actor);
      return row;
    });
    return ok(res, updated, "Invoice posted");
  }
  return ok(res, invoice, "Invoice is active");
};

export const deleteInvoice = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const id = Number(req.params.id);
  const invoice = await prisma.invoice.findFirst({ where: { id, companyId } });
  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");

  if (Number(invoice.paidAmount) > 0) {
    return fail(res, 400, "PAYMENT_EXISTS", "Cannot delete an invoice with recorded payments. Void it instead.");
  }

  const actor = getActor(req);
  await prisma.$transaction(async (tx) => {
    await reversePostedJournalsForSource(tx, {
      companyId,
      sourceKey: `INVOICE:${invoice.id}`,
      actor,
      date: new Date(),
      narrationPrefix: "Invoice deleted",
    });
    await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id, companyId } });
    await tx.invoice.delete({ where: { id: invoice.id } });

    await AuditService.recordEvent(tx, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: "invoice.deleted",
      entityType: "Invoice",
      entityId: invoice.id,
      entityNumber: invoice.invoiceNo,
      entityDate: invoice.date,
      amountBefore: Number(invoice.grandTotal),
      amountAfter: 0,
      before: invoice as any,
      reason: req.body?.reason ? String(req.body.reason) : "Invoice deleted by user",
    });
  });

  return ok(res, true, "Invoice deleted");
};

export const voidInvoice = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const invoice = await prisma.invoice.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");
  if (Number(invoice.paidAmount) > 0) {
    return fail(res, 400, "PAYMENT_EXISTS", "Cannot void an invoice with recorded payments");
  }

  const actor = getActor(req);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.invoice.update({ where: { id: invoice.id }, data: { status: "VOID" } });
    await reversePostedJournalsForSource(tx, {
      companyId,
      sourceKey: `INVOICE:${invoice.id}`,
      actor,
      date: new Date(),
      narrationPrefix: "Invoice void",
    });

    await AuditService.recordEvent(tx, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: "invoice.voided",
      entityType: "Invoice",
      entityId: invoice.id,
      entityNumber: invoice.invoiceNo,
      entityDate: invoice.date,
      amountBefore: Number(invoice.grandTotal),
      amountAfter: 0,
      before: invoice as any,
      after: row as any,
      reason: req.body?.reason ? String(req.body.reason) : "Invoice voided by user",
    });

    return row;
  });

  return ok(res, updated, "Invoice voided");
};

export const duplicateInvoice = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: { lines: true },
  });
  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");

  const duplicate = await prisma.invoice.create({
    data: {
      companyId,
      invoiceNo: makeDocumentNumber("INV"),
      date: new Date(),
      dueDate: invoice.dueDate,
      customerId: invoice.customerId,
      salespersonId: invoice.salespersonId,
      status: "DRAFT",
      currency: invoice.currency,
      goldRate22k: invoice.goldRate22k,
      goldRate18k: invoice.goldRate18k,
      goldRate24k: invoice.goldRate24k,
      subTotal: invoice.subTotal,
      discount: invoice.discount,
      taxableAmount: invoice.taxableAmount,
      cgst: invoice.cgst,
      sgst: invoice.sgst,
      igst: invoice.igst,
      grandTotal: invoice.grandTotal,
      paidAmount: 0,
      balanceDue: invoice.grandTotal,
      notes: invoice.notes,
      terms: invoice.terms,
      createdBy: getActor(req),
      lines: {
        create: invoice.lines.map(({ id, invoiceId, createdAt, updatedAt, ...line }) => ({
          ...line,
          createdBy: getActor(req),
        })),
      },
    },
    include: invoiceInclude,
  });

  return created(res, duplicate, "Invoice duplicated");
};

export const recordPayment = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const invoice = await prisma.invoice.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");

  const amount = Number(req.body.amount ?? 0);
  if (amount <= 0) return fail(res, 400, "INVALID_AMOUNT", "Payment amount must be greater than zero");

  const newPaidAmount = Number(invoice.paidAmount) + amount;
  const newBalanceDue = Math.max(Number(invoice.grandTotal) - newPaidAmount, 0);

  const actor = getActor(req);
  const updated = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        companyId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        amount,
        mode: String(req.body.mode ?? "CASH"),
        reference: req.body.reference ? String(req.body.reference) : undefined,
        notes: req.body.notes ? String(req.body.notes) : undefined,
        date: req.body.date ? new Date(String(req.body.date)) : new Date(),
        type: "RECEIPT",
        createdBy: actor,
      },
    });

    const row = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newBalanceDue <= 0 ? "APPROVED" : "POSTED",
      },
      include: invoiceInclude,
    });

    const accounts = await resolveAccountingAccounts(tx, companyId, actor);
    const mode = String(req.body.mode ?? "CASH").toUpperCase();
    const cashBankAccountId = mode === "CASH" ? accounts.cashId : accounts.bankId;
    await upsertPostedJournalForSource(tx, {
      companyId,
      sourceKey: `INVOICE_PAYMENT:${payment.id}`,
      entryPrefix: "RCPT",
      date: payment.date,
      narration: `Payment against ${invoice.invoiceNo}`,
      actor,
      lines: [
        { accountId: cashBankAccountId, debit: amount, narration: `Receipt via ${mode}` },
        { accountId: accounts.receivableId, credit: amount, narration: `Receipt against ${invoice.invoiceNo}` },
      ],
    });

    const paymentAudit = await AuditService.recordEvent(tx, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: "payment.created",
      entityType: "Payment",
      entityId: payment.id,
      entityNumber: payment.reference || `REC-${payment.id}`,
      entityDate: payment.date,
      amountAfter: amount,
      after: payment as any,
      summary: `${actor} recorded payment of ₹${amount.toLocaleString("en-IN")} via ${mode} against ${invoice.invoiceNo}`,
    });

    await AuditService.recordEvent(tx, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: "invoice.updated",
      entityType: "Invoice",
      entityId: invoice.id,
      entityNumber: invoice.invoiceNo,
      entityDate: invoice.date,
      amountBefore: Number(invoice.balanceDue),
      amountAfter: newBalanceDue,
      before: { paidAmount: invoice.paidAmount, balanceDue: invoice.balanceDue, status: invoice.status },
      after: { paidAmount: newPaidAmount, balanceDue: newBalanceDue, status: row.status },
      causedByEventId: paymentAudit.id,
      summary: `Indirect edit: Invoice ${invoice.invoiceNo} balance updated by Payment #${payment.id}`,
    });

    return row;
  });

  return ok(res, updated, "Payment recorded");
};

export const getInvoicePdf = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const [invoice, company, bankAccount] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: Number(req.params.id), companyId },
      include: {
        customer: true,
        lines: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
    }),
    prisma.account.findFirst({
      where: {
        companyId,
        OR: [{ isBankAccount: true }, { type: "bank" }],
      },
      orderBy: { id: "asc" },
    }),
  ]);

  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");

  const pdfBuffer = await generateInvoicePdf({
    invoice,
    company: company || {
      name: "MANAV JEWELLERS",
      legalName: "MANAV JEWELLERS PVT. LTD.",
      gstin: "24AAAAA0000A1Z5",
      state: "Gujarat",
      city: "Ahmedabad",
      addressLine1: "101, Jewel Arcade, C.G. Road",
    },
    bankAccount,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNo}.pdf"`);
  return res.status(200).send(pdfBuffer);
};

export const sendInvoiceEmail = async (_req: Request, res: Response) =>
  ok(res, true, "Email queued");

export const getNextInvoiceNo = async (_req: Request, res: Response) =>
  ok(res, { invoiceNo: makeDocumentNumber("INV") });
