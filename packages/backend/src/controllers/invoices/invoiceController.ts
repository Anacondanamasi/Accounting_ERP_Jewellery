import type { Request, Response } from "express";
import { invoiceFormSchema } from "@jewelledger/shared";
import { created, fail, ok } from "../../lib/apiResponse";
import { computeJewelleryTotals, makeDocumentNumber, splitGst } from "../../lib/documents";
import {
  resolveAccountingAccounts,
  reversePostedJournalsForSource,
  upsertPostedJournalForSource,
} from "../../lib/accounting";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";


const invoiceInclude = {
  customer: true,
  lines: { orderBy: { createdAt: "asc" as const } },
  payments: { orderBy: { date: "desc" as const } },
};

const escapePdfText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildSimplePdf = (lines: string[]) => {
  const contentLines: string[] = ["BT", "/F1 11 Tf", "50 790 Td"];
  lines.forEach((line, index) => {
    const safe = escapePdfText(line);
    if (index === 0) {
      contentLines.push(`(${safe}) Tj`);
    } else {
      contentLines.push(`0 -16 Td (${safe}) Tj`);
    }
  });
  contentLines.push("ET");
  const stream = contentLines.join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
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
      draft: rows.filter((row) => row.status === "DRAFT").length,
      overdue: rows.filter((row) => Number(row.balanceDue) > 0 && row.dueDate < new Date()).length,
    },
  });
};

export const getInvoiceById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: invoiceInclude,
  });
  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");
  
  const mappedInvoice = {
    ...invoice,
    invoiceDate: invoice.date ? new Date(invoice.date).toISOString().slice(0, 10) : null,
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : null,
  };
  return ok(res, mappedInvoice);
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

  const record = await prisma.invoice.create({
    data: {
      companyId,
      invoiceNo: makeDocumentNumber("INV"),
      date: new Date(header.invoiceDate),
      dueDate: new Date(header.dueDate),
      customerId: header.customerId,
      salespersonId: header.salespersonId,
      status: "DRAFT",
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
      createdBy: getActor(req),
      lines: { create: creates },
    },
    include: invoiceInclude,
  });

  return created(res, record, "Invoice created");
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
  if (paidAmount >= totals.grandTotal) {
    status = "PAID";
  } else if (paidAmount > 0) {
    status = "PARTIAL";
  } else if (existing.status === "DRAFT") {
    status = "DRAFT";
  } else {
    status = "POSTED";
  }

  const record = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id, companyId } });
    return tx.invoice.update({
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
  });

  return ok(res, record, "Invoice updated");
};

export const postInvoice = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const invoice = await prisma.invoice.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");
  if (invoice.status === "VOID") return fail(res, 400, "INVALID_STATUS", "Void invoice cannot be posted");

  const actor = getActor(req);
  const paidAmount = Number(invoice.paidAmount || 0);
  const finalStatus = paidAmount >= Number(invoice.grandTotal) ? "PAID" : paidAmount > 0 ? "PARTIAL" : "POSTED";

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: finalStatus },
    });

    const accounts = await resolveAccountingAccounts(tx, companyId, actor);
    await upsertPostedJournalForSource(tx, {
      companyId,
      sourceKey: `INVOICE:${invoice.id}`,
      entryPrefix: "SINV",
      date: new Date(invoice.date),
      narration: `Invoice ${invoice.invoiceNo}`,
      actor,
      lines: [
        { accountId: accounts.receivableId, debit: Number(invoice.grandTotal), narration: `Invoice ${invoice.invoiceNo}` },
        { accountId: accounts.salesId, credit: Number(invoice.taxableAmount), narration: `Invoice ${invoice.invoiceNo}` },
        { accountId: accounts.outputGstId, credit: Number(invoice.cgst) + Number(invoice.sgst) + Number(invoice.igst), narration: `GST on ${invoice.invoiceNo}` },
      ],
    });

    return row;
  });

  return ok(res, updated, "Invoice posted");
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

    return row;
  });

  return ok(res, updated, "Payment recorded");
};

export const getInvoicePdf = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: { customer: true, lines: { orderBy: { createdAt: "asc" } } },
  });
  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");

  const dateLabel = new Date(invoice.date).toISOString().slice(0, 10);
  const pdfLines = [
    "HKS Accounting - Tax Invoice",
    `Invoice No: ${invoice.invoiceNo}`,
    `Date: ${dateLabel}`,
    `Customer: ${invoice.customer?.name ?? "-"}`,
    "----------------------------------------------",
    ...invoice.lines.slice(0, 18).map((line, idx) =>
      `${idx + 1}. ${line.description} | ${Number(line.netWt).toFixed(3)}g | ${Number(line.ratePerGram).toFixed(2)} | ${Number(line.total).toFixed(2)}`,
    ),
    "----------------------------------------------",
    `Sub Total: ${Number(invoice.subTotal).toFixed(2)}`,
    `Discount: ${Number(invoice.discount).toFixed(2)}`,
    `Taxable: ${Number(invoice.taxableAmount).toFixed(2)}`,
    `GST: ${(Number(invoice.cgst) + Number(invoice.sgst) + Number(invoice.igst)).toFixed(2)}`,
    `Grand Total: ${Number(invoice.grandTotal).toFixed(2)}`,
    `Paid: ${Number(invoice.paidAmount).toFixed(2)}`,
    `Balance: ${Number(invoice.balanceDue).toFixed(2)}`,
  ];

  const pdf = buildSimplePdf(pdfLines);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNo}.pdf"`);
  return res.status(200).send(pdf);
};

export const sendInvoiceEmail = async (_req: Request, res: Response) =>
  ok(res, true, "Email queued");

export const getNextInvoiceNo = async (_req: Request, res: Response) =>
  ok(res, { invoiceNo: makeDocumentNumber("INV") });
