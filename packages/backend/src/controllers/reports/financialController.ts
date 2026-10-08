import type { Request, Response } from "express";
import { z } from "zod";
import {
  accountClosingBalance,
  accountPeriodAmount,
  canonicalAccountType,
} from "../../lib/accounting";
import { fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId } from "../../lib/requestUtils";

const dateParamSchema = z.object({ date: z.string().optional() });
const periodSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  compare: z.string().optional(),
});
const reportExportSchema = z.object({
  reportType: z.enum(["trial-balance", "profit-loss", "balance-sheet", "cash-flow", "day-book"]),
  params: z.record(z.string(), z.string()).optional(),
  format: z.enum(["pdf", "excel", "csv"]),
});

const parseDateBoundary = (
  value: string | undefined,
  boundary: "start" | "end",
): Date | undefined => {
  if (!value) return undefined;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    if (boundary === "start") return new Date(year, month, day, 0, 0, 0, 0);
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

const period = (query: Record<string, unknown>) => ({
  from: parseDateBoundary(query.from ? String(query.from) : undefined, "start"),
  to: parseDateBoundary(query.to ? String(query.to) : undefined, "end"),
});

const round = (value: number) => Number(Number(value || 0).toFixed(2));

const buildDateFilter = (from?: Date, to?: Date) => {
  if (from && to) return { gte: from, lte: to };
  if (from) return { gte: from };
  if (to) return { lte: to };
  return undefined;
};

const classifyBalanceSheetBucket = (type: "asset" | "liability", name: string, group: string) => {
  const text = `${name} ${group}`.toLowerCase();
  if (type === "asset") {
    return /(fixed|property|plant|equipment|non current|long term|investment)/.test(text)
      ? "nonCurrent"
      : "current";
  }
  return /(long term|non current|loan|borrowing)/.test(text) ? "nonCurrent" : "current";
};

const isCashOrBankAccount = (account: { type: string; code: string; name: string; group: string }) => {
  const type = canonicalAccountType(account.type);
  if (type !== "asset") return false;
  const text = `${account.code} ${account.name} ${account.group}`.toLowerCase();
  return /(cash|bank|current account|savings account|petty cash)/.test(text);
};

const cashFlowCategoryFromAccount = (account?: { type: string; code: string; name: string; group: string }) => {
  if (!account) return "operating" as const;
  const type = canonicalAccountType(account.type);
  const text = `${account.code} ${account.name} ${account.group}`.toLowerCase();

  if (type === "equity") return "financing" as const;
  if (/(capital|share|owner|partner|drawings|dividend|loan|borrow|debenture|mortgage|finance)/.test(text)) {
    return "financing" as const;
  }

  if (/(fixed|property|plant|equipment|machinery|vehicle|building|land|intangible|investment|asset purchase)/.test(text)) {
    return "investing" as const;
  }

  if (type === "asset" && !isCashOrBankAccount(account) && /(investment|fixed|property|plant|equipment|vehicle|building|land)/.test(text)) {
    return "investing" as const;
  }

  return "operating" as const;
};

const toItems = (map: Map<string, number>) =>
  Array.from(map.entries())
    .map(([label, amount]) => ({ label, amount: round(amount) }))
    .filter((item) => Math.abs(item.amount) >= 0.01)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

const getAccountMovement = async (
  companyId: number,
  from?: Date,
  to?: Date,
) => {
  const dateFilter = buildDateFilter(from, to);
  const [accounts, lines] = await Promise.all([
    prisma.account.findMany({
      where: { companyId, isActive: true },
      orderBy: { code: "asc" },
    }),
    prisma.journalLine.findMany({
      where: {
        companyId,
        entry: {
          status: "POSTED",
          ...(dateFilter ? { date: dateFilter } : {}),
        },
      },
    }),
  ]);

  const movementByAccountId = new Map<number, { debit: number; credit: number }>();
  for (const line of lines) {
    const existing = movementByAccountId.get(line.accountId) ?? { debit: 0, credit: 0 };
    existing.debit += Number(line.debit);
    existing.credit += Number(line.credit);
    movementByAccountId.set(line.accountId, existing);
  }

  return { accounts, movementByAccountId };
};

export const getTrialBalance = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = dateParamSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid trial balance query", parsed.error.issues);

  const asOf = parseDateBoundary(parsed.data.date, "end") ?? new Date();
  const { accounts, movementByAccountId } = await getAccountMovement(companyId, undefined, asOf);

  const rows = accounts.map((account) => {
    const movement = movementByAccountId.get(account.id) ?? { debit: 0, credit: 0 };
    const closing = accountClosingBalance(
      account.type,
      Number(account.openingBalance),
      movement.debit,
      movement.credit,
    );
    const type = canonicalAccountType(account.type);
    const debit =
      type === "asset" || type === "expense"
        ? Math.max(closing, 0)
        : Math.max(-closing, 0);
    const credit =
      type === "asset" || type === "expense"
        ? Math.max(-closing, 0)
        : Math.max(closing, 0);

    return {
      code: account.code,
      name: account.name,
      type: account.type,
      debit: round(debit),
      credit: round(credit),
      previousYear: 0,
    };
  });
  const totalDr = round(rows.reduce((sum, row) => sum + row.debit, 0));
  const totalCr = round(rows.reduce((sum, row) => sum + row.credit, 0));
  return ok(res, { asOf, accounts: rows, totalDr, totalCr, isBalanced: Math.abs(totalDr - totalCr) <= 0.01 });
};

