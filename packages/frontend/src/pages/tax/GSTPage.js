import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { taxService } from "@/services/taxService";
const b2bCol = createColumnHelper();
const hsnCol = createColumnHelper();
const cdnCol = createColumnHelper();
const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
};
export const GSTPage = () => {
    const [filters, setFilters] = useState({
        month: "4",
        year: "2025",
    });
    const month = Number(filters.month || "4");
    const year = Number(filters.year || "2025");
    const { data: gstr1, isLoading: gstr1Loading, isError: gstr1Error, refetch: refetchGstr1, } = useQuery({
        queryKey: ["tax-gstr1", month, year],
        queryFn: () => taxService.getGstr1({ month, year }),
    });
    const { data: gstr3b, isLoading: gstr3bLoading, isError: gstr3bError, refetch: refetchGstr3b, } = useQuery({
        queryKey: ["tax-gstr3b", month, year],
        queryFn: () => taxService.getGstr3b({ month, year }),
    });
    const calendar = gstr1?.calendar ?? [];
    const dueSoon = useMemo(() => calendar.filter((row) => row.status === "UPCOMING").slice(0, 3), [calendar]);
    const exportReturn = async (returnType, format) => {
        try {
            const blob = await taxService.exportGstReturn({ returnType, format });
            downloadBlob(blob, `${returnType}.${format === "excel" ? "xlsx" : "json"}`);
            toast.success(`${returnType.toUpperCase()} exported`);
        }
        catch {
            toast.error("Export failed");
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "GST Returns", subtitle: "GSTR-1 and GSTR-3B summaries with filing-ready exports", actions: _jsx(ExportButton, { onExportCSV: () => void exportReturn("gstr1", "json"), onExportExcel: () => void exportReturn("gstr1", "excel"), onExportPDF: () => void exportReturn("gstr3b", "json") }) }), _jsx(FilterBar, { filters: [
                    {
                        key: "month",
                        type: "select",
                        label: "Month",
                        options: [
                            { label: "Jan", value: "1" },
                            { label: "Feb", value: "2" },
                            { label: "Mar", value: "3" },
                            { label: "Apr", value: "4" },
                            { label: "May", value: "5" },
                            { label: "Jun", value: "6" },
                            { label: "Jul", value: "7" },
                            { label: "Aug", value: "8" },
                            { label: "Sep", value: "9" },
                            { label: "Oct", value: "10" },
                            { label: "Nov", value: "11" },
                            { label: "Dec", value: "12" },
                        ],
                    },
                    { key: "year", type: "search", label: "Year" },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({ month: "4", year: "2025" }) }), gstr1Error || gstr3bError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load GST data.", _jsx("button", { className: "ml-3 underline", onClick: () => { void refetchGstr1(); void refetchGstr3b(); }, type: "button", children: "Retry" })] })) : null, _jsxs("div", { className: "grid gap-4 lg:grid-cols-3", children: [_jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card lg:col-span-2", children: [_jsx("h3", { className: "mb-3 font-display text-xl font-semibold", children: "Return Calendar" }), !calendar.length ? (_jsx("p", { className: "text-sm text-muted", children: "No due dates available." })) : (_jsx("div", { className: "grid gap-3 md:grid-cols-2", children: calendar.map((entry) => (_jsxs("div", { className: "rounded border border-border p-3 text-sm", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-medium", children: entry.returnType }), _jsx("span", { className: `rounded-full px-3 py-1 text-xs ${entry.status === "FILED" ? "bg-emerald/10 text-emerald" : entry.status === "OVERDUE" ? "bg-ruby/10 text-ruby" : "bg-gold/10 text-gold"}`, children: entry.status })] }), _jsx("div", { className: "mt-1 text-muted", children: entry.periodLabel }), _jsxs("div", { className: "font-mono", children: ["Due: ", entry.dueDate] })] }, entry.id))) }))] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-3 font-display text-xl font-semibold", children: "Upcoming" }), _jsxs("div", { className: "space-y-2 text-sm", children: [dueSoon.map((entry) => (_jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("div", { className: "font-medium", children: entry.returnType }), _jsx("div", { children: entry.periodLabel }), _jsx("div", { className: "font-mono", children: entry.dueDate })] }, entry.id))), dueSoon.length === 0 ? _jsx("p", { className: "text-muted", children: "No upcoming dues." }) : null] })] })] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-2xl font-semibold", children: "GSTR-1" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => void exportReturn("gstr1", "json"), type: "button", children: "Export JSON" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => void exportReturn("gstr1", "excel"), type: "button", children: "Download Excel" })] })] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("div", { className: "rounded border border-border p-3 text-sm", children: [_jsx("div", { className: "text-muted", children: "Taxable Value" }), _jsx("div", { className: "font-mono text-lg", children: formatCurrency(gstr1?.totals.taxableValue ?? 0) })] }), _jsxs("div", { className: "rounded border border-border p-3 text-sm", children: [_jsx("div", { className: "text-muted", children: "Tax Amount" }), _jsx("div", { className: "font-mono text-lg", children: formatCurrency(gstr1?.totals.taxAmount ?? 0) })] }), _jsxs("div", { className: "rounded border border-border p-3 text-sm", children: [_jsx("div", { className: "text-muted", children: "Invoices" }), _jsx("div", { className: "font-mono text-lg", children: gstr1?.totals.invoiceCount ?? 0 })] })] }), _jsxs("div", { className: "mt-4", children: [_jsx("h4", { className: "mb-2 font-display text-lg font-semibold", children: "B2B Invoices" }), _jsx(DataTable, { columns: [
                                    b2bCol.accessor("invoiceNo", { header: "Invoice" }),
                                    b2bCol.accessor("invoiceDate", { header: "Date" }),
                                    b2bCol.accessor("customerName", { header: "Customer" }),
                                    b2bCol.accessor("gstin", { header: "GSTIN" }),
                                    b2bCol.accessor("taxableValue", { header: "Taxable", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                                    b2bCol.accessor("taxAmount", { header: "Tax", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                                    b2bCol.accessor("total", { header: "Total", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                                ], data: gstr1?.b2b ?? [], loading: gstr1Loading })] }), _jsxs("div", { className: "mt-4 grid gap-4 xl:grid-cols-2", children: [_jsxs("div", { children: [_jsx("h4", { className: "mb-2 font-display text-lg font-semibold", children: "HSN/SAC Summary" }), _jsx(DataTable, { columns: [
                                            hsnCol.accessor("hsnCode", { header: "HSN" }),
                                            hsnCol.accessor("description", { header: "Description" }),
                                            hsnCol.accessor("taxableValue", { header: "Taxable", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                                            hsnCol.accessor("gstRate", { header: "GST %" }),
                                            hsnCol.accessor("taxAmount", { header: "Tax", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                                        ], data: gstr1?.hsn ?? [], loading: gstr1Loading })] }), _jsxs("div", { children: [_jsx("h4", { className: "mb-2 font-display text-lg font-semibold", children: "CDN (Credit/Debit Notes)" }), _jsx(DataTable, { columns: [
                                            cdnCol.accessor("noteNo", { header: "Note No" }),
                                            cdnCol.accessor("noteType", { header: "Type" }),
                                            cdnCol.accessor("customerName", { header: "Customer" }),
                                            cdnCol.accessor("taxableValue", { header: "Taxable", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                                            cdnCol.accessor("taxAmount", { header: "Tax", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                                        ], data: gstr1?.cdn ?? [], loading: gstr1Loading })] })] })] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-2xl font-semibold", children: "GSTR-3B" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => void exportReturn("gstr3b", "json"), type: "button", children: "Export for GST Portal" })] }), gstr3bLoading ? (_jsx("p", { className: "text-sm text-muted", children: "Loading GSTR-3B..." })) : (_jsxs("div", { className: "grid gap-4 md:grid-cols-3 text-sm", children: [_jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("div", { className: "font-medium", children: "Outward Supplies" }), _jsxs("div", { className: "mt-1 flex justify-between", children: [_jsx("span", { children: "Taxable" }), _jsx("span", { className: "font-mono", children: formatCurrency(gstr3b?.outward.taxableValue ?? 0) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Tax" }), _jsx("span", { className: "font-mono", children: formatCurrency(gstr3b?.outward.taxAmount ?? 0) })] })] }), _jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("div", { className: "font-medium", children: "ITC Summary" }), _jsxs("div", { className: "mt-1 flex justify-between", children: [_jsx("span", { children: "Eligible" }), _jsx("span", { className: "font-mono text-emerald", children: formatCurrency(gstr3b?.itc.eligible ?? 0) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Net ITC" }), _jsx("span", { className: "font-mono text-emerald", children: formatCurrency(gstr3b?.itc.net ?? 0) })] })] }), _jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("div", { className: "font-medium", children: "Net Tax Payable" }), _jsx("div", { className: "mt-1 font-mono text-xl text-gold", children: formatCurrency(gstr3b?.netTaxPayable ?? 0) })] })] }))] })] }));
};
