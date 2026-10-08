import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService } from "@/services/reportsService";
const pad2 = (value) => String(value).padStart(2, "0");
const localDateInputValue = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
export const ProfitLossPage = () => {
    const today = new Date();
    const [filters, setFilters] = useState({
        from: localDateInputValue(firstDayOfMonth(today)),
        to: localDateInputValue(today),
        compare: "prior_year",
    });
    const { exportReport } = useExport();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["profit-loss", filters],
        queryFn: () => reportsService.getProfitLoss(filters),
    });
    const chartData = [
        { label: "Revenue", amount: data?.revenue?.total ?? 0 },
        { label: "COGS", amount: data?.cogs?.total ?? 0 },
        { label: "Expenses", amount: data?.expenses?.total ?? 0 },
        { label: "Net Profit", amount: data?.netProfit ?? 0 },
    ];
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Profit & Loss Statement", subtitle: "Revenue -> COGS -> Gross Profit -> Expenses -> Net Profit", actions: _jsx(ExportButton, { onExportCSV: () => void exportReport("profit-loss", filters, "csv"), onExportExcel: () => void exportReport("profit-loss", filters, "excel"), onExportPDF: () => void exportReport("profit-loss", filters, "pdf") }) }), _jsx(FilterBar, { filters: [
                    { key: "from", type: "date", label: "From" },
                    { key: "to", type: "date", label: "To" },
                    {
                        key: "compare",
                        type: "select",
                        label: "Comparison",
                        options: [
                            { label: "Prior Year", value: "prior_year" },
                            { label: "Prior Period", value: "prior_period" },
                        ],
                    },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({
                    from: localDateInputValue(firstDayOfMonth(new Date())),
                    to: localDateInputValue(new Date()),
                    compare: "prior_year",
                }) }), _jsx("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: isLoading ? (_jsx("div", { children: "Loading report..." })) : isError ? (_jsxs("div", { className: "rounded border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["P&L report failed to load.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : (_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("details", { open: true, children: [_jsx("summary", { className: "cursor-pointer font-display text-lg font-semibold", children: "Revenue" }), (data?.revenue?.accounts ?? []).map((row) => (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: row.name }), _jsx("span", { className: "font-mono text-emerald", children: formatCurrency(row.amount) })] }, row.code))), _jsxs("div", { className: "mt-1 flex justify-between border-t border-border pt-1 font-semibold", children: [_jsx("span", { children: "Total Revenue" }), _jsx("span", { className: "font-mono text-emerald", children: formatCurrency(data?.revenue?.total ?? 0) })] })] }), _jsxs("details", { open: true, children: [_jsx("summary", { className: "cursor-pointer font-display text-lg font-semibold", children: "Cost of Goods" }), (data?.cogs?.accounts ?? []).map((row) => (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: row.name }), _jsx("span", { className: "font-mono text-ruby", children: formatCurrency(row.amount) })] }, row.code))), _jsxs("div", { className: "mt-1 flex justify-between border-t border-border pt-1 font-semibold", children: [_jsx("span", { children: "Total COGS" }), _jsx("span", { className: "font-mono text-ruby", children: formatCurrency(data?.cogs?.total ?? 0) })] })] }), _jsxs("div", { className: "flex justify-between rounded bg-gold-tint px-3 py-2 font-medium", children: [_jsx("span", { children: "Gross Profit" }), _jsx("span", { className: "font-mono text-gold", children: formatCurrency(data?.grossProfit ?? 0) })] }), _jsxs("details", { open: true, children: [_jsx("summary", { className: "cursor-pointer font-display text-lg font-semibold", children: "Expenses" }), (data?.expenses?.accounts ?? []).map((row) => (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: row.name }), _jsx("span", { className: "font-mono text-ruby", children: formatCurrency(row.amount) })] }, row.code))), _jsxs("div", { className: "mt-1 flex justify-between border-t border-border pt-1 font-semibold", children: [_jsx("span", { children: "Total Expenses" }), _jsx("span", { className: "font-mono text-ruby", children: formatCurrency(data?.expenses?.total ?? 0) })] })] }), _jsxs("div", { className: "flex justify-between rounded bg-charcoal px-3 py-2 font-semibold text-white", children: [_jsx("span", { children: "Net Profit" }), _jsx("span", { className: "font-mono text-gold-light", children: formatCurrency(data?.netProfit ?? 0) })] })] }), _jsx("div", { className: "h-80", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "label" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "amount", fill: "#C9922A" })] }) }) })] })) })] }));
};
