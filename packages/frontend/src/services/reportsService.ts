import { api } from "@/lib/axios";

export interface TrialBalanceAccountRow {
  id?: number;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  previousYear: number;
}

export interface TrialBalanceResponse {
  asOf: string;
  accounts: TrialBalanceAccountRow[];
  totalDr: number;
  totalCr: number;
  isBalanced: boolean;
}

export interface ProfitLossResponse {
  from: string;
  to: string;
  compare: string;
  revenue: { total: number; accounts: Array<{ id?: number; code: string; name: string; amount: number }> };
  cogs: { total: number; accounts: Array<{ id?: number; code: string; name: string; amount: number }> };
  grossProfit: number;
  expenses: { total: number; accounts: Array<{ id?: number; code: string; name: string; amount: number }> };
  netProfit: number;
}

export interface BalanceSheetResponse {
  asOf: string;
  assets: {
    current: Array<{ id?: number; code?: string; name: string; amount: number }>;
    nonCurrent: Array<{ id?: number; code?: string; name: string; amount: number }>;
  };
  liabilities: {
    current: Array<{ id?: number; code?: string; name: string; amount: number }>;
    nonCurrent: Array<{ id?: number; code?: string; name: string; amount: number }>;
  };
  equity: Array<{ id?: number; code?: string; name: string; amount: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}

export interface CashFlowResponse {
  from: string;
  to: string;
  operating: {
    netProfit: number;
    adjustments: Array<{ label: string; amount: number }>;
    net: number;
  };
  investing: {
    items: Array<{ label: string; amount: number }>;
    net: number;
  };
  financing: {
    items: Array<{ label: string; amount: number }>;
    net: number;
  };
  netChange: number;
  openingCash: number;
  closingCash: number;
}

export interface DayBookResponse {
  date: string;
  sales: Array<{ refNo: string; party?: string; amount: number; narration?: string; mode?: string }>;
  purchases: Array<{ refNo: string; party?: string; amount: number; narration?: string; mode?: string }>;
  receipts: Array<{ refNo: string; party?: string; amount: number; narration?: string; mode?: string }>;
  payments: Array<{ refNo: string; party?: string; amount: number; narration?: string; mode?: string }>;
  journals: Array<{ refNo: string; party?: string; amount: number; narration?: string; mode?: string }>;
  totals: {
    totalSales: number;
    totalPurchases: number;
    totalReceipts: number;
    totalPayments: number;
  };
}

export interface AgeingInvoiceRow {
  id: number;
  invoiceNo: string;
  date: string;
  dueDate: string;
  currency: string;
  originalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  ageDays: number;
  bucket: string;
}

export interface AgeingCustomerRow {
  customerId: number;
  customerCode: string;
  customerName: string;
  category: string;
  city: string;
  currency: string;
  totalOutstanding: number;
  [bucket: string]: any;
  invoices?: AgeingInvoiceRow[];
}

export interface AgeingBillRow {
  id: number;
  billNo: string;
  date: string;
  dueDate: string;
  currency: string;
  originalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  ageDays: number;
  bucket: string;
}

export interface AgeingSupplierRow {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  category: string;
  city: string;
  currency: string;
  totalOutstanding: number;
  [bucket: string]: any;
  bills?: AgeingBillRow[];
}

export interface AgeingResponse<R> {
  asOf: string;
  view: "summary" | "detail";
  buckets: string[];
  rows: R[];
  grandTotals: Record<string, number>;
  reconciliation: { totalFromAgeing: number; note: string };
}

export interface AgeingParams {
  asOf?: string;
  search?: string;
  category?: string;
  city?: string;
  status?: string;
  view?: "summary" | "detail";
  buckets?: string; // comma-separated thresholds e.g. "30,60,90,120"
}

type BalanceRow = { code: string; name: string; amount: number };

const round = (value: number) => Number(value.toFixed(2));
const low = (value: string) => String(value ?? "").trim().toLowerCase();

const classifyType = (type: string) => {
  const value = low(type);
  if (value === "asset" || value === "assets") return "asset" as const;
  if (value === "liability" || value === "liabilities") return "liability" as const;
  if (value === "equity" || value === "capital") return "equity" as const;
  if (value === "income" || value === "revenue") return "income" as const;
  if (value === "expense" || value === "expenses") return "expense" as const;
  return "asset" as const;
};

const isNonCurrent = (name: string) =>
  /(fixed|property|plant|equipment|non[-\s]?current|long[-\s]?term|investment|loan)/i.test(name);

const ledgerSideBalance = (row: TrialBalanceAccountRow) => {
  const debit = Number(row.debit ?? 0);
  const credit = Number(row.credit ?? 0);
  const type = classifyType(row.type);
  if (type === "asset" || type === "expense") return round(debit - credit);
  return round(credit - debit);
};

const buildBalanceSheetFromTrialBalance = (tb: TrialBalanceResponse): BalanceSheetResponse => {
  const assets: BalanceSheetResponse["assets"] = { current: [], nonCurrent: [] };
  const liabilities: BalanceSheetResponse["liabilities"] = { current: [], nonCurrent: [] };
  const equity: BalanceSheetResponse["equity"] = [];

  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const row of tb.accounts ?? []) {
    const type = classifyType(row.type);
    const amount = ledgerSideBalance(row);
    if (Math.abs(amount) < 0.005) continue;

    const label = `${row.code} - ${row.name}`;
    if (type === "asset") {
      if (isNonCurrent(row.name)) assets.nonCurrent.push({ name: label, amount });
      else assets.current.push({ name: label, amount });
      continue;
    }
    if (type === "liability") {
      if (isNonCurrent(row.name)) liabilities.nonCurrent.push({ name: label, amount });
      else liabilities.current.push({ name: label, amount });
      continue;
    }
    if (type === "equity") {
      equity.push({ name: label, amount });
      continue;
    }
    if (type === "income") {
      incomeTotal += amount;
      continue;
    }
    if (type === "expense") {
      expenseTotal += amount;
    }
  }

