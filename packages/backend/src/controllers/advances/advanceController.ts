import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { resolveAccountingAccounts, upsertPostedJournalForSource } from "../../lib/accounting";
import { prisma } from "../../lib/prisma";

const advanceSchema = z.object({
  customerId: z.coerce.number(),
  accountId: z.coerce.number(),
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
  mode: z.enum(["CASH", "CARD", "UPI", "CHEQUE", "BANK_TRANSFER"]),
  reference: z.string().optional(),
});

const applySchema = z.object({
  invoiceId: z.coerce.number(),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
});

const company = (req: Request) => {
  const value = req.auth?.companyId;
  return value === null || value === undefined ? null : Number(value);
};

export const listAdvances = async (req: Request, res: Response) => {
  const companyId = company(req);
  if (!companyId) return fail(res, 401, "UNAUTHORIZED", "Missing company context");
  
  const rows = await prisma.payment.findMany({
    where: { companyId, invoiceId: null, type: "ADVANCE_RECEIPT" },
    orderBy: { date: "desc" },
  });
  
  return ok(res, rows);
};

export const createAdvance = async (req: Request, res: Response) => {
  const companyId = company(req);
  if (!companyId) return fail(res, 401, "UNAUTHORIZED", "Missing company context");
  
  const parsed = advanceSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid advance payload", parsed.error.issues);
  
  const actor = req.auth?.userId || "system";
  const row = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        companyId,
        customerId: parsed.data.customerId,
        invoiceId: null,
        type: "ADVANCE_RECEIPT",
        date: new Date(parsed.data.date),
        amount: parsed.data.amount,
        mode: parsed.data.mode,
        reference: parsed.data.reference,
        createdBy: actor,
      }
    });

    const accounts = await resolveAccountingAccounts(tx, companyId, actor);
    const cashBankAccountId = parsed.data.accountId;
    await upsertPostedJournalForSource(tx, {
      companyId,
      sourceKey: `ADVANCE:${payment.id}`,
      entryPrefix: "ADV",
      date: payment.date,
      narration: `Advance receipt ${payment.reference ?? payment.id}`,
      actor,
      lines: [
        { accountId: cashBankAccountId, debit: Number(payment.amount), narration: `Advance received via ${payment.mode}` },
        { accountId: accounts.customerAdvanceId, credit: Number(payment.amount), narration: "Customer advance liability" },
      ],
    });

    return payment;
  });
  
  return created(res, row, "Advance receipt created");
};

export const applyAdvance = async (req: Request, res: Response) => {
  const companyId = company(req);
  if (!companyId) return fail(res, 401, "UNAUTHORIZED", "Missing company context");
  
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid apply payload", parsed.error.issues);

  const advance = await prisma.payment.findFirst({
    where: { id: Number(req.params.id), companyId, invoiceId: null, type: "ADVANCE_RECEIPT" }
  });
  if (!advance) return fail(res, 404, "ADVANCE_NOT_FOUND", "Advance receipt not found");

  const invoice = await prisma.invoice.findFirst({
    where: { id: parsed.data.invoiceId, companyId }
  });
  if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");

  const actor = req.auth?.userId || "system";
  const { updatedAdvance, updatedInvoice } = await prisma.$transaction(async (tx) => {
    const adjustment = await tx.payment.create({
      data: {
        companyId,
        customerId: advance.customerId,
        invoiceId: invoice.id,
        type: "ADVANCE_ADJUSTMENT",
        date: new Date(parsed.data.date),
        amount: parsed.data.amount,
        mode: "ADVANCE_ADJUSTMENT",
        reference: `Adj against ${advance.id}`,
        createdBy: actor,
      }
    });

    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: { increment: parsed.data.amount },
        balanceDue: { decrement: parsed.data.amount },
        status: Number(invoice.balanceDue) - parsed.data.amount <= 0 ? "APPROVED" : "POSTED",
      }
    });

    const accounts = await resolveAccountingAccounts(tx, companyId, actor);
    await upsertPostedJournalForSource(tx, {
      companyId,
      sourceKey: `ADVANCE_ADJUSTMENT:${adjustment.id}`,
      entryPrefix: "ADJ",
      date: adjustment.date,
      narration: `Advance adjusted against invoice ${invoice.invoiceNo}`,
      actor,
      lines: [
        { accountId: accounts.customerAdvanceId, debit: Number(adjustment.amount), narration: "Advance adjustment" },
        { accountId: accounts.receivableId, credit: Number(adjustment.amount), narration: `Against ${invoice.invoiceNo}` },
      ],
    });

    return { updatedAdvance: adjustment, updatedInvoice: updated };
  });

  return ok(res, { advance: updatedAdvance, invoice: updatedInvoice }, "Advance applied to invoice");
};