export const getProfitLoss = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = periodSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid profit-loss query", parsed.error.issues);
  const { from, to } = period(req.query);

  const { accounts, movementByAccountId } = await getAccountMovement(companyId, from, to);

  const revenueRows: Array<{ code: string; name: string; amount: number }> = [];
  const cogsRows: Array<{ code: string; name: string; amount: number }> = [];
  const expenseRows: Array<{ code: string; name: string; amount: number }> = [];

  for (const account of accounts) {
    const movement = movementByAccountId.get(account.id) ?? { debit: 0, credit: 0 };
    const amount = accountPeriodAmount(account.type, movement.debit, movement.credit);
    if (amount <= 0) continue;

    const type = canonicalAccountType(account.type);
    if (type === "income") {
      revenueRows.push({ code: account.code, name: account.name, amount: round(amount) });
      continue;
    }

    if (type === "expense") {
      const label = `${account.name} ${account.group}`.toLowerCase();
      const isCogs = /(purchase|cost of goods|cogs|direct expense|material consumed)/.test(label);
      if (isCogs) {
        cogsRows.push({ code: account.code, name: account.name, amount: round(amount) });
      } else {
        expenseRows.push({ code: account.code, name: account.name, amount: round(amount) });
      }
    }
  }

  const revenueTotal = round(revenueRows.reduce((sum, row) => sum + row.amount, 0));
  const cogsTotal = round(cogsRows.reduce((sum, row) => sum + row.amount, 0));
  const expenseTotal = round(expenseRows.reduce((sum, row) => sum + row.amount, 0));
  const grossProfit = round(revenueTotal - cogsTotal);
  const netProfit = round(grossProfit - expenseTotal);

  return ok(res, {
    from: from?.toISOString() ?? parsed.data.from,
    to: to?.toISOString() ?? parsed.data.to,
    compare: parsed.data.compare ?? "none",
    revenue: { total: revenueTotal, accounts: revenueRows },
    cogs: { total: cogsTotal, accounts: cogsRows },
    grossProfit,
    expenses: { total: expenseTotal, accounts: expenseRows },
    netProfit,
  });
};

