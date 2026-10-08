import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { resolveAccountingAccounts, upsertPostedJournalForSource } from "../../lib/accounting";

const bankAccountSchema = z.object({
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNo: z.string().min(4).optional(),
  accountNoMasked: z.string().min(4),
  ifsc: z.string().min(4),
  accountType: z.enum(["CURRENT", "SAVINGS", "CASH_CREDIT"]),
  bookBalance: z.coerce.number(),
  bankBalance: z.coerce.number(),
  accountId: z.coerce.number().min(1, "Chart of Account mapping is required"),
});

const manualTxnSchema = z.object({
  date: z.string().min(1),
  narration: z.string().min(1),
  reference: z.string().optional(),
  debit: z.coerce.number().nonnegative(),
  credit: z.coerce.number().nonnegative(),
});

export const listBankAccounts = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const accounts = await prisma.bankAccount.findMany({
    where: { companyId },
    orderBy: { bankName: "asc" },
  });
  
  return ok(res, accounts);
};

export const getBankAccountById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const row = await prisma.bankAccount.findFirst({
    where: { id: Number(req.params.id), companyId },
  });
  if (!row) return fail(res, 404, "BANK_ACCOUNT_NOT_FOUND", "Bank account not found");
  
  return ok(res, row);
};

export const createBankAccount = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = bankAccountSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid bank account payload", parsed.error.issues);
  
  const row = await prisma.bankAccount.create({
    data: {
      companyId,
      bankName: parsed.data.bankName,
      accountName: parsed.data.accountName,
      accountNo: parsed.data.accountNo ?? parsed.data.accountNoMasked,
      accountNoMasked: parsed.data.accountNoMasked,
      ifsc: parsed.data.ifsc,
      accountType: parsed.data.accountType,
      openingBalance: parsed.data.bookBalance,
      currentBalance: parsed.data.bookBalance,
      bookBalance: parsed.data.bookBalance,
      bankBalance: parsed.data.bankBalance,
      accountId: parsed.data.accountId,
      createdBy: getActor(req),
    }
  });

  if (parsed.data.accountId) {
    await prisma.account.update({
      where: { id: parsed.data.accountId },
      data: { openingBalance: parsed.data.bookBalance }
    });
  }

  return created(res, row, "Bank account created");
};

export const updateBankAccount = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = bankAccountSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid bank account payload", parsed.error.issues);
  
  try {
    const row = await prisma.bankAccount.update({
      where: { id: Number(req.params.id), companyId },
      data: parsed.data,
    });
    return ok(res, row, "Bank account updated");
  } catch {
    return fail(res, 404, "BANK_ACCOUNT_NOT_FOUND", "Bank account not found");
  }
};

export const listBankTransactions = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const accountId = Number(req.params.id);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const reconciled = req.query.reconciled === "true" ? true : req.query.reconciled === "false" ? false : undefined;

  const rows = await prisma.bankTransaction.findMany({
    where: {
      companyId,
      bankAccountId: accountId,
      ...(from || to ? { date: { gte: from, lte: to } } : {}),
      ...(reconciled !== undefined ? { isReconciled: reconciled } : {}),
    },
    orderBy: { date: "desc" },
  });
  
  return ok(res, rows);
};

export const createBankTransaction = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = manualTxnSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid transaction payload", parsed.error.issues);

  const bankAccountId = Number(req.params.id);
  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, companyId }
  });
  if (!account) return fail(res, 404, "BANK_ACCOUNT_NOT_FOUND", "Bank account not found");

  const newBalance = Number(account.bookBalance) + parsed.data.credit - parsed.data.debit;

  const row = await prisma.$transaction(async (tx) => {
    const bankTransaction = await tx.bankTransaction.create({
      data: {
        companyId,
        bankAccountId,
        date: new Date(parsed.data.date),
        narration: parsed.data.narration,
        reference: parsed.data.reference,
        debit: parsed.data.debit,
        credit: parsed.data.credit,
        balance: newBalance,
        source: "BOOKS_MANUAL",
        isReconciled: false,
        createdBy: getActor(req),
      },
    });

    await tx.bankAccount.update({
      where: { id: bankAccountId },
      data: { 
        bookBalance: newBalance,
        unreconciledCount: { increment: 1 }
      }
    });

    if (account.accountId) {
      const accounts = await resolveAccountingAccounts(tx, companyId, getActor(req));
      const isDeposit = parsed.data.credit > 0;
      const amt = isDeposit ? parsed.data.credit : parsed.data.debit;
      
      const lines = isDeposit
        ? [
            { accountId: account.accountId, debit: amt, narration: parsed.data.narration },
            { accountId: accounts.cashId, credit: amt, narration: "Uncategorized Deposit" }, 
          ]
        : [
            { accountId: accounts.cashId, debit: amt, narration: "Uncategorized Withdrawal" },
            { accountId: account.accountId, credit: amt, narration: parsed.data.narration },
          ];

      await upsertPostedJournalForSource(tx, {
        companyId,
        sourceKey: `BANK_MANUAL:${bankTransaction.id}`,
        entryPrefix: "BNK",
        date: new Date(parsed.data.date),
        narration: parsed.data.narration,
        actor: getActor(req),
        lines,
      });
    }

    return bankTransaction;
  });

  return created(res, row, "Transaction created");
};

