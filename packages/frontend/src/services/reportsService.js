import { api } from "@/lib/axios";
const round = (value) => Number(value.toFixed(2));
const low = (value) => String(value ?? "").trim().toLowerCase();
const classifyType = (type) => {
    const value = low(type);
    if (value === "asset" || value === "assets")
        return "asset";
    if (value === "liability" || value === "liabilities")
        return "liability";
    if (value === "equity" || value === "capital")
        return "equity";
    if (value === "income" || value === "revenue")
        return "income";
    if (value === "expense" || value === "expenses")
        return "expense";
    return "asset";
};
const isNonCurrent = (name) => /(fixed|property|plant|equipment|non[-\s]?current|long[-\s]?term|investment|loan)/i.test(name);
const ledgerSideBalance = (row) => {
    const debit = Number(row.debit ?? 0);
    const credit = Number(row.credit ?? 0);
    const type = classifyType(row.type);
    if (type === "asset" || type === "expense")
        return round(debit - credit);
    return round(credit - debit);
};
const buildBalanceSheetFromTrialBalance = (tb) => {
    const assets = { current: [], nonCurrent: [] };
    const liabilities = { current: [], nonCurrent: [] };
    const equity = [];
    let incomeTotal = 0;
    let expenseTotal = 0;
    for (const row of tb.accounts ?? []) {
        const type = classifyType(row.type);
        const amount = ledgerSideBalance(row);
        if (Math.abs(amount) < 0.005)
            continue;
        const label = `${row.code} - ${row.name}`;
        if (type === "asset") {
            if (isNonCurrent(row.name))
                assets.nonCurrent.push({ name: label, amount });
            else
                assets.current.push({ name: label, amount });
            continue;
        }
        if (type === "liability") {
            if (isNonCurrent(row.name))
                liabilities.nonCurrent.push({ name: label, amount });
            else
                liabilities.current.push({ name: label, amount });
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
const buildProfitLossFromTrialBalances = (closingTb, openingTb, from, to, compare = "none") => {
    const openingMap = new Map();
    for (const row of openingTb?.accounts ?? [])
        openingMap.set(row.code, row);
    const revenue = [];
    const cogs = [];
    const expenses = [];
    for (const row of closingTb.accounts ?? []) {
        const type = classifyType(row.type);
        if (type !== "income" && type !== "expense")
            continue;
        const opening = openingMap.get(row.code);
        const closeBal = ledgerSideBalance(row);
        const openBal = opening ? ledgerSideBalance(opening) : 0;
        const movement = round(closeBal - openBal);
        if (movement <= 0)
            continue;
        const item = { code: row.code, name: row.name, amount: movement };
        if (type === "income") {
            revenue.push(item);
            continue;
        }
        const text = low(row.name);
        if (/(purchase|cost of goods|cogs|material|direct expense)/i.test(text))
            cogs.push(item);
        else
            expenses.push(item);
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
const previousDateString = (value) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime()))
        return undefined;
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
export const reportsService = {
    async getGeneralLedger(params) {
        const response = await api.get("/ledger", { params });
        return response.data.data;
    },
    async getReceivablesAgeing(params) {
        const response = await api.get("/reports/ageing/receivables", { params });
        return response.data.data;
    },
    async getReceivablesAgeingCsvUrl(params) {
        const qs = new URLSearchParams({ ...params, export: "csv" }).toString();
        return `${api.defaults.baseURL}/reports/ageing/receivables?${qs}`;
    },
    async exportReceivablesAgeing(params) {
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
    async getPayablesAgeing(params) {
        const response = await api.get("/reports/ageing/payables", { params });
        return response.data.data;
    },
    async exportPayablesAgeing(params) {
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
    async getTrialBalance(params) {
        const response = await api.get("/reports/trial-balance", { params });
        return response.data.data;
    },
    async getProfitLoss(params) {
        const toDate = params.to;
        const fromDate = params.from;
        const closingTbRes = await api.get("/reports/trial-balance", { params: { date: toDate } });
        const closingTb = closingTbRes.data.data;
        let openingTb = null;
        const fromPrev = fromDate ? previousDateString(fromDate) : undefined;
        if (fromPrev) {
            const openingTbRes = await api.get("/reports/trial-balance", { params: { date: fromPrev } });
            openingTb = openingTbRes.data.data;
        }
        return buildProfitLossFromTrialBalances(closingTb, openingTb, fromDate, toDate, params.compare ?? "none");
    },
    async getBalanceSheet(params) {
        const trialRes = await api.get("/reports/trial-balance", { params: { date: params.date } });
        const tb = trialRes.data.data;
        return buildBalanceSheetFromTrialBalance(tb);
    },
    async getCashFlow(params) {
        const response = await api.get("/reports/cash-flow", { params });
        return response.data.data;
    },
    async getDayBook(params) {
        const response = await api.get("/reports/day-book", { params });
        return response.data.data;
    },
};
