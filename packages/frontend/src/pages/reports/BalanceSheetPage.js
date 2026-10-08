import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService } from "@/services/reportsService";
const pad2 = (value) => String(value).padStart(2, "0");
const localDateInputValue = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const sectionTotal = (items) => items.reduce((sum, row) => sum + row.amount, 0);
const LedgerSection = ({ title, items, }) => (_jsxs("details", { open: true, children: [_jsx("summary", { className: "cursor-pointer font-medium", children: title }), items.map((row) => (_jsxs("div", { className: "mt-1 flex justify-between", children: [_jsx("span", { children: row.name }), _jsx("span", { className: "font-mono", children: formatCurrency(row.amount) })] }, row.name))), _jsxs("div", { className: "mt-1 flex justify-between border-t border-border pt-1 font-semibold", children: [_jsxs("span", { children: ["Total ", title] }), _jsx("span", { className: "font-mono", children: formatCurrency(sectionTotal(items)) })] })] }));
export const BalanceSheetPage = () => {
    const [filters, setFilters] = useState({
        date: localDateInputValue(new Date()),
    });
    const { exportReport } = useExport();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["balance-sheet", filters],
        queryFn: () => reportsService.getBalanceSheet(filters),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Balance Sheet", subtitle: "Assets = Liabilities + Equity check", actions: _jsx(ExportButton, { onExportCSV: () => void exportReport("balance-sheet", filters, "csv"), onExportExcel: () => void exportReport("balance-sheet", filters, "excel"), onExportPDF: () => void exportReport("balance-sheet", filters, "pdf") }) }), _jsx(FilterBar, { filters: [{ key: "date", type: "date", label: "As of Date" }], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({ date: localDateInputValue(new Date()) }) }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Balance Sheet failed to load.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsxs("div", { className: "grid gap-4 xl:grid-cols-2", children: [_jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-2xl font-semibold", children: "Assets" }), isLoading ? (_jsx("div", { children: "Loading..." })) : (_jsxs("div", { className: "space-y-3 text-sm", children: [_jsx(LedgerSection, { title: "Current Assets", items: data?.assets.current ?? [] }), _jsx(LedgerSection, { title: "Non-current Assets", items: data?.assets.nonCurrent ?? [] }), _jsxs("div", { className: "flex justify-between rounded bg-gold-tint px-3 py-2 font-semibold", children: [_jsx("span", { children: "Total Assets" }), _jsx("span", { className: "font-mono text-gold", children: formatCurrency(data?.totalAssets ?? 0) })] })] }))] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-2xl font-semibold", children: "Liabilities & Equity" }), isLoading ? (_jsx("div", { children: "Loading..." })) : (_jsxs("div", { className: "space-y-3 text-sm", children: [_jsx(LedgerSection, { title: "Current Liabilities", items: data?.liabilities.current ?? [] }), _jsx(LedgerSection, { title: "Non-current Liabilities", items: data?.liabilities.nonCurrent ?? [] }), _jsx(LedgerSection, { title: "Equity", items: data?.equity ?? [] }), _jsxs("div", { className: "flex justify-between rounded bg-charcoal px-3 py-2 font-semibold text-white", children: [_jsx("span", { children: "Total Liabilities + Equity" }), _jsx("span", { className: "font-mono text-gold-light", children: formatCurrency((data?.totalLiabilities ?? 0) + (data?.totalEquity ?? 0)) })] })] }))] })] }), !isLoading && (_jsx("div", { className: `rounded-card border p-4 text-sm ${data?.isBalanced ? "border-emerald/30 bg-emerald/5 text-emerald" : "border-ruby/30 bg-ruby/5 text-ruby"}`, children: data?.isBalanced
                    ? "Balance check passed: Assets match Liabilities + Equity."
                    : "Balance check failed: Please review account mappings." }))] }));
};
