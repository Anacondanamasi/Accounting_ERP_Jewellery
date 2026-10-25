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
import {
  getCompanyInfo,
  generateCsv,
  generateExcel,
  generatePdf,
  formatDateDisplay,
  formatCurrencyINR,
  type ExportDataPayload,
} from "../../services/reportExportService";

const dateParamSchema = z.object({ date: z.string().optional() });
const trialBalanceParamSchema = z.object({
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  compare: z.string().optional(),
});
const periodSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  compare: z.string().optional(),
});
const reportExportSchema = z.object({
  reportType: z.enum(["trial-balance", "profit-loss", "balance-sheet", "cash-flow", "day-book", "general-ledger"]),
  params: z.record(z.string(), z.unknown()).optional(),
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
  excludeClosing = false,
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
          ...(excludeClosing ? { narration: { not: { contains: "Financial Year End Closing" } } } : {}),
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
  const parsed = trialBalanceParamSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid trial balance query", parsed.error.issues);

  const toDateRaw = parsed.data.to || parsed.data.date;
  const asOf = parseDateBoundary(toDateRaw, "end") ?? new Date();
  const fromDate = parseDateBoundary(parsed.data.from, "start");

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
          date: { lte: asOf },
        },
      },
      include: {
        entry: {
          select: { date: true },
        },
      },
    }),
  ]);

  const cumMovements = new Map<number, { debit: number; credit: number }>();
  const periodMovements = new Map<number, { debit: number; credit: number }>();
  const priorMovements = new Map<number, { debit: number; credit: number }>();

  for (const line of lines) {
    const d = Number(line.debit);
    const c = Number(line.credit);

    // Cumulative (all up to asOf)
    const curCum = cumMovements.get(line.accountId) ?? { debit: 0, credit: 0 };
    curCum.debit += d;
    curCum.credit += c;
    cumMovements.set(line.accountId, curCum);

    if (fromDate) {
      const entryDate = new Date(line.entry.date);
      if (entryDate < fromDate) {
        const curPrior = priorMovements.get(line.accountId) ?? { debit: 0, credit: 0 };
        curPrior.debit += d;
        curPrior.credit += c;
        priorMovements.set(line.accountId, curPrior);
      } else if (entryDate <= asOf) {
        const curPeriod = periodMovements.get(line.accountId) ?? { debit: 0, credit: 0 };
        curPeriod.debit += d;
        curPeriod.credit += c;
        periodMovements.set(line.accountId, curPeriod);
      }
    }
  }

  // Calculate prior net income to absorb into Retained Earnings opening balance
  let priorNetIncome = 0;
  if (fromDate) {
    for (const a of accounts) {
      const type = canonicalAccountType(a.type);
      const pm = priorMovements.get(a.id) ?? { debit: 0, credit: 0 };
      if (type === "income") {
        priorNetIncome += Number(a.openingBalance) + (pm.credit - pm.debit);
      } else if (type === "expense") {
        priorNetIncome -= Number(a.openingBalance) + (pm.debit - pm.credit);
      }
    }
  }

  // Retained earnings account
  const retainedEarningsAccount =
    accounts.find((a) => a.code === "3100") ||
    accounts.find((a) => a.name.toLowerCase().includes("retained earnings")) ||
    accounts.find((a) => canonicalAccountType(a.type) === "equity");
  const retainedEarningsAccountId = retainedEarningsAccount?.id;

  const rows = accounts.map((account) => {
    const type = canonicalAccountType(account.type);
    const isNominal = type === "income" || type === "expense";
    const isRetainedEarnings = account.id === retainedEarningsAccountId;

    let debit = 0;
    let credit = 0;

    if (fromDate && isNominal) {
      // Nominal accounts in a period Trial Balance only reflect activity in the selected period
      const pm = periodMovements.get(account.id) ?? { debit: 0, credit: 0 };
      if (type === "income") {
        const netCr = pm.credit - pm.debit;
        if (netCr >= 0) credit = netCr;
        else debit = -netCr;
      } else {
        const netDr = pm.debit - pm.credit;
        if (netDr >= 0) debit = netDr;
        else credit = -netDr;
      }
    } else {
      // Balance Sheet accounts reflect cumulative balance up to asOf
      const cm = cumMovements.get(account.id) ?? { debit: 0, credit: 0 };
      let opBal = Number(account.openingBalance);

      // If this is Retained Earnings and we have a period fromDate, absorb priorNetIncome into opening balance
      if (isRetainedEarnings && fromDate) {
        opBal += priorNetIncome;
      }

      const closing = accountClosingBalance(account.type, opBal, cm.debit, cm.credit);

      if (type === "asset" || type === "expense") {
        debit = Math.max(closing, 0);
        credit = Math.max(-closing, 0);
      } else {
        credit = Math.max(closing, 0);
        debit = Math.max(-closing, 0);
      }
    }

    const periodMov = periodMovements.get(account.id) ?? { debit: 0, credit: 0 };

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit: round(debit),
      credit: round(credit),
      periodDebit: round(periodMov.debit),
      periodCredit: round(periodMov.credit),
      previousYear: 0,
    };
  });

  const totalDr = round(rows.reduce((sum, row) => sum + row.debit, 0));
  const totalCr = round(rows.reduce((sum, row) => sum + row.credit, 0));

  return ok(res, {
    asOf,
    from: parsed.data.from,
    to: toDateRaw,
    accounts: rows,
    totalDr,
    totalCr,
    isBalanced: Math.abs(totalDr - totalCr) <= 0.01,
  });
};

