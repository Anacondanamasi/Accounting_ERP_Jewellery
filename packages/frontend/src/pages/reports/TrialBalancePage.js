import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService } from "@/services/reportsService";
const col = createColumnHelper();
export const TrialBalancePage = () => {
    const [filters, setFilters] = useState({
        date: new Date().toISOString().slice(0, 10),
        compare: "prior_year",
        onlyWithBalance: "true",
        view: "account",
    });
    const { exportReport } = useExport();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["trial-balance", filters],
        queryFn: () => reportsService.getTrialBalance({
            date: filters.date,
            compare: filters.compare,
        }),
    });
    const rows = useMemo(() => {
        const source = data?.accounts ?? [];
        return filters.onlyWithBalance === "true"
            ? source.filter((row) => Math.abs(row.debit - row.credit) > 0)
            : source;
    }, [data?.accounts, filters.onlyWithBalance]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Trial Balance", subtitle: "As-of view with debit-credit validation", actions: _jsx(ExportButton, { onExportCSV: () => void exportReport("trial-balance", filters, "csv"), onExportExcel: () => void exportReport("trial-balance", filters, "excel"), onExportPDF: () => void exportReport("trial-balance", filters, "pdf") }) }), _jsx(FilterBar, { filters: [
                    { key: "date", type: "date", label: "As of Date" },
                    {
                        key: "compare",
                        type: "select",
                        label: "Comparison",
                        options: [{ label: "Prior Year", value: "prior_year" }],
                    },
                    {
                        key: "onlyWithBalance",
                        type: "select",
                        label: "Rows",
                        options: [
                            { label: "Only accounts with balance", value: "true" },
                            { label: "Show all accounts", value: "false" },
                        ],
                    },
                    {
                        key: "view",
                        type: "select",
                        label: "View",
                        options: [
                            { label: "Account wise detail", value: "account" },
                            { label: "Group-wise total", value: "group" },
                        ],
                    },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({
                    date: new Date().toISOString().slice(0, 10),
                    compare: "prior_year",
                    onlyWithBalance: "true",
                    view: "account",
                }) }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Trial Balance failed to load.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsx(DataTable, { columns: [
                    col.accessor("code", { header: "Code" }),
                    col.accessor("name", { header: "Account" }),
                    col.accessor("type", { header: "Type" }),
                    col.accessor("debit", {
                        header: "Debit",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                    }),
                    col.accessor("credit", {
                        header: "Credit",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                    }),
                    col.accessor("previousYear", {
                        header: "Prev Year",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                    }),
                ], data: rows, loading: isLoading }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Total Dr" }), _jsx("span", { className: "font-mono", children: formatCurrency(data?.totalDr ?? 0) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Total Cr" }), _jsx("span", { className: "font-mono", children: formatCurrency(data?.totalCr ?? 0) })] }), _jsx("div", { className: `mt-2 font-medium ${data?.isBalanced ? "text-emerald" : "text-ruby"}`, children: data?.isBalanced ? "Balanced: Total Dr equals Total Cr" : "Not balanced: Total Dr does not equal Total Cr" })] })] }));
};