export const getBalanceSheet = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = dateParamSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid balance-sheet query", parsed.error.issues);

  const asOf = parseDateBoundary(parsed.data.date, "end") ?? new Date();
  const { accounts, movementByAccountId } = await getAccountMovement(companyId, undefined, asOf);

  const assets = { current: [] as Array<{ name: string; amount: number }>, nonCurrent: [] as Array<{ name: string; amount: number }> };
  const liabilities = { current: [] as Array<{ name: string; amount: number }>, nonCurrent: [] as Array<{ name: string; amount: number }> };
  const equity = [] as Array<{ name: string; amount: number }>;

  let incomeToDate = 0;
  let expensesToDate = 0;

  for (const account of accounts) {
    const movement = movementByAccountId.get(account.id) ?? { debit: 0, credit: 0 };
    const closing = accountClosingBalance(
      account.type,
      Number(account.openingBalance),
      movement.debit,
      movement.credit,
    );
    if (Math.abs(closing) < 0.005) continue;

    const type = canonicalAccountType(account.type);
    if (type === "income") {
      incomeToDate += closing;
      continue;
    }
    if (type === "expense") {
      expensesToDate += closing;
      continue;
    }

    const row = { name: `${account.code} - ${account.name}`, amount: round(closing) };
    if (type === "asset") {
      const bucket = classifyBalanceSheetBucket("asset", account.name, account.group);
      assets[bucket].push(row);
    } else if (type === "liability") {
      const bucket = classifyBalanceSheetBucket("liability", account.name, account.group);
      liabilities[bucket].push(row);
    } else if (type === "equity") {
      equity.push(row);
    }
  }

  const currentPeriodEarnings = round(incomeToDate - expensesToDate);
  if (Math.abs(currentPeriodEarnings) >= 0.01) {
    equity.push({ name: "Current Period Earnings", amount: currentPeriodEarnings });
  }

  const totalAssets = round([...assets.current, ...assets.nonCurrent].reduce((sum, row) => sum + row.amount, 0));
  const totalLiabilities = round([...liabilities.current, ...liabilities.nonCurrent].reduce((sum, row) => sum + row.amount, 0));
  const totalEquity = round(equity.reduce((sum, row) => sum + row.amount, 0));

  return ok(res, {
    asOf: asOf.toISOString(),
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) <= 0.01,
  });
};