export const importBankStatement = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const account = await prisma.bankAccount.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!account) return fail(res, 404, "BANK_ACCOUNT_NOT_FOUND", "Bank account not found");

  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const batchId = `bank-import-${Date.now()}`;
  let importedRows = 0;
  let duplicatesSkipped = 0;
  let balance = Number(account.bankBalance);

  for (const source of rows) {
    const parsed = manualTxnSchema.safeParse(source);
    if (!parsed.success) continue;
    const duplicate = parsed.data.reference
      ? await prisma.bankTransaction.findFirst({
          where: { companyId, bankAccountId: account.id, reference: parsed.data.reference },
        })
      : null;
    if (duplicate) {
      duplicatesSkipped += 1;
      continue;
    }
    balance = balance + parsed.data.credit - parsed.data.debit;
    await prisma.bankTransaction.create({
      data: {
        companyId,
        bankAccountId: account.id,
        date: new Date(parsed.data.date),
        narration: parsed.data.narration,
        reference: parsed.data.reference,
        debit: parsed.data.debit,
        credit: parsed.data.credit,
        balance,
        source: "BANK_STATEMENT",
        importBatchId: batchId,
        createdBy: getActor(req),
      },
    });
    importedRows += 1;
  }

  await prisma.bankAccount.update({
    where: { id: account.id },
    data: { bankBalance: balance, unreconciledCount: { increment: importedRows } },
  });

  return ok(res, { importedRows, duplicatesSkipped, batchId }, "Statement imported");
};

export const getReconciliationData = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const account = await prisma.bankAccount.findFirst({
    where: { id: Number(req.params.id), companyId }
  });
  if (!account) return fail(res, 404, "BANK_ACCOUNT_NOT_FOUND", "Bank account not found");

  const transactions = await prisma.bankTransaction.findMany({
    where: { bankAccountId: account.id, companyId },
    orderBy: { date: "desc" }
  });

  return ok(res, {
    summary: {
      month: Number(req.query.month ?? new Date().getMonth() + 1),
      year: Number(req.query.year ?? new Date().getFullYear()),
      balancePerBank: Number(account.bankBalance),
      depositsInTransit: 0,
      outstandingCheques: 0,
      adjustedBankBalance: Number(account.bankBalance),
      balancePerBooks: Number(account.bookBalance),
      difference: Number(account.bankBalance) - Number(account.bookBalance),
      status:
        Number(account.bankBalance) === Number(account.bookBalance)
          ? "RECONCILED"
          : transactions.some((txn) => txn.isReconciled)
            ? "PARTIALLY_RECONCILED"
            : "UNRECONCILED",
    },
    bankTransactions: transactions,
    booksTransactions: transactions.filter(t => t.source === "BOOKS_MANUAL"),
    suggestions: [],
  });
};

export const matchReconciliation = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const links = Array.isArray(req.body.links)
    ? req.body.links
    : req.body.bankTransactionId
      ? [{ bankTransactionId: req.body.bankTransactionId }]
      : [];
  if (!links.length) return fail(res, 400, "VALIDATION_ERROR", "No reconciliation links supplied");
  
  try {
    const matched = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const link of links) {
        const txn = await tx.bankTransaction.update({
          where: { id: Number(link.bankTransactionId), companyId },
          data: {
            isReconciled: true,
            matchedJournalLineId: link.journalRef ? Number(link.journalRef) : undefined,
            reconciledAt: new Date(),
          }
        });
        
        await tx.bankAccount.update({
          where: { id: txn.bankAccountId },
          data: { unreconciledCount: { decrement: 1 } }
        });
        count += 1;
      }

      return count;
    });
    
    return ok(res, { matched }, "Transaction matched");
  } catch {
    return fail(res, 404, "TRANSACTION_NOT_FOUND", "Transaction not found");
  }
};

export const finalizeReconciliation = async (req: Request, res: Response) => {
  return ok(res, {
    bankAccountId: Number(req.params.id),
    month: Number(req.body.month ?? req.query.month ?? new Date().getMonth() + 1),
    year: Number(req.body.year ?? req.query.year ?? new Date().getFullYear()),
    finalizedAt: new Date().toISOString(),
    status: "LOCKED",
  }, "Reconciliation finalized");
};


