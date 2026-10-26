import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import {
  resolveAccountingAccounts,
  reversePostedJournalsForSource,
  upsertPostedJournalForSource,
} from "../../lib/accounting";
import { computeJewelleryTotals, makeDocumentNumber, splitGst } from "../../lib/documents";
import { evaluatePlaceOfSupply, generateGstJournalPosting, type DocumentTaxSummary, round2 } from "../../lib/gst";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { AuditService } from "../../services/audit/auditService";

const lineSchema = z.object({
  sku: z.string().optional().nullable().default(""),
  description: z.string().min(1),
  karat: z.string().min(1),
  grossWt: z.coerce.number().nonnegative(),
  netWt: z.coerce.number().nonnegative(),
  stoneWt: z.coerce.number().nonnegative(),
  makingType: z.string().min(1),
  makingRate: z.coerce.number().nonnegative(),
  ratePerGram: z.coerce.number().nonnegative(),
  discountPct: z.coerce.number().min(0).max(100),
  gstPct: z.coerce.number().min(0).max(28),
  hsnCode: z.string().optional().default("7113"),
});

const billSchema = z.object({
  billDate: z.string().min(1),
  dueDate: z.string().min(1),
  supplierId: z.coerce.number(),
  supplierName: z.string().optional().nullable(),
  qualityCertUrl: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

const billInclude = {
  supplier: true,
  lines: { orderBy: { createdAt: "asc" as const } },
  payments: { orderBy: { date: "desc" as const } },
};

const lineCreates = async (companyId: number, userId: string, lines: z.infer<typeof lineSchema>[]) => {
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
      itemId: line.sku ? itemBySku.get(line.sku) : undefined,
      sku: line.sku || "",
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
      hsnCode: line.hsnCode || "7113",
      total: line.total,
      createdBy: userId,
    })),
  };
};

export const listBills = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  let to = req.query.to ? new Date(String(req.query.to)) : undefined;
  if (to && !String(req.query.to).includes("T")) {
    to.setHours(23, 59, 59, 999);
  }

  const search = req.query.search ? String(req.query.search) : "";
  const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;

  const dateFilter =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

  const rows = await prisma.bill.findMany({
    where: {
      companyId,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { billNo: { contains: search } },
              { supplier: { name: { contains: search } } },
            ],
          }
        : {}),
    },
    include: { supplier: true, lines: true },
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

export const getBillById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const row = await prisma.bill.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: billInclude,
  });
  if (!row) return fail(res, 404, "BILL_NOT_FOUND", "Bill not found");

  const billDate = row.date ? new Date(row.date).toISOString().slice(0, 10) : "";
  const dueDate = row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : "";

  return ok(res, {
    ...row,
    billDate,
    dueDate,
    supplierName: row.supplier?.name || "",
  });
};

export const syncBillJournalPosting = async (
  tx: any,
  companyId: number,
  bill: any,
  actor: string,
) => {
  const [company, supplier] = await Promise.all([
    tx.company.findUnique({ where: { id: companyId } }),
    bill.supplierId ? tx.supplier.findUnique({ where: { id: bill.supplierId } }) : null,
  ]);

  const posResult = evaluatePlaceOfSupply({
    supplierGstin: supplier?.gstin,
    supplierState: supplier?.city,
    recipientGstin: company?.gstin,
    recipientState: company?.state,
    placeOfSupply: company?.state,
  });

  const taxSummary: DocumentTaxSummary = {
    lines: [],
    subTotal: Number(bill.subTotal || 0),
    totalDiscount: Number(bill.discount || 0),
    taxableAmount: Number(bill.taxableAmount || 0),
    cgst: Number(bill.cgst || 0),
    sgst: Number(bill.sgst || 0),
    igst: Number(bill.igst || 0),
    cess: 0,
    taxTotal: Number(bill.cgst || 0) + Number(bill.sgst || 0) + Number(bill.igst || 0),
    roundOff: 0,
    grandTotal: Number(bill.grandTotal || 0),
    rateBreakup: [],
  };

  const accounts = await resolveAccountingAccounts(tx, companyId, actor);
  const postingLines = generateGstJournalPosting({
    documentType: "BILL",
    documentNo: bill.billNo,
    posResult,
    taxSummary,
    accounts,
    partyName: supplier?.name,
  });

  await upsertPostedJournalForSource(tx, {
    companyId,
    sourceKey: `BILL:${bill.id}`,
    entryPrefix: "PBILL",
    date: new Date(bill.date),
    narration: `Bill ${bill.billNo}${supplier?.name ? ` - ${supplier.name}` : ""}`,
    actor,
    lines: postingLines,
  });
};

