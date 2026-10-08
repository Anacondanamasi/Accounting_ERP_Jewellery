import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrintableWrapper } from "@/components/shared/PrintableWrapper";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService } from "@/services/reportsService";
const col = createColumnHelper();
const pad2 = (value) => String(value).padStart(2, "0");
const localDateInputValue = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const LedgerSection = ({ title, rows, }) => (_jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-xl font-semibold", children: title }), _jsx(DataTable, { columns: [
                col.accessor("refNo", { header: "Ref No" }),
                col.accessor("party", { header: "Party", cell: (info) => info.getValue() ?? "-" }),
                col.accessor("narration", { header: "Narration", cell: (info) => info.getValue() ?? "-" }),
                col.accessor("mode", { header: "Mode", cell: (info) => info.getValue() ?? "-" }),
                col.accessor("amount", {
                    header: "Amount",
                    cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue() ?? 0) }),
                }),
            ], data: rows })] }));
export const DayBookPage = () => {
    const [date, setDate] = useState(localDateInputValue(new Date()));
    const { exportReport } = useExport();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["day-book", date],
        queryFn: () => reportsService.getDayBook({ date }),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Day Book", subtitle: "All transactions grouped by type for selected date", actions: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { className: "h-10 rounded border border-border px-3 text-sm", type: "date", value: date, onChange: (event) => setDate(event.target.value) }), _jsx(ExportButton, { onExportCSV: () => void exportReport("day-book", { date }, "csv"), onExportExcel: () => void exportReport("day-book", { date }, "excel"), onExportPDF: () => void exportReport("day-book", { date }, "pdf") })] }) }), isLoading ? (_jsx("div", { className: "rounded-card bg-card p-6 shadow-card", children: "Loading day book..." })) : isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Day Book failed to load.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : (_jsxs(PrintableWrapper, { children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card", children: [_jsx("div", { className: "text-xs text-muted", children: "Total Sales" }), _jsx("div", { className: "font-mono text-lg text-emerald", children: formatCurrency(data?.totals.totalSales ?? 0) })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card", children: [_jsx("div", { className: "text-xs text-muted", children: "Total Purchases" }), _jsx("div", { className: "font-mono text-lg text-ruby", children: formatCurrency(data?.totals.totalPurchases ?? 0) })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card", children: [_jsx("div", { className: "text-xs text-muted", children: "Total Receipts" }), _jsx("div", { className: "font-mono text-lg text-emerald", children: formatCurrency(data?.totals.totalReceipts ?? 0) })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card", children: [_jsx("div", { className: "text-xs text-muted", children: "Total Payments" }), _jsx("div", { className: "font-mono text-lg text-ruby", children: formatCurrency(data?.totals.totalPayments ?? 0) })] })] }), _jsxs("div", { className: "grid gap-4 xl:grid-cols-2", children: [_jsx(LedgerSection, { title: "Sales", rows: data?.sales ?? [] }), _jsx(LedgerSection, { title: "Purchases", rows: data?.purchases ?? [] }), _jsx(LedgerSection, { title: "Receipts", rows: data?.receipts ?? [] }), _jsx(LedgerSection, { title: "Payments", rows: data?.payments ?? [] })] }), _jsx(LedgerSection, { title: "Journals", rows: data?.journals ?? [] })] }))] }));
};