  const currentEarnings = round(incomeTotal - expenseTotal);
  if (Math.abs(currentEarnings) >= 0.01) {
    equity.push({ name: "Current Period Earnings", amount: currentEarnings });
  }

  const totalAssets = round([...assets.current, ...assets.nonCurrent].reduce((sum, row) => sum + row.amount, 0));
  const totalLiabilities = round([...liabilities.current, ...liabilities.nonCurrent].reduce((sum, row) => sum + row.amount, 0));
  const totalEquity = round(equity.reduce((sum, row) => sum + row.amount, 0));

  return {
    asOf: tb.asOf,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) <= 0.01,
  };
};

const buildProfitLossFromTrialBalances = (
  closingTb: TrialBalanceResponse,
  openingTb?: TrialBalanceResponse | null,
  from?: string,
  to?: string,
  compare = "none",
): ProfitLossResponse => {
  const openingMap = new Map<string, TrialBalanceAccountRow>();
  for (const row of openingTb?.accounts ?? []) openingMap.set(row.code, row);

  const revenue: BalanceRow[] = [];
  const cogs: BalanceRow[] = [];
  const expenses: BalanceRow[] = [];

  for (const row of closingTb.accounts ?? []) {
    const type = classifyType(row.type);
    if (type !== "income" && type !== "expense") continue;

    const opening = openingMap.get(row.code);
    const closeBal = ledgerSideBalance(row);
    const openBal = opening ? ledgerSideBalance(opening) : 0;
    const movement = round(closeBal - openBal);
    if (movement <= 0) continue;

    const item = { code: row.code, name: row.name, amount: movement };
    if (type === "income") {
      revenue.push(item);
      continue;
    }

    const text = low(row.name);
    if (/(purchase|cost of goods|cogs|material|direct expense)/i.test(text)) cogs.push(item);
    else expenses.push(item);
  }

  const revenueTotal = round(revenue.reduce((sum, row) => sum + row.amount, 0));
  const cogsTotal = round(cogs.reduce((sum, row) => sum + row.amount, 0));
  const expensesTotal = round(expenses.reduce((sum, row) => sum + row.amount, 0));
  const grossProfit = round(revenueTotal - cogsTotal);
  const netProfit = round(grossProfit - expensesTotal);

  return {
    from: from ?? closingTb.asOf,
    to: to ?? closingTb.asOf,
    compare,
    revenue: { total: revenueTotal, accounts: revenue },
    cogs: { total: cogsTotal, accounts: cogs },
    grossProfit,
    expenses: { total: expensesTotal, accounts: expenses },
    netProfit,
  };
};

const previousDateString = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const reportsService = {
  async getGeneralLedger(params: { accountId?: number | string; code?: string; from?: string; to?: string }) {
    const response = await api.get("/ledger", { params });
    return response.data.data;
  },
  async getReceivablesAgeing(params: AgeingParams): Promise<AgeingResponse<AgeingCustomerRow>> {
    const response = await api.get("/reports/ageing/receivables", { params });
    return response.data.data;
  },
  getReceivablesAgeingCsvUrl(params: AgeingParams): string {
    const qs = new URLSearchParams({ ...params, export: "csv" } as any).toString();
    return `${api.defaults.baseURL}/reports/ageing/receivables?${qs}`;
  },
  async exportReceivablesAgeing(params: AgeingParams): Promise<void> {
    const response = await api.get("/reports/ageing/receivables", {
      params: { ...params, export: "csv" },
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receivables-ageing-${params.asOf ?? "today"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  async getPayablesAgeing(params: AgeingParams): Promise<AgeingResponse<AgeingSupplierRow>> {
    const response = await api.get("/reports/ageing/payables", { params });
    return response.data.data;
  },
  async exportPayablesAgeing(params: AgeingParams): Promise<void> {
    const response = await api.get("/reports/ageing/payables", {
      params: { ...params, export: "csv" },
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payables-ageing-${params.asOf ?? "today"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  async getTrialBalance(params: { from?: string; to?: string; date?: string; compare?: string }) {
    const response = await api.get("/reports/trial-balance", { params });
    return response.data.data as TrialBalanceResponse;
  },
  async getProfitLoss(params: { from?: string; to?: string; compare?: string }) {
    const toDate = params.to;
    const fromDate = params.from;
    const closingTbRes = await api.get("/reports/trial-balance", { params: { date: toDate } });
    const closingTb = closingTbRes.data.data as TrialBalanceResponse;

    let openingTb: TrialBalanceResponse | null = null;
    const fromPrev = fromDate ? previousDateString(fromDate) : undefined;
    if (fromPrev) {
      const openingTbRes = await api.get("/reports/trial-balance", { params: { date: fromPrev } });
      openingTb = openingTbRes.data.data as TrialBalanceResponse;
    }

    return buildProfitLossFromTrialBalances(closingTb, openingTb, fromDate, toDate, params.compare ?? "none");
  },
  async getBalanceSheet(params: { date?: string }) {
    const trialRes = await api.get("/reports/trial-balance", { params: { date: params.date } });
    const tb = trialRes.data.data as TrialBalanceResponse;
    return buildBalanceSheetFromTrialBalance(tb);
  },
  async getCashFlow(params: { from?: string; to?: string }) {
    const response = await api.get("/reports/cash-flow", { params });
    return response.data.data as CashFlowResponse;
  },
  async getDayBook(params: { date?: string }) {
    const response = await api.get("/reports/day-book", { params });
    return response.data.data as DayBookResponse;
  },
};