export const getCashFlow = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = periodSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid cash-flow query", parsed.error.issues);
  const { from, to } = period(req.query);
  const periodStart = from ?? new Date(0);
  const periodEnd = to ?? new Date();

  const [accounts, openingLines, entries] = await Promise.all([
    prisma.account.findMany({
      where: { companyId, isActive: true },
      select: { id: true, code: true, name: true, group: true, type: true, openingBalance: true },
    }),
    prisma.journalLine.findMany({
      where: {
        companyId,
        entry: { status: "POSTED", date: { lt: periodStart } },
      },
      include: { entry: true },
    }),
    prisma.journalEntry.findMany({
      where: {
        companyId,
        status: "POSTED",
        date: { gte: periodStart, lte: periodEnd },
      },
      include: { lines: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const cashAccountIds = new Set(accounts.filter(isCashOrBankAccount).map((account) => account.id));

  const openingFromMasters = accounts
    .filter((account) => cashAccountIds.has(account.id))
    .reduce((sum, account) => sum + Number(account.openingBalance), 0);

  const openingFromMovements = openingLines.reduce((sum, line) => {
    if (!cashAccountIds.has(line.accountId)) return sum;
    return sum + Number(line.debit) - Number(line.credit);
  }, 0);

  const openingCash = round(openingFromMasters + openingFromMovements);

  const operatingMap = new Map<string, number>();
  const investingMap = new Map<string, number>();
  const financingMap = new Map<string, number>();

  const add = (map: Map<string, number>, label: string, amount: number) => {
    map.set(label, round((map.get(label) ?? 0) + amount));
  };

  for (const entry of entries) {
    const cashLines = entry.lines.filter((line) => cashAccountIds.has(line.accountId));
    if (!cashLines.length) continue;

    const cashEffect = round(
      cashLines.reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0),
    );
    if (Math.abs(cashEffect) < 0.01) continue;

    const nonCashLines = entry.lines.filter((line) => !cashAccountIds.has(line.accountId));
    if (!nonCashLines.length) {
      add(operatingMap, "Unclassified cash movement", cashEffect);
      continue;
    }

    const weighted = nonCashLines
      .map((line) => {
        const account = accountById.get(line.accountId);
        const weight = Math.max(Math.abs(Number(line.debit)), Math.abs(Number(line.credit)));
        const category = cashFlowCategoryFromAccount(account);
        const label = account ? `${account.code} - ${account.name}` : `Account ${line.accountId}`;
        return { weight, category, label };
      })
      .filter((row) => row.weight > 0);

    const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0);
    if (totalWeight <= 0) {
      add(operatingMap, "Unclassified cash movement", cashEffect);
      continue;
    }

    let remaining = cashEffect;
    weighted.forEach((row, index) => {
      const isLast = index === weighted.length - 1;
      const amount = isLast ? remaining : round((cashEffect * row.weight) / totalWeight);
      remaining = round(remaining - amount);
      if (row.category === "operating") add(operatingMap, row.label, amount);
      else if (row.category === "investing") add(investingMap, row.label, amount);
      else add(financingMap, row.label, amount);
    });
  }

  const operatingItems = toItems(operatingMap);
  const investingItems = toItems(investingMap);
  const financingItems = toItems(financingMap);

  const operatingNet = round(operatingItems.reduce((sum, row) => sum + row.amount, 0));
  const investingNet = round(investingItems.reduce((sum, row) => sum + row.amount, 0));
  const financingNet = round(financingItems.reduce((sum, row) => sum + row.amount, 0));
  const netChange = round(operatingNet + investingNet + financingNet);
  const closingCash = round(openingCash + netChange);

  return ok(res, {
    from: periodStart.toISOString(),
    to: periodEnd.toISOString(),
    operating: { netProfit: operatingNet, adjustments: operatingItems, net: operatingNet },
    investing: { items: investingItems, net: investingNet },
    financing: { items: financingItems, net: financingNet },
    netChange,
    openingCash,
    closingCash,
  });
};

export const getDayBook = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = dateParamSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid day-book query", parsed.error.issues);

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const [sales, purchases, receipts, journals] = await Promise.all([
    prisma.invoice.findMany({ where: { companyId, date: { gte: start, lt: end }, status: { not: "VOID" } }, include: { customer: true } }),
    prisma.bill.findMany({ where: { companyId, date: { gte: start, lt: end }, status: { not: "VOID" } }, include: { supplier: true } }),
    prisma.payment.findMany({ where: { companyId, date: { gte: start, lt: end } } }),
    prisma.journalEntry.findMany({ where: { companyId, date: { gte: start, lt: end }, status: "POSTED" }, include: { lines: true } }),
  ]);
  return ok(res, {
    date: start.toISOString().slice(0, 10),
    sales: sales.map((row) => ({ refNo: row.invoiceNo, party: row.customer?.name, amount: Number(row.grandTotal) })),
    purchases: purchases.map((row) => ({ refNo: row.billNo, party: row.supplier?.name, amount: Number(row.grandTotal) })),
    receipts: receipts.filter((row) => ["RECEIPT", "ADVANCE_RECEIPT"].includes(row.type)).map((row) => ({ refNo: row.reference ?? row.id, amount: Number(row.amount), mode: row.mode })),
    payments: receipts.filter((row) => row.type === "PAYMENT").map((row) => ({ refNo: row.reference ?? row.id, amount: Number(row.amount), mode: row.mode })),
    journals: journals.map((row) => ({
      refNo: row.entryNo,
      narration: row.narration,
      amount: round(row.lines.reduce((sum, line) => sum + Number(line.debit), 0)),
    })),
    totals: {
      totalSales: sales.reduce((sum, row) => sum + Number(row.grandTotal), 0),
      totalPurchases: purchases.reduce((sum, row) => sum + Number(row.grandTotal), 0),
      totalReceipts: receipts.filter((row) => ["RECEIPT", "ADVANCE_RECEIPT"].includes(row.type)).reduce((sum, row) => sum + Number(row.amount), 0),
      totalPayments: receipts.filter((row) => row.type === "PAYMENT").reduce((sum, row) => sum + Number(row.amount), 0),
    },
  });
};

export const exportFinancialReport = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = reportExportSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid report export payload", parsed.error.issues);
  const { reportType, format } = parsed.data;
  const stamp = new Date().toISOString();

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${reportType}.csv`);
    res.status(200).send(`reportType,generatedAt\n${reportType},${stamp}\n`);
    return;
  }
  return ok(res, { reportType, format, generatedAt: stamp }, "Report export generated");
};