export const createBill = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = billSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid bill payload", parsed.error.issues);

  const supplier = await prisma.supplier.findFirst({
    where: { id: parsed.data.supplierId, companyId, status: "ACTIVE" },
  });
  if (!supplier) return fail(res, 404, "SUPPLIER_NOT_FOUND", "Supplier not found");

  const { lines, ...header } = parsed.data;
  const { totals, creates } = await lineCreates(companyId, getActor(req), lines);
  const tax = splitGst(totals.taxTotal, false);
  const actor = getActor(req);

  const row = await prisma.$transaction(async (tx) => {
    const createdBill = await tx.bill.create({
      data: {
        companyId,
        billNo: makeDocumentNumber("BILL"),
        date: new Date(header.billDate),
        dueDate: new Date(header.dueDate),
        supplierId: header.supplierId,
        status: "OPEN",
        subTotal: totals.subTotal,
        discount: totals.discount,
        taxableAmount: totals.taxableAmount,
        taxTotal: totals.taxTotal,
        cgst: tax.cgst,
        sgst: tax.sgst,
        igst: tax.igst,
        grandTotal: totals.grandTotal,
        paidAmount: 0,
        balanceDue: totals.grandTotal,
        qualityCertUrl: header.qualityCertUrl,
        createdBy: actor,
        lines: { create: creates },
      },
      include: billInclude,
    });

    await syncBillJournalPosting(tx, companyId, createdBill, actor);

    await AuditService.recordEvent(tx, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: "bill.created",
      entityType: "Bill",
      entityId: createdBill.id,
      entityNumber: createdBill.billNo,
      entityDate: createdBill.date,
      amountAfter: Number(createdBill.grandTotal),
      after: createdBill as any,
    });

    return createdBill;
  });

  return created(res, row, "Bill created and posted successfully");
};

export const updateBill = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = billSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid bill payload", parsed.error.issues);

  const existing = await prisma.bill.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!existing) return fail(res, 404, "BILL_NOT_FOUND", "Bill not found");
  if (existing.status === "VOID") {
    return fail(res, 400, "INVALID_STATUS", "Void bills cannot be updated");
  }

  const { lines, ...header } = parsed.data;
  const { totals, creates } = await lineCreates(companyId, getActor(req), lines);
  const tax = splitGst(totals.taxTotal, false);

  const paidAmount = Number(existing.paidAmount || 0);
  const balanceDue = Math.max(0, totals.grandTotal - paidAmount);
  const nextStatus =
    paidAmount >= totals.grandTotal && totals.grandTotal > 0
      ? "PAID"
      : paidAmount > 0
      ? "PARTIAL"
      : "OPEN";

  const actor = getActor(req);
  const row = await prisma.$transaction(async (tx) => {
    await tx.billItem.deleteMany({ where: { billId: existing.id, companyId } });
    const updatedBill = await tx.bill.update({
      where: { id: existing.id },
      data: {
        date: new Date(header.billDate),
        dueDate: new Date(header.dueDate),
        supplierId: header.supplierId,
        status: nextStatus,
        subTotal: totals.subTotal,
        discount: totals.discount,
        taxableAmount: totals.taxableAmount,
        taxTotal: totals.taxTotal,
        cgst: tax.cgst,
        sgst: tax.sgst,
        igst: tax.igst,
        grandTotal: totals.grandTotal,
        balanceDue,
        qualityCertUrl: header.qualityCertUrl,
        lines: { create: creates },
      },
      include: billInclude,
    });

    // Atomically replace previous journal posting
    await syncBillJournalPosting(tx, companyId, updatedBill, actor);

    await AuditService.recordEvent(tx, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: "bill.updated",
      entityType: "Bill",
      entityId: updatedBill.id,
      entityNumber: updatedBill.billNo,
      entityDate: updatedBill.date,
      amountBefore: Number(existing.grandTotal),
      amountAfter: Number(updatedBill.grandTotal),
      before: existing as any,
      after: updatedBill as any,
      reason: req.body?.reason ? String(req.body.reason) : undefined,
    });

    return updatedBill;
  });

  return ok(res, row, "Bill updated and ledger synchronized");
};

export const postBill = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const bill = await prisma.bill.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!bill) return fail(res, 404, "BILL_NOT_FOUND", "Bill not found");
  if (bill.status === "DRAFT") {
    const actor = getActor(req);
    const paidAmount = Number(bill.paidAmount || 0);
    const grandTotal = Number(bill.grandTotal || 0);
    const nextStatus = paidAmount >= grandTotal && grandTotal > 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "OPEN";

    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.bill.update({ where: { id: bill.id }, data: { status: nextStatus } });
      await syncBillJournalPosting(tx, companyId, bill, actor);
      return updated;
    });
    return ok(res, row, "Bill posted");
  }
  return ok(res, bill, "Bill is active");
};

