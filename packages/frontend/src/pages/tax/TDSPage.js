import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { taxService } from "@/services/taxService";
const col = createColumnHelper();
export const TDSPage = () => {
    const [filters, setFilters] = useState({
        from: "2025-04-01",
        to: "2025-04-30",
    });
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["tax-tds", filters],
        queryFn: () => taxService.getTdsSummary(filters),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "TDS Management", subtitle: "Section 194Q monitoring and vendor-wise TDS summary", actions: _jsx(ExportButton, { onExportCSV: () => toast.info("TDS CSV export queued"), onExportExcel: () => toast.info("TDS Excel export queued"), onExportPDF: () => toast.info("Form 16A-style PDF export queued") }) }), _jsx(FilterBar, { filters: [
                    { key: "from", type: "date", label: "From" },
                    { key: "to", type: "date", label: "To" },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({ from: "2025-04-01", to: "2025-04-30" }) }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load TDS summary.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card text-sm", children: [_jsx("div", { className: "text-muted", children: "Vendors Tracked" }), _jsx("div", { className: "font-mono text-lg", children: data?.totals.vendors ?? 0 })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card text-sm", children: [_jsx("div", { className: "text-muted", children: "Purchase Value" }), _jsx("div", { className: "font-mono text-lg", children: formatCurrency(data?.totals.totalPurchases ?? 0) })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card text-sm", children: [_jsx("div", { className: "text-muted", children: "TDS Deducted" }), _jsx("div", { className: "font-mono text-lg text-gold", children: formatCurrency(data?.totals.totalTds ?? 0) })] })] }), _jsx(DataTable, { columns: [
                    col.accessor("vendorName", { header: "Vendor" }),
                    col.accessor("section", { header: "Section" }),
                    col.accessor("thresholdCrossed", {
                        header: "Threshold",
                        cell: (info) => (_jsx("span", { className: `rounded-full px-3 py-1 text-xs ${info.getValue() ? "bg-ruby/10 text-ruby" : "bg-emerald/10 text-emerald"}`, children: info.getValue() ? "Crossed" : "Within Limit" })),
                    }),
                    col.accessor("purchaseAmount", {
                        header: "Purchase Amount",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                    }),
                    col.accessor("tdsRate", { header: "TDS %" }),
                    col.accessor("tdsAmount", {
                        header: "TDS Amount",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                    }),
                    col.accessor("deductedAt", { header: "Deducted At" }),
                    col.accessor("filedAt", { header: "Filed At", cell: (info) => info.getValue() ?? "Pending" }),
                    col.display({
                        id: "actions",
                        header: "Action",
                        cell: (info) => (_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => toast.success(`TDS certificate generated for ${info.row.original.vendorName}`), type: "button", children: "Generate 16A" })),
                    }),
                ], data: data?.rows ?? [], loading: isLoading })] }));
};
