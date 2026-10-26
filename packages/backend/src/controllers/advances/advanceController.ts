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
  notes: z.string().optional(),
  invoiceId: z.coerce.number().optional().nullable(),
});

const applySchema = z.object({
  invoiceId: z.coerce.number(),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
});

const company = (req: Request) => {
  const value = req.auth?.companyId ?? req.companyContext?.company?.id ?? req.header("x-company-id");
  return value === null || value === undefined ? null : Number(value);
};

export const listAdvances = async (req: Request, res: Response) => {
  try {
    const companyId = company(req);
    if (!companyId) return fail(res, 401, "UNAUTHORIZED", "Missing company context");

    const fromDate = req.query.from ? new Date(String(req.query.from)) : undefined;
    let toDate = req.query.to ? new Date(String(req.query.to)) : undefined;
    if (toDate && !String(req.query.to).includes("T")) {
      toDate.setHours(23, 59, 59, 999);
    }

    const dateFilter =
      fromDate && toDate
        ? { gte: fromDate, lte: toDate }
        : fromDate
        ? { gte: fromDate }
        : toDate
        ? { lte: toDate }
        : undefined;

    const typeParam = req.query.type ? String(req.query.type) : undefined;
    const typeFilter =
      typeParam === "ALL"
        ? undefined
        : typeParam
        ? typeParam
        : { in: ["ADVANCE_RECEIPT", "RECEIPT"] };

    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const mode = req.query.mode ? String(req.query.mode) : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;

    const rows = await prisma.payment.findMany({
      where: {
        companyId,
        ...(typeFilter ? (typeof typeFilter === "string" ? { type: typeFilter } : { type: typeFilter }) : {}),
        ...(customerId ? { customerId } : {}),
        ...(mode ? { mode } : {}),
        ...(dateFilter ? { date: dateFilter } : {}),
        ...(search
          ? {
              OR: [
                { reference: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                { customer: { name: { contains: search, mode: "insensitive" } } },
                { invoice: { invoiceNo: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        customer: { select: { id: true, name: true, code: true, mobile: true } },
        invoice: { select: { id: true, invoiceNo: true, grandTotal: true, balanceDue: true } },
      },
      orderBy: { date: "desc" },
    });

    // Fetch debit accounts from journal entries to display actual Bank/Cash account used
    const sourceKeys: string[] = [];
    rows.forEach((r) => {
      sourceKeys.push(`ADVANCE:${r.id}`);
      sourceKeys.push(`PAYMENT:${r.id}`);
      sourceKeys.push(`RECEIPT:${r.id}`);
    });

    const journalEntries =
      sourceKeys.length > 0
        ? await prisma.journalEntry.findMany({
            where: { companyId, type: { in: sourceKeys } },
            include: {
              lines: {
                where: { debit: { gt: 0 } },
              },
            },
          })
        : [];

    const accountIds = Array.from(
      new Set(journalEntries.flatMap((je) => je.lines.map((l) => l.accountId))),
    );
    const accounts =
      accountIds.length > 0
        ? await prisma.account.findMany({
            where: { id: { in: accountIds } },
            select: { id: true, code: true, name: true, group: true },
          })
        : [];
    const accountsById = new Map<number, { id: number; code: string; name: string; group: string }>(
      accounts.map((a) => [a.id, a]),
    );

    const accountBySourceKey = new Map<string, { id: number; code: string; name: string; group: string }>();
    for (const je of journalEntries) {
      if (je.type && je.lines[0]?.accountId) {
        const acc = accountsById.get(je.lines[0].accountId);
        if (acc) {
          accountBySourceKey.set(je.type, acc);
        }
      }
    }

    // Calculate adjusted amounts for advances
    const advanceIds = rows.filter((r) => r.type === "ADVANCE_RECEIPT").map((r) => r.id);
    const adjustments =
      advanceIds.length > 0
        ? await prisma.payment.findMany({
            where: {
              companyId,
              type: "ADVANCE_ADJUSTMENT",
              reference: { in: advanceIds.map((id) => `Adj against ${id}`) },
            },
            select: { reference: true, amount: true },
          })
        : [];

    const adjustedMap = new Map<number, number>();
    for (const adj of adjustments) {
      const match = /Adj against (\d+)/.exec(adj.reference || "");
      if (match) {
        const advId = Number(match[1]);
        adjustedMap.set(advId, (adjustedMap.get(advId) || 0) + Number(adj.amount));
      }
    }

    const enriched = rows.map((r) => {
      const depositAccount =
        accountBySourceKey.get(`ADVANCE:${r.id}`) ||
        accountBySourceKey.get(`PAYMENT:${r.id}`) ||
        accountBySourceKey.get(`RECEIPT:${r.id}`) ||
        null;

      const adjustedAmount = adjustedMap.get(r.id) || 0;
      const unallocatedAmount =
        r.type === "ADVANCE_RECEIPT" ? Math.max(0, Number(r.amount) - adjustedAmount) : 0;

      return {
        ...r,
        depositAccount,
        adjustedAmount,
        unallocatedAmount,
      };
    });

    return ok(res, enriched);
  } catch (error: any) {
    console.error("Error in listAdvances:", error);
    return fail(res, 500, "LIST_ADVANCES_ERROR", error?.message || "Failed to list payment receipts");
  }
};

export const createAdvance = async (req: Request, res: Response) => {
  try {
    const companyId = company(req);
    if (!companyId) return fail(res, 401, "UNAUTHORIZED", "Missing company context");

    const parsed = advanceSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid advance payload", parsed.error.issues);

    const actor = String(req.auth?.userId || "system");
    const row = await prisma.$transaction(async (tx) => {
      const accounts = await resolveAccountingAccounts(tx, companyId, actor);
      const cashBankAccountId = parsed.data.accountId;

      if (parsed.data.invoiceId) {
        // Direct receipt against an invoice
        const invoice = await tx.invoice.findFirst({
          where: { id: parsed.data.invoiceId, companyId },
        });
        if (!invoice) throw new Error("Selected invoice was not found");

        const payment = await tx.payment.create({
          data: {
            companyId,
            customerId: parsed.data.customerId,
            invoiceId: invoice.id,
            type: "RECEIPT",
            date: new Date(parsed.data.date),
            amount: parsed.data.amount,
            mode: parsed.data.mode,
            reference: parsed.data.reference,
            notes: parsed.data.notes,
            createdBy: actor,
          },
        });

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: { increment: parsed.data.amount },
            balanceDue: { decrement: parsed.data.amount },
            status: Number(invoice.balanceDue) - parsed.data.amount <= 0 ? "PAID" : "PARTIAL",
          },
        });

        await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey: `PAYMENT:${payment.id}`,
          entryPrefix: "RCPT",
          date: payment.date,
          narration: `Payment received against invoice ${invoice.invoiceNo} via ${payment.mode}`,
          actor,
          lines: [
            { accountId: cashBankAccountId, debit: Number(payment.amount), narration: `Receipt via ${payment.mode}` },
            { accountId: accounts.receivableId, credit: Number(payment.amount), narration: `Payment for ${invoice.invoiceNo}` },
          ],
        });

        return payment;
      } else {
        // Standalone advance receipt
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
            notes: parsed.data.notes,
            createdBy: actor,
          },
        });

        await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey: `ADVANCE:${payment.id}`,
          entryPrefix: "ADV",
          date: payment.date,
          narration: `Advance receipt ${payment.reference ?? payment.id} via ${payment.mode}`,
          actor,
          lines: [
            { accountId: cashBankAccountId, debit: Number(payment.amount), narration: `Advance received via ${payment.mode}` },
            { accountId: accounts.customerAdvanceId, credit: Number(payment.amount), narration: "Customer advance liability" },
          ],
        });

        return payment;
      }
    });

    return created(res, row, "Payment receipt created successfully");
  } catch (error: any) {
    console.error("Error in createAdvance:", error);
    return fail(res, 500, "CREATE_ADVANCE_ERROR", error?.message || "Failed to create payment receipt");
  }
};

export const applyAdvance = async (req: Request, res: Response) => {
  try {
    const companyId = company(req);
    if (!companyId) return fail(res, 401, "UNAUTHORIZED", "Missing company context");

    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid apply payload", parsed.error.issues);

    const advance = await prisma.payment.findFirst({
      where: { id: Number(req.params.id), companyId, invoiceId: null, type: "ADVANCE_RECEIPT" },
    });
    if (!advance) return fail(res, 404, "ADVANCE_NOT_FOUND", "Advance receipt not found");

    const invoice = await prisma.invoice.findFirst({
      where: { id: parsed.data.invoiceId, companyId },
    });
    if (!invoice) return fail(res, 404, "INVOICE_NOT_FOUND", "Invoice not found");

    const actor = String(req.auth?.userId || "system");
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
        },
      });

      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: { increment: parsed.data.amount },
          balanceDue: { decrement: parsed.data.amount },
          status: Number(invoice.balanceDue) - parsed.data.amount <= 0 ? "PAID" : "PARTIAL",
        },
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
  } catch (error: any) {
    console.error("Error in applyAdvance:", error);
    return fail(res, 500, "APPLY_ADVANCE_ERROR", error?.message || "Failed to apply advance to invoice");
  }
};