export const deleteBill = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const id = Number(req.params.id);
  const bill = await prisma.bill.findFirst({ where: { id, companyId } });
  if (!bill) return fail(res, 404, "BILL_NOT_FOUND", "Bill not found");

  if (Number(bill.paidAmount) > 0) {
    return fail(res, 400, "PAYMENT_EXISTS", "Cannot delete a bill with recorded payments. Void it instead.");
  }

  const actor = getActor(req);
  await prisma.$transaction(async (tx) => {
    await reversePostedJournalsForSource(tx, {
      companyId,
      sourceKey: `BILL:${bill.id}`,
      actor,
      date: new Date(),
      narrationPrefix: "Bill deleted",
    });
    await tx.billItem.deleteMany({ where: { billId: bill.id, companyId } });
    await tx.bill.delete({ where: { id: bill.id } });

    await AuditService.recordEvent(tx, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: "bill.deleted",
      entityType: "Bill",
      entityId: bill.id,
      entityNumber: bill.billNo,
      entityDate: bill.date,
      amountBefore: Number(bill.grandTotal),
      amountAfter: 0,
      before: bill as any,
      reason: req.body?.reason ? String(req.body.reason) : "Bill deleted by user",
    });
  });

  return ok(res, true, "Bill deleted");
};

export const voidBill = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const bill = await prisma.bill.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!bill) return fail(res, 404, "BILL_NOT_FOUND", "Bill not found");
  if (Number(bill.paidAmount) > 0) {
    return fail(res, 400, "PAYMENT_EXISTS", "Cannot void a bill with recorded payments");
  }

  const actor = getActor(req);
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.bill.update({ where: { id: bill.id }, data: { status: "VOID" } });
    await reversePostedJournalsForSource(tx, {
      companyId,
      sourceKey: `BILL:${bill.id}`,
      actor,
      date: new Date(),
      narrationPrefix: "Bill void",
    });
    return updated;
  });

  return ok(res, row, "Bill voided");
};

export const duplicateBill = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const row = await prisma.bill.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: { lines: true },
  });
  if (!row) return fail(res, 404, "BILL_NOT_FOUND", "Bill not found");

  const duplicate = await prisma.bill.create({
    data: {
      companyId,
      billNo: makeDocumentNumber("BILL"),
      date: new Date(),
      dueDate: row.dueDate,
      supplierId: row.supplierId,
      status: "DRAFT",
      qualityCertUrl: row.qualityCertUrl,
      subTotal: row.subTotal,
      discount: row.discount,
      taxableAmount: row.taxableAmount,
      taxTotal: row.taxTotal,
      cgst: row.cgst,
      sgst: row.sgst,
      igst: row.igst,
      grandTotal: row.grandTotal,
      paidAmount: 0,
      balanceDue: row.grandTotal,
      createdBy: getActor(req),
      lines: {
        create: row.lines.map(({ id, billId, createdAt, updatedAt, createdBy, ...line }) => ({
          ...line,
          createdBy: getActor(req),
        })),
      },
    },
    include: billInclude,
  });

  return created(res, duplicate, "Bill duplicated");
};

export const recordBillPayment = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const row = await prisma.bill.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!row) return fail(res, 404, "BILL_NOT_FOUND", "Bill not found");

  const amount = Number(req.body.amount ?? 0);
  if (amount <= 0) return fail(res, 400, "INVALID_AMOUNT", "Payment amount must be greater than zero");

  const newPaidAmount = Number(row.paidAmount) + amount;
  const newBalanceDue = Math.max(Number(row.grandTotal) - newPaidAmount, 0);

  const actor = getActor(req);
  const updated = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        companyId,
        supplierId: row.supplierId,
        billId: row.id,
        amount,
        mode: String(req.body.mode ?? "BANK_TRANSFER"),
        reference: req.body.reference ? String(req.body.reference) : undefined,
        date: req.body.date ? new Date(String(req.body.date)) : new Date(),
        type: "PAYMENT",
        createdBy: actor,
      },
    });

    const updatedBill = await tx.bill.update({
      where: { id: row.id },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newBalanceDue <= 0 ? "PAID" : "PARTIAL",
      },
      include: billInclude,
    });

    const accounts = await resolveAccountingAccounts(tx, companyId, actor);
    const mode = String(req.body.mode ?? "BANK_TRANSFER").toUpperCase();
    const cashBankAccountId = mode === "CASH" ? accounts.cashId : accounts.bankId;
    await upsertPostedJournalForSource(tx, {
      companyId,
      sourceKey: `BILL_PAYMENT:${payment.id}`,
      entryPrefix: "PAY",
      date: payment.date,
      narration: `Payment against ${row.billNo}`,
      actor,
      lines: [
        { accountId: accounts.payableId, debit: amount, narration: `Payment against ${row.billNo}` },
        { accountId: cashBankAccountId, credit: amount, narration: `Paid via ${mode}` },
      ],
    });

    return updatedBill;
  });

  return ok(res, updated, "Bill payment recorded");
};

export const getNextBillNo = async (_req: Request, res: Response) =>
  ok(res, { billNo: makeDocumentNumber("BILL") });