export const getProfitLoss = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = periodSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid profit-loss query", parsed.error.issues);
  const { from, to } = period(req.query);

  const { accounts, movementByAccountId } = await getAccountMovement(companyId, from, to, true);

  const revenueRows: Array<{ id: number; code: string; name: string; amount: number }> = [];
  const cogsRows: Array<{ id: number; code: string; name: string; amount: number }> = [];
  const expenseRows: Array<{ id: number; code: string; name: string; amount: number }> = [];

  for (const account of accounts) {
    const movement = movementByAccountId.get(account.id) ?? { debit: 0, credit: 0 };
    const amount = accountPeriodAmount(account.type, movement.debit, movement.credit);
    if (amount <= 0) continue;

    const type = canonicalAccountType(account.type);
    if (type === "income") {
      revenueRows.push({ id: account.id, code: account.code, name: account.name, amount: round(amount) });
      continue;
    }

    if (type === "expense") {
      const label = `${account.name} ${account.group}`.toLowerCase();
      const isCogs = /(purchase|cost of goods|cogs|direct expense|material consumed)/.test(label);
      if (isCogs) {
        cogsRows.push({ id: account.id, code: account.code, name: account.name, amount: round(amount) });
      } else {
        expenseRows.push({ id: account.id, code: account.code, name: account.name, amount: round(amount) });
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

  const assets = { current: [] as Array<{ id?: number; code?: string; name: string; amount: number }>, nonCurrent: [] as Array<{ id?: number; code?: string; name: string; amount: number }> };
  const liabilities = { current: [] as Array<{ id?: number; code?: string; name: string; amount: number }>, nonCurrent: [] as Array<{ id?: number; code?: string; name: string; amount: number }> };
  const equity = [] as Array<{ id?: number; code?: string; name: string; amount: number }>;

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

    const row = { id: account.id, code: account.code, name: `${account.code} - ${account.name}`, amount: round(closing) };
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
  const { reportType, format, params } = parsed.data;
  const company = await getCompanyInfo(companyId);
  const now = new Date();

  let payload: ExportDataPayload;
  let filenamePrefix = "Report";

  if (reportType === "trial-balance") {
    const toDateRaw = typeof params?.to === "string" ? params.to : (typeof params?.date === "string" ? params.date : undefined);
    const asOf = parseDateBoundary(toDateRaw, "end") ?? new Date();
    const fromDate = typeof params?.from === "string" ? parseDateBoundary(params.from, "start") : undefined;

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
            date: { lte: asOf },
          },
        },
        include: {
          entry: { select: { date: true } },
        },
      }),
    ]);

    const cumMovements = new Map<number, { debit: number; credit: number }>();
    const periodMovements = new Map<number, { debit: number; credit: number }>();
    const priorMovements = new Map<number, { debit: number; credit: number }>();

    for (const line of lines) {
      const d = Number(line.debit);
      const c = Number(line.credit);

      const curCum = cumMovements.get(line.accountId) ?? { debit: 0, credit: 0 };
      curCum.debit += d;
      curCum.credit += c;
      cumMovements.set(line.accountId, curCum);

      if (fromDate) {
        const entryDate = new Date(line.entry.date);
        if (entryDate < fromDate) {
          const curPrior = priorMovements.get(line.accountId) ?? { debit: 0, credit: 0 };
          curPrior.debit += d;
          curPrior.credit += c;
          priorMovements.set(line.accountId, curPrior);
        } else if (entryDate <= asOf) {
          const curPeriod = periodMovements.get(line.accountId) ?? { debit: 0, credit: 0 };
          curPeriod.debit += d;
          curPeriod.credit += c;
          periodMovements.set(line.accountId, curPeriod);
        }
      }
    }

    let priorNetIncome = 0;
    if (fromDate) {
      for (const a of accounts) {
        const type = canonicalAccountType(a.type);
        const pm = priorMovements.get(a.id) ?? { debit: 0, credit: 0 };
        if (type === "income") {
          priorNetIncome += Number(a.openingBalance) + (pm.credit - pm.debit);
        } else if (type === "expense") {
          priorNetIncome -= Number(a.openingBalance) + (pm.debit - pm.credit);
        }
      }
    }

    const retainedEarningsAccount =
      accounts.find((a) => a.code === "3100") ||
      accounts.find((a) => a.name.toLowerCase().includes("retained earnings")) ||
      accounts.find((a) => canonicalAccountType(a.type) === "equity");
    const retainedEarningsAccountId = retainedEarningsAccount?.id;

    const rows: Array<[string, string, string, number, number]> = [];
    let totalDr = 0;
    let totalCr = 0;

    for (const account of accounts) {
      const type = canonicalAccountType(account.type);
      const isNominal = type === "income" || type === "expense";
      const isRetainedEarnings = account.id === retainedEarningsAccountId;

      let debit = 0;
      let credit = 0;

      if (fromDate && isNominal) {
        const pm = periodMovements.get(account.id) ?? { debit: 0, credit: 0 };
        if (type === "income") {
          const netCr = pm.credit - pm.debit;
          if (netCr >= 0) credit = netCr;
          else debit = -netCr;
        } else {
          const netDr = pm.debit - pm.credit;
          if (netDr >= 0) debit = netDr;
          else credit = -netDr;
        }
      } else {
        const cm = cumMovements.get(account.id) ?? { debit: 0, credit: 0 };
        let opBal = Number(account.openingBalance);

        if (isRetainedEarnings && fromDate) {
          opBal += priorNetIncome;
        }

        const closing = accountClosingBalance(account.type, opBal, cm.debit, cm.credit);
        if (type === "asset" || type === "expense") {
          debit = Math.max(closing, 0);
          credit = Math.max(-closing, 0);
        } else {
          credit = Math.max(closing, 0);
          debit = Math.max(-closing, 0);
        }
      }

      debit = round(debit);
      credit = round(credit);

      const onlyWithBalance = params?.onlyWithBalance === "true" || params?.onlyWithBalance === true;
      if (onlyWithBalance && debit === 0 && credit === 0) {
        continue;
      }

      totalDr += debit;
      totalCr += credit;
      rows.push([account.code, account.name, account.type, debit, credit]);
    }

    totalDr = round(totalDr);
    totalCr = round(totalCr);
    const isBalanced = Math.abs(totalDr - totalCr) <= 0.01;

    const periodLabel = fromDate
      ? `${formatDateDisplay(fromDate)} to ${formatDateDisplay(asOf)}`
      : `As of ${formatDateDisplay(asOf)}`;
    const filenamePeriod = fromDate
      ? `${formatDateDisplay(fromDate)}_to_${formatDateDisplay(asOf)}`
      : `As_of_${formatDateDisplay(asOf)}`;

    filenamePrefix = `Trial_Balance_${filenamePeriod}`;
    payload = {
      company,
      meta: {
        title: "Trial Balance",
        periodLabel,
        filenamePeriod,
        generatedAt: now,
      },
      headers: ["Code", "Account Name", "Type", "Debit (INR)", "Credit (INR)"],
      alignments: ["left", "left", "left", "right", "right"],
      columnWidths: [10, 36, 16, 18, 18],
      rows,
      summaryRows: [["", "TOTAL", "", totalDr, totalCr]],
      note: isBalanced
        ? "BALANCED: Total Dr equals Total Cr (Difference: ₹0.00)"
        : `OUT OF BALANCE: Difference of ₹${formatCurrencyINR(Math.abs(totalDr - totalCr))}`,
    };
  } else if (reportType === "profit-loss") {
    const from = typeof params?.from === "string" ? parseDateBoundary(params.from, "start") : undefined;
    const to = typeof params?.to === "string" ? parseDateBoundary(params.to, "end") : new Date();

    const { accounts, movementByAccountId } = await getAccountMovement(companyId, from, to, true);

    const revenueRows: Array<[string, string, number]> = [];
    const cogsRows: Array<[string, string, number]> = [];
    const expenseRows: Array<[string, string, number]> = [];

    for (const account of accounts) {
      const movement = movementByAccountId.get(account.id) ?? { debit: 0, credit: 0 };
      const amount = accountPeriodAmount(account.type, movement.debit, movement.credit);
      if (amount <= 0) continue;

      const type = canonicalAccountType(account.type);
      if (type === "income") {
        revenueRows.push([account.code, account.name, round(amount)]);
        continue;
      }

      if (type === "expense") {
        const label = `${account.name} ${account.group}`.toLowerCase();
        const isCogs = /(purchase|cost of goods|cogs|direct expense|material consumed)/.test(label);
        if (isCogs) {
          cogsRows.push([account.code, account.name, round(amount)]);
        } else {
          expenseRows.push([account.code, account.name, round(amount)]);
        }
      }
    }

    const revenueTotal = round(revenueRows.reduce((sum, r) => sum + r[2], 0));
    const cogsTotal = round(cogsRows.reduce((sum, r) => sum + r[2], 0));
    const expenseTotal = round(expenseRows.reduce((sum, r) => sum + r[2], 0));
    const grossProfit = round(revenueTotal - cogsTotal);
    const netProfit = round(grossProfit - expenseTotal);

    const periodLabel = from
      ? `${formatDateDisplay(from)} to ${formatDateDisplay(to)}`
      : `Up to ${formatDateDisplay(to)}`;
    const filenamePeriod = from
      ? `${formatDateDisplay(from)}_to_${formatDateDisplay(to)}`
      : `Up_to_${formatDateDisplay(to)}`;

    filenamePrefix = `Profit_Loss_${filenamePeriod}`;

    const rows: Array<[string, string, number | string]> = [];
    rows.push(["", "--- REVENUE ---", ""]);
    revenueRows.forEach((r) => rows.push(r));
    rows.push(["", "Total Revenue", revenueTotal]);
    rows.push(["", "", ""]);
    rows.push(["", "--- COST OF GOODS SOLD ---", ""]);
    cogsRows.forEach((r) => rows.push(r));
    rows.push(["", "Total Cost of Goods Sold", cogsTotal]);
    rows.push(["", "", ""]);
    rows.push(["", "GROSS PROFIT", grossProfit]);
    rows.push(["", "", ""]);
    rows.push(["", "--- OPERATING EXPENSES ---", ""]);
    expenseRows.forEach((r) => rows.push(r));
    rows.push(["", "Total Operating Expenses", expenseTotal]);

    payload = {
      company,
      meta: {
        title: "Profit & Loss Statement",
        periodLabel,
        filenamePeriod,
        generatedAt: now,
      },
      headers: ["Code", "Particulars", "Amount (INR)"],
      alignments: ["left", "left", "right"],
      columnWidths: [12, 45, 20],
      rows,
      summaryRows: [["", netProfit >= 0 ? "NET PROFIT" : "NET LOSS", netProfit]],
    };
  } else if (reportType === "balance-sheet") {
    const asOf = typeof params?.date === "string" ? parseDateBoundary(params.date, "end") ?? new Date() : new Date();
    const { accounts, movementByAccountId } = await getAccountMovement(companyId, undefined, asOf);

    const assets = { current: [] as Array<[string, string, number]>, nonCurrent: [] as Array<[string, string, number]> };
    const liabilities = { current: [] as Array<[string, string, number]>, nonCurrent: [] as Array<[string, string, number]> };
    const equity: Array<[string, string, number]> = [];

    let incomeToDate = 0;
    let expensesToDate = 0;

    for (const account of accounts) {
      const movement = movementByAccountId.get(account.id) ?? { debit: 0, credit: 0 };
      const closing = accountClosingBalance(account.type, Number(account.openingBalance), movement.debit, movement.credit);
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

      const item: [string, string, number] = [account.code, account.name, round(closing)];
      if (type === "asset") {
        const bucket = classifyBalanceSheetBucket("asset", account.name, account.group);
        assets[bucket].push(item);
      } else if (type === "liability") {
        const bucket = classifyBalanceSheetBucket("liability", account.name, account.group);
        liabilities[bucket].push(item);
      } else if (type === "equity") {
        equity.push(item);
      }
    }

    const currentPeriodEarnings = round(incomeToDate - expensesToDate);
    if (Math.abs(currentPeriodEarnings) >= 0.01) {
      equity.push(["", "Current Period Earnings", currentPeriodEarnings]);
    }

    const totalAssets = round(
      [...assets.current, ...assets.nonCurrent].reduce((sum, r) => sum + r[2], 0),
    );
    const totalLiabilities = round(
      [...liabilities.current, ...liabilities.nonCurrent].reduce((sum, r) => sum + r[2], 0),
    );
    const totalEquity = round(equity.reduce((sum, r) => sum + r[2], 0));
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) <= 0.01;

    const periodLabel = `As of ${formatDateDisplay(asOf)}`;
    const filenamePeriod = `As_of_${formatDateDisplay(asOf)}`;
    filenamePrefix = `Balance_Sheet_${filenamePeriod}`;

    const rows: Array<[string, string, number | string]> = [];
    rows.push(["", "--- CURRENT ASSETS ---", ""]);
    assets.current.forEach((r) => rows.push(r));
    rows.push(["", "--- NON-CURRENT ASSETS ---", ""]);
    assets.nonCurrent.forEach((r) => rows.push(r));
    rows.push(["", "TOTAL ASSETS", totalAssets]);
    rows.push(["", "", ""]);
    rows.push(["", "--- CURRENT LIABILITIES ---", ""]);
    liabilities.current.forEach((r) => rows.push(r));
    rows.push(["", "--- NON-CURRENT LIABILITIES ---", ""]);
    liabilities.nonCurrent.forEach((r) => rows.push(r));
    rows.push(["", "TOTAL LIABILITIES", totalLiabilities]);
    rows.push(["", "", ""]);
    rows.push(["", "--- EQUITY ---", ""]);
    equity.forEach((r) => rows.push(r));
    rows.push(["", "TOTAL EQUITY", totalEquity]);

    payload = {
      company,
      meta: {
        title: "Balance Sheet",
        periodLabel,
        filenamePeriod,
        generatedAt: now,
      },
      headers: ["Classification", "Particulars", "Amount (INR)"],
      alignments: ["left", "left", "right"],
      columnWidths: [14, 45, 20],
      rows,
      summaryRows: [["", "TOTAL LIABILITIES + EQUITY", totalLiabilities + totalEquity]],
      note: isBalanced
        ? "BALANCED: Total Assets equal Total Liabilities + Equity"
        : `OUT OF BALANCE: Difference of ₹${formatCurrencyINR(Math.abs(totalAssets - (totalLiabilities + totalEquity)))}`,
    };
  } else if (reportType === "day-book") {
    const dateStr = typeof params?.date === "string" ? params.date : undefined;
    const date = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    const [sales, purchases, receipts, journals] = await Promise.all([
      prisma.invoice.findMany({ where: { companyId, date: { gte: start, lt: end }, status: { not: "VOID" } }, include: { customer: true } }),
      prisma.bill.findMany({ where: { companyId, date: { gte: start, lt: end }, status: { not: "VOID" } }, include: { supplier: true } }),
      prisma.payment.findMany({ where: { companyId, date: { gte: start, lt: end } } }),
      prisma.journalEntry.findMany({ where: { companyId, date: { gte: start, lt: end }, status: "POSTED" }, include: { lines: true } }),
    ]);

    const totalSales = sales.reduce((sum, row) => sum + Number(row.grandTotal), 0);
    const totalPurchases = purchases.reduce((sum, row) => sum + Number(row.grandTotal), 0);
    const totalReceipts = receipts.filter((row) => ["RECEIPT", "ADVANCE_RECEIPT"].includes(row.type)).reduce((sum, row) => sum + Number(row.amount), 0);
    const totalPayments = receipts.filter((row) => row.type === "PAYMENT").reduce((sum, row) => sum + Number(row.amount), 0);

    const periodLabel = `Date: ${formatDateDisplay(start)}`;
    const filenamePeriod = `Date_${formatDateDisplay(start)}`;
    filenamePrefix = `Day_Book_${filenamePeriod}`;

    const rows: Array<[string, string, number | string]> = [];
    rows.push(["", "--- SALES INVOICES ---", ""]);
    sales.forEach((s) => rows.push([s.invoiceNo, s.customer?.name || "Customer", round(Number(s.grandTotal))]));
    rows.push(["", "--- PURCHASE BILLS ---", ""]);
    purchases.forEach((p) => rows.push([p.billNo, p.supplier?.name || "Supplier", round(Number(p.grandTotal))]));
    rows.push(["", "--- RECEIPTS ---", ""]);
    receipts.filter((r) => ["RECEIPT", "ADVANCE_RECEIPT"].includes(r.type)).forEach((r) => rows.push([r.reference || String(r.id), r.mode || "Receipt", round(Number(r.amount))]));
    rows.push(["", "--- PAYMENTS ---", ""]);
    receipts.filter((r) => r.type === "PAYMENT").forEach((p) => rows.push([p.reference || String(p.id), p.mode || "Payment", round(Number(p.amount))]));
    rows.push(["", "--- JOURNAL ENTRIES ---", ""]);
    journals.forEach((j) => rows.push([j.entryNo, j.narration, round(j.lines.reduce((sum, l) => sum + Number(l.debit), 0))]));

    payload = {
      company,
      meta: {
        title: "Day Book",
        periodLabel,
        filenamePeriod,
        generatedAt: now,
      },
      headers: ["Voucher / Ref No", "Particulars / Party", "Amount (INR)"],
      alignments: ["left", "left", "right"],
      columnWidths: [18, 42, 20],
      rows,
      summaryRows: [
        ["", "TOTAL SALES", round(totalSales)],
        ["", "TOTAL PURCHASES", round(totalPurchases)],
        ["", "TOTAL RECEIPTS", round(totalReceipts)],
        ["", "TOTAL PAYMENTS", round(totalPayments)],
      ],
    };
  } else if (reportType === "cash-flow") {
    const from = typeof params?.from === "string" ? parseDateBoundary(params.from, "start") : undefined;
    const to = typeof params?.to === "string" ? parseDateBoundary(params.to, "end") : new Date();
    const periodStart = from ?? new Date(0);
    const periodEnd = to ?? new Date();

    const [accounts, openingLines, entries] = await Promise.all([
      prisma.account.findMany({
        where: { companyId, isActive: true },
        select: { id: true, code: true, name: true, group: true, type: true, openingBalance: true },
      }),
      prisma.journalLine.findMany({
        where: { companyId, entry: { status: "POSTED", date: { lt: periodStart } } },
        include: { entry: true },
      }),
      prisma.journalEntry.findMany({
        where: { companyId, status: "POSTED", date: { gte: periodStart, lte: periodEnd } },
        include: { lines: true },
        orderBy: { date: "asc" },
      }),
    ]);

    const accountById = new Map(accounts.map((a) => [a.id, a]));
    const cashAccountIds = new Set(accounts.filter(isCashOrBankAccount).map((a) => a.id));

    const openingFromMasters = accounts
      .filter((a) => cashAccountIds.has(a.id))
      .reduce((sum, a) => sum + Number(a.openingBalance), 0);
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
      const cashLines = entry.lines.filter((l) => cashAccountIds.has(l.accountId));
      if (!cashLines.length) continue;
      const cashEffect = round(cashLines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0));
      if (Math.abs(cashEffect) < 0.01) continue;

      const nonCashLines = entry.lines.filter((l) => !cashAccountIds.has(l.accountId));
      if (!nonCashLines.length) {
        add(operatingMap, "Unclassified cash movement", cashEffect);
        continue;
      }

      const weighted = nonCashLines
        .map((l) => {
          const a = accountById.get(l.accountId);
          const weight = Math.max(Math.abs(Number(l.debit)), Math.abs(Number(l.credit)));
          const category = cashFlowCategoryFromAccount(a);
          const label = a ? `${a.code} - ${a.name}` : `Account ${l.accountId}`;
          return { weight, category, label };
        })
        .filter((r) => r.weight > 0);

      const totalWeight = weighted.reduce((sum, r) => sum + r.weight, 0);
      if (totalWeight <= 0) {
        add(operatingMap, "Unclassified cash movement", cashEffect);
        continue;
      }

      let remaining = cashEffect;
      weighted.forEach((r, idx) => {
        const isLast = idx === weighted.length - 1;
        const amount = isLast ? remaining : round((cashEffect * r.weight) / totalWeight);
        remaining = round(remaining - amount);
        if (r.category === "operating") add(operatingMap, r.label, amount);
        else if (r.category === "investing") add(investingMap, r.label, amount);
        else add(financingMap, r.label, amount);
      });
    }

    const operatingItems = toItems(operatingMap);
    const investingItems = toItems(investingMap);
    const financingItems = toItems(financingMap);

    const operatingNet = round(operatingItems.reduce((sum, r) => sum + r.amount, 0));
    const investingNet = round(investingItems.reduce((sum, r) => sum + r.amount, 0));
    const financingNet = round(financingItems.reduce((sum, r) => sum + r.amount, 0));
    const netChange = round(operatingNet + investingNet + financingNet);
    const closingCash = round(openingCash + netChange);

    const periodLabel = from
      ? `${formatDateDisplay(from)} to ${formatDateDisplay(to)}`
      : `Up to ${formatDateDisplay(to)}`;
    const filenamePeriod = from
      ? `${formatDateDisplay(from)}_to_${formatDateDisplay(to)}`
      : `Up_to_${formatDateDisplay(to)}`;
    filenamePrefix = `Cash_Flow_${filenamePeriod}`;

    const rows: Array<[string, string, number | string]> = [];
    rows.push(["", "--- OPERATING ACTIVITIES ---", ""]);
    operatingItems.forEach((r) => rows.push(["", r.label, r.amount]));
    rows.push(["", "Net Cash from Operating Activities", operatingNet]);
    rows.push(["", "", ""]);
    rows.push(["", "--- INVESTING ACTIVITIES ---", ""]);
    investingItems.forEach((r) => rows.push(["", r.label, r.amount]));
    rows.push(["", "Net Cash from Investing Activities", investingNet]);
    rows.push(["", "", ""]);
    rows.push(["", "--- FINANCING ACTIVITIES ---", ""]);
    financingItems.forEach((r) => rows.push(["", r.label, r.amount]));
    rows.push(["", "Net Cash from Financing Activities", financingNet]);
    rows.push(["", "", ""]);
    rows.push(["", "Opening Cash & Bank Balance", openingCash]);

    payload = {
      company,
      meta: {
        title: "Cash Flow Statement",
        periodLabel,
        filenamePeriod,
        generatedAt: now,
      },
      headers: ["Category", "Particulars", "Amount (INR)"],
      alignments: ["left", "left", "right"],
      columnWidths: [15, 45, 20],
      rows,
      summaryRows: [
        ["", "NET CHANGE IN CASH", netChange],
        ["", "CLOSING CASH & BANK BALANCE", closingCash],
      ],
    };
  } else if (reportType === "general-ledger") {
    const rawIdOrCode = String(params?.accountId || params?.code || "");
    const fromDate = typeof params?.from === "string" ? parseDateBoundary(params.from, "start") : undefined;
    const toDate = typeof params?.to === "string" ? parseDateBoundary(params.to, "end") : new Date();

    let account = !isNaN(Number(rawIdOrCode))
      ? await prisma.account.findFirst({ where: { id: Number(rawIdOrCode), companyId } })
      : null;
    if (!account && rawIdOrCode) {
      account = await prisma.account.findFirst({ where: { code: rawIdOrCode, companyId } });
    }
    if (!account) return fail(res, 404, "ACCOUNT_NOT_FOUND", "Account not found for export");

    const openingLines = await prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: account.id,
        ...(fromDate
          ? { entry: { status: "POSTED", date: { lt: fromDate } } }
          : { entry: { status: "POSTED", date: { lte: new Date(0) } } }),
      },
    });

    const dateFilter =
      fromDate && toDate ? { gte: fromDate, lte: toDate } : fromDate ? { gte: fromDate } : toDate ? { lte: toDate } : undefined;

    const lines = await prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: account.id,
        entry: { status: "POSTED", ...(dateFilter ? { date: dateFilter } : {}) },
      },
      include: { entry: true },
      orderBy: { entry: { date: "asc" } },
    });

    const type = canonicalAccountType(account.type);
    const isDebitNature = type === "asset" || type === "expense";
    const openingMovement = openingLines.reduce(
      (sum, line) =>
        sum + (isDebitNature ? Number(line.debit) - Number(line.credit) : Number(line.credit) - Number(line.debit)),
      0,
    );
    const openingBalance = Number(account.openingBalance) + openingMovement;
    let runningBalance = openingBalance;

    const periodLabel = fromDate
      ? `${formatDateDisplay(fromDate)} to ${formatDateDisplay(toDate)}`
      : `Up to ${formatDateDisplay(toDate)}`;
    const filenamePeriod = fromDate
      ? `${formatDateDisplay(fromDate)}_to_${formatDateDisplay(toDate)}`
      : `Up_to_${formatDateDisplay(toDate)}`;
    filenamePrefix = `General_Ledger_${account.code}_${filenamePeriod}`;

    const rows: Array<Array<string | number>> = [];
    const opDr = isDebitNature ? (openingBalance > 0 ? openingBalance : "") : (openingBalance < 0 ? Math.abs(openingBalance) : "");
    const opCr = isDebitNature ? (openingBalance < 0 ? Math.abs(openingBalance) : "") : (openingBalance > 0 ? openingBalance : "");
    const opTag = isDebitNature ? (openingBalance >= 0 ? "Dr" : "Cr") : (openingBalance >= 0 ? "Cr" : "Dr");
    rows.push([
      fromDate ? formatDateDisplay(fromDate) : "-",
      "-",
      "Opening Balance",
      typeof opDr === "number" ? round(opDr) : "",
      typeof opCr === "number" ? round(opCr) : "",
      `${formatCurrencyINR(Math.abs(openingBalance))} ${opTag}`,
    ]);

    let totalDr = 0;
    let totalCr = 0;
    for (const line of lines) {
      const dr = Number(line.debit);
      const cr = Number(line.credit);
      totalDr += dr;
      totalCr += cr;
      runningBalance = Number((runningBalance + (isDebitNature ? dr - cr : cr - dr)).toFixed(2));
      const balTag = isDebitNature ? (runningBalance >= 0 ? "Dr" : "Cr") : (runningBalance >= 0 ? "Cr" : "Dr");
      rows.push([
        formatDateDisplay(new Date(line.entry.date)),
        line.entry.entryNo,
        line.narration || line.entry.narration || "-",
        dr > 0 ? round(dr) : "",
        cr > 0 ? round(cr) : "",
        `${formatCurrencyINR(Math.abs(runningBalance))} ${balTag}`,
      ]);
    }

    const closeTag = isDebitNature ? (runningBalance >= 0 ? "Dr" : "Cr") : (runningBalance >= 0 ? "Cr" : "Dr");
    payload = {
      company,
      meta: {
        title: `General Ledger - ${account.code} ${account.name}`,
        periodLabel,
        filenamePeriod,
        generatedAt: now,
      },
      headers: ["Date", "Voucher #", "Description", "Debit (INR)", "Credit (INR)", "Running Balance"],
      alignments: ["left", "left", "left", "right", "right", "right"],
      columnWidths: [12, 16, 32, 15, 15, 18],
      rows,
      summaryRows: [
        ["", "", "TOTAL & CLOSING BALANCE", round(totalDr), round(totalCr), `${formatCurrencyINR(Math.abs(runningBalance))} ${closeTag}`],
      ],
    };
  } else {
    return fail(res, 400, "INVALID_REPORT_TYPE", `Unsupported report type: ${reportType}`);
  }

  // Format delivery
  if (format === "csv") {
    const buffer = generateCsv(payload);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filenamePrefix}.csv"`);
    return res.status(200).send(buffer);
  }

  if (format === "excel") {
    const buffer = await generateExcel(payload);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filenamePrefix}.xlsx"`);
    return res.status(200).send(buffer);
  }

  // PDF
  const buffer = await generatePdf(payload);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filenamePrefix}.pdf"`);
  return res.status(200).send(buffer);
};
