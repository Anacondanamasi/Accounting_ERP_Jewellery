import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { upsertPostedJournalForSource, resolveAccountingAccounts } from "../../lib/accounting";
import { evaluatePlaceOfSupply, computeDocumentTax, generateGstJournalPosting } from "../../lib/gst";

const directExpenseSchema = z.object({
  date: z.coerce.date(),
  paymentMethodLedgerId: z.coerce.number().positive(), // Cash/Bank Account ID
  expenseLedgerId: z.coerce.number().positive(),       // Expense Account ID
  amount: z.coerce.number().positive(),
  supplierId: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || val === 0 ? null : Number(val)),
    z.number().positive().nullable().optional()
  ),
  narration: z.string().optional().or(z.literal("")),
});

export const listExpenses = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const dateFilter = from && to ? { gte: from, lte: to } : from ? { gte: from } : to ? { lte: to } : undefined;

  const expenses = await prisma.payment.findMany({
    where: {
      companyId,
      type: "EXPENSE",
      billId: null,
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  // Enrich each expense with journal account names
  const enriched = await Promise.all(
    expenses.map(async (exp) => {
      const journal = await prisma.journalEntry.findFirst({
        where: { companyId, type: `PAYMENT:${exp.id}`, status: "POSTED" },
        include: { lines: true },
      });

      let expenseLine = null;
      let paymentLine = null;

      if (journal) {
        const linesWithAccounts = await Promise.all(
          journal.lines.map(async (line) => {
            const account = await prisma.account.findUnique({
              where: { id: line.accountId },
              select: { id: true, name: true, type: true },
            });
            return { ...line, account };
          })
        );

        expenseLine = linesWithAccounts.find(
          (l) => l.account?.type.toLowerCase() === "expense"
        );
        paymentLine = linesWithAccounts.find(
          (l) => l.account?.type.toLowerCase() !== "expense"
        );
      }

      return {
        id: exp.id,
        date: exp.date,
        reference: exp.reference,
        amount: Number(exp.amount),
        narration: exp.notes,
        mode: exp.mode,
        supplierName: exp.supplier?.name ?? null,
        expenseAccount: expenseLine?.account?.name ?? "—",
        paymentAccount: paymentLine?.account?.name ?? exp.mode,
        journalEntryNo: journal?.entryNo ?? null,
      };
    })
  );

  return ok(res, enriched);
};

export const createDirectExpense = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  const parsed = directExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid expense payload", parsed.error.issues);
  }

  const { date, paymentMethodLedgerId, expenseLedgerId, amount, supplierId, narration } = parsed.data;

  // Validate accounts exist and belong to this company
  const [paymentAccount, expenseAccount] = await Promise.all([
    prisma.account.findFirst({ where: { id: paymentMethodLedgerId, companyId } }),
    prisma.account.findFirst({ where: { id: expenseLedgerId, companyId } }),
  ]);

  if (!paymentAccount) return fail(res, 400, "INVALID_ACCOUNT", "Payment method account not found");
  if (!expenseAccount) return fail(res, 400, "INVALID_ACCOUNT", "Expense account not found");

  // Create payment record + journal entry in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Persist a Payment record (type=EXPENSE) for tracking and supplier ledger history
    const payment = await tx.payment.create({
      data: {
        companyId,
        supplierId: supplierId ?? null,
        type: "EXPENSE",
        date,
        mode: paymentAccount.name,
        amount,
        notes: narration || `Direct Expense: ${expenseAccount.name}`,
        reference: `EXP-${Date.now()}`,
        createdBy: actor,
      },
    });

    // 2. Post a balanced journal entry:
    //    Dr  Expense Account        (debit increases expense)
    //    Cr  Cash / Bank Account    (credit decreases asset)
    await upsertPostedJournalForSource(tx, {
      companyId,
      sourceKey: `PAYMENT:${payment.id}`,
      entryPrefix: "EXP",
      date,
      narration: narration || `Direct Expense: ${expenseAccount.name}`,
      actor,
      lines: [
        {
          accountId: expenseLedgerId,
          debit: amount,
          credit: 0,
          narration: narration || `Direct Expense: ${expenseAccount.name}`,
        },
        {
          accountId: paymentMethodLedgerId,
          debit: 0,
          credit: amount,
          narration: `Paid via: ${paymentAccount.name}`,
        },
      ],
      forceReplace: true,
    });

    return payment;
  });

  return created(res, result, "Direct expense recorded successfully");
};

