import type { Request, Response } from "express";
import { fail, ok } from "../../lib/apiResponse";
import { canonicalAccountType } from "../../lib/accounting";
import { prisma } from "../../lib/prisma";
import { getCompanyId } from "../../lib/requestUtils";

export const getGeneralLedger = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const accountId = Number(req.query.accountId);
  if (isNaN(accountId)) return fail(res, 400, "ACCOUNT_REQUIRED", "Valid accountId query parameter is required");
  
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const dateFilter =
    from && to ? { gte: from, lte: to } : from ? { gte: from } : to ? { lte: to } : undefined;

  const account = await prisma.account.findFirst({
    where: { id: accountId, companyId }
  });
  if (!account) return fail(res, 404, "ACCOUNT_NOT_FOUND", "Account not found");

  const openingLines = await prisma.journalLine.findMany({
    where: {
      companyId,
      accountId,
      ...(from
        ? {
            entry: {
              status: "POSTED",
              date: { lt: from },
            },
          }
        : {
            entry: { status: "POSTED", date: { lte: new Date(0) } },
          }),
    },
  });

  const lines = await prisma.journalLine.findMany({
    where: {
      companyId,
      accountId,
      entry: {
        status: "POSTED",
        ...(dateFilter ? { date: dateFilter } : {}),
      }
    },
    include: { entry: true },
    orderBy: { entry: { date: "asc" } }
  });

  const transactions = lines.map(line => ({
    date: line.entry.date,
    voucherNo: line.entry.entryNo,
    narration: line.narration || line.entry.narration,
    debit: Number(line.debit),
    credit: Number(line.credit),
  }));

  const type = canonicalAccountType(account.type);
  const isDebitNature = type === "asset" || type === "expense";
  const openingMovement = openingLines.reduce(
    (sum, line) =>
      sum + (isDebitNature ? Number(line.debit) - Number(line.credit) : Number(line.credit) - Number(line.debit)),
    0,
  );
  const openingBalance = Number(account.openingBalance) + openingMovement;
  let runningBalance = openingBalance;
  const withRunning = transactions.map((txn) => {
    runningBalance = Number(
      (runningBalance + (isDebitNature ? txn.debit - txn.credit : txn.credit - txn.debit)).toFixed(2),
    );
    return { ...txn, runningBalance };
  });

  return ok(res, {
    openingBalance,
    transactions: withRunning,
    closingBalance: runningBalance,
  });
};