export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const expenseId = Number(req.params.id);

    const exp = await prisma.payment.findFirst({
      where: { id: expenseId, companyId, type: "EXPENSE" },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
      },
    });

    if (!exp) return fail(res, 404, "EXPENSE_NOT_FOUND", "Expense not found");

    const journal = await prisma.journalEntry.findFirst({
      where: { companyId, type: `PAYMENT:${exp.id}`, status: "POSTED" },
      include: { lines: true },
    });

    let expenseLedgerId: number | null = null;
    let paymentMethodLedgerId: number | null = null;

    if (journal) {
      const linesWithAccounts = await Promise.all(
        journal.lines.map(async (line) => {
          const account = await prisma.account.findUnique({
            where: { id: line.accountId },
            select: { id: true, name: true, type: true },
          });
          return { ...line, account };
        }),
      );

      const expLine = linesWithAccounts.find(
        (l) => l.account?.type.toLowerCase() === "expense" || l.debit > 0,
      );
      const pmtLine = linesWithAccounts.find(
        (l) => l.account?.type.toLowerCase() !== "expense" || l.credit > 0,
      );

      if (expLine) expenseLedgerId = expLine.accountId;
      if (pmtLine) paymentMethodLedgerId = pmtLine.accountId;
    }

    return ok(res, {
      id: exp.id,
      date: exp.date,
      amount: Number(exp.amount),
      supplierId: exp.supplierId,
      narration: exp.notes,
      paymentMethodLedgerId,
      expenseLedgerId,
      supplier: exp.supplier,
    });
  } catch (err: any) {
    return fail(res, 500, "GET_EXPENSE_ERROR", err?.message || "Failed to get expense");
  }
};

export const updateDirectExpense = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const expenseId = Number(req.params.id);

    const parsed = directExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid expense payload", parsed.error.issues);
    }

    const { date, paymentMethodLedgerId, expenseLedgerId, amount, supplierId, narration } = parsed.data;

    const existing = await prisma.payment.findFirst({
      where: { id: expenseId, companyId, type: "EXPENSE" },
    });
    if (!existing) return fail(res, 404, "EXPENSE_NOT_FOUND", "Expense not found");

    const [paymentAccount, expenseAccount] = await Promise.all([
      prisma.account.findFirst({ where: { id: paymentMethodLedgerId, companyId } }),
      prisma.account.findFirst({ where: { id: expenseLedgerId, companyId } }),
    ]);

    if (!paymentAccount) return fail(res, 400, "INVALID_ACCOUNT", "Payment method account not found");
    if (!expenseAccount) return fail(res, 400, "INVALID_ACCOUNT", "Expense account not found");

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: expenseId },
        data: {
          supplierId: supplierId ?? null,
          date,
          mode: paymentAccount.name,
          amount,
          notes: narration || `Direct Expense: ${expenseAccount.name}`,
        },
      });

      await upsertPostedJournalForSource(tx, {
        companyId,
        sourceKey: `PAYMENT:${updated.id}`,
        entryPrefix: "EXP",
        date,
        narration: narration || `Direct Expense: ${expenseAccount.name}`,
        actor,
        lines: [
          {
            accountId: expenseLedgerId,
            debit: amount,
            credit: 0,
            narration: narration || `Direct Expense: ${expenseAccount.name}`,
          },
          {
            accountId: paymentMethodLedgerId,
            debit: 0,
            credit: amount,
            narration: `Paid via: ${paymentAccount.name}`,
          },
        ],
        forceReplace: true,
      });

      return updated;
    });

    return ok(res, result, "Expense updated successfully");
  } catch (err: any) {
    return fail(res, 500, "UPDATE_EXPENSE_ERROR", err?.message || "Failed to update expense");
  }
};

export const deleteDirectExpense = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const expenseId = Number(req.params.id);

    const existing = await prisma.payment.findFirst({
      where: { id: expenseId, companyId, type: "EXPENSE" },
    });
    if (!existing) return fail(res, 404, "EXPENSE_NOT_FOUND", "Expense not found");

    await prisma.$transaction(async (tx) => {
      // 1. Delete journal lines and entry
      const jes = await tx.journalEntry.findMany({
        where: { companyId, type: `PAYMENT:${expenseId}` },
        select: { id: true },
      });
      if (jes.length > 0) {
        const jeIds = jes.map((j) => j.id);
        await tx.journalLine.deleteMany({ where: { entryId: { in: jeIds }, companyId } });
        await tx.journalEntry.deleteMany({ where: { id: { in: jeIds }, companyId } });
      }

      // 2. Delete payment
      await tx.payment.delete({ where: { id: expenseId } });
    });

    return ok(res, { id: expenseId }, "Expense deleted successfully");
  } catch (err: any) {
    console.error("Error deleting direct expense:", err);
    return fail(res, 500, "DELETE_EXPENSE_ERROR", err?.message || "Failed to delete expense");
  }
};
