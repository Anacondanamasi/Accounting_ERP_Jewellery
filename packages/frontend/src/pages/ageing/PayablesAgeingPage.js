import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Download, RefreshCw, LayoutList, LayoutGrid, SlidersHorizontal, Search, ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { reportsService } from "@/services/reportsService";
import { toast } from "sonner";
const today = () => new Date().toISOString().slice(0, 10);
const heatClass = (value, total) => {
    if (!value || total <= 0)
        return "";
    const ratio = value / total;
    if (ratio >= 0.5)
        return "bg-ruby/10 text-ruby font-semibold";
    if (ratio >= 0.25)
        return "bg-orange-100 text-orange-700";
    if (ratio >= 0.1)
        return "bg-yellow-100 text-yellow-700";
    return "bg-emerald/10 text-emerald";
};
const DEFAULT_BUCKET_INPUT = "30,60,90,120";
const parsePreviewBuckets = (input) => {
    const thresholds = input.split(",").map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
    if (!thresholds.length)
        return ["Current", "1-30", "31-60", "61-90", "91-120", "120+"];
    const out = ["Current"];
    for (let i = 0; i < thresholds.length; i++) {
        const from = i === 0 ? 1 : thresholds[i - 1] + 1;
        const to = thresholds[i];
        out.push(`${from}-${to}`);
    }
    out.push(`${thresholds[thresholds.length - 1] + 1}+`);
    return out;
};
const BillDetailRow = ({ bill, navigate }) => (_jsxs("tr", { className: "border-b border-border/40 bg-slate-50/50 text-xs hover:bg-slate-100/60 transition-colors", children: [_jsx("td", { className: "py-1.5 pl-10 pr-3", children: _jsx("button", { className: "font-mono text-sapphire hover:underline", onClick: () => navigate(`/bills/${bill.id}`), children: bill.billNo }) }), _jsx("td", { className: "px-3 py-1.5 text-muted", children: formatDate(bill.date) }), _jsx("td", { className: "px-3 py-1.5 text-muted", children: formatDate(bill.dueDate) }), _jsx("td", { className: "px-3 py-1.5 text-right font-mono", children: formatCurrency(bill.originalAmount) }), _jsx("td", { className: "px-3 py-1.5 text-right font-mono text-emerald", children: formatCurrency(bill.paidAmount) }), _jsx("td", { className: "px-3 py-1.5 text-right font-mono font-bold", children: formatCurrency(bill.balanceDue) }), _jsx("td", { className: "px-3 py-1.5 text-center", children: _jsx("span", { className: "inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700", children: bill.bucket }) }), _jsxs("td", { className: "px-3 py-1.5 text-center text-muted", children: [bill.ageDays, "d"] })] }));
export const PayablesAgeingPage = () => {
    const navigate = useNavigate();
    const [params, setParams] = useState({ asOf: today(), view: "summary" });
    const [search, setSearch] = useState("");
    const [bucketInput, setBucketInput] = useState(DEFAULT_BUCKET_INPUT);
    const [showBucketEditor, setShowBucketEditor] = useState(false);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [exporting, setExporting] = useState(false);
    const queryParams = { ...params, search: search || undefined };
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["payables-ageing", queryParams],
        queryFn: () => reportsService.getPayablesAgeing(queryParams),
    });
    const bucketLabels = data?.buckets ?? parsePreviewBuckets(bucketInput);
    const applyBuckets = useCallback(() => {
        setParams((prev) => ({ ...prev, buckets: bucketInput }));
        setShowBucketEditor(false);
    }, [bucketInput]);
    const toggleRow = (id) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const handleExportCsv = async () => {
        try {
            setExporting(true);
            await reportsService.exportPayablesAgeing(queryParams);
            toast.success("CSV exported");
        }
        catch {
            toast.error("Export failed");
        }
        finally {
            setExporting(false);
        }
    };
    const rows = data?.rows ?? [];
    const totals = data?.grandTotals ?? {};
    const reconcile = data?.reconciliation;
    return (_jsxs("div", { className: "space-y-5 animate-in slide-in-from-bottom-4 duration-500", children: [_jsx(PageHeader, { title: "Payables Ageing", subtitle: `As of ${params.asOf ?? today()} · Supplier outstanding by overdue buckets`, actions: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { className: "inline-flex h-9 items-center gap-2 rounded-btn border border-border px-3 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50", onClick: handleExportCsv, disabled: exporting, type: "button", children: [_jsx(Download, { className: "h-4 w-4" }), exporting ? "Exporting…" : "Export CSV"] }), _jsx("button", { className: "inline-flex h-9 items-center gap-2 rounded-btn border border-border px-3 text-sm hover:bg-slate-50 transition-colors", onClick: () => refetch(), type: "button", children: _jsx(RefreshCw, { className: "h-4 w-4" }) })] }) }), _jsxs("div", { className: "flex flex-wrap items-end gap-3 rounded-card border border-border bg-card p-4 shadow-sm", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-[10px] font-bold uppercase tracking-wider text-muted", children: "As of Date" }), _jsx("input", { type: "date", className: "h-9 rounded border border-border px-3 text-sm focus:border-gold outline-none", value: params.asOf ?? today(), onChange: (e) => setParams((p) => ({ ...p, asOf: e.target.value })) })] }), _jsxs("div", { className: "flex flex-col gap-1 flex-1 min-w-[180px]", children: [_jsx("label", { className: "text-[10px] font-bold uppercase tracking-wider text-muted", children: "Search Supplier" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" }), _jsx("input", { className: "h-9 w-full rounded border border-border pl-8 pr-3 text-sm focus:border-gold outline-none", placeholder: "Name or code\u2026", value: search, onChange: (e) => setSearch(e.target.value) })] })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-[10px] font-bold uppercase tracking-wider text-muted", children: "Category" }), _jsxs("select", { className: "h-9 rounded border border-border px-3 text-sm focus:border-gold outline-none", value: params.category ?? "", onChange: (e) => setParams((p) => ({ ...p, category: e.target.value || undefined })), children: [_jsx("option", { value: "", children: "All" }), _jsx("option", { value: "BULLION", children: "Bullion" }), _jsx("option", { value: "DIAMOND", children: "Diamond" }), _jsx("option", { value: "KARIGAR", children: "Karigar" }), _jsx("option", { value: "GENERAL", children: "General" })] })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-[10px] font-bold uppercase tracking-wider text-muted", children: "View" }), _jsxs("div", { className: "flex h-9 overflow-hidden rounded border border-border text-sm", children: [_jsxs("button", { className: `flex items-center gap-1.5 px-3 transition-colors ${params.view === "summary" ? "bg-gold text-white" : "hover:bg-slate-50"}`, onClick: () => setParams((p) => ({ ...p, view: "summary" })), type: "button", children: [_jsx(LayoutGrid, { className: "h-3.5 w-3.5" }), " Summary"] }), _jsxs("button", { className: `flex items-center gap-1.5 px-3 transition-colors ${params.view === "detail" ? "bg-gold text-white" : "hover:bg-slate-50"}`, onClick: () => setParams((p) => ({ ...p, view: "detail" })), type: "button", children: [_jsx(LayoutList, { className: "h-3.5 w-3.5" }), " Detail"] })] })] }), _jsxs("div", { className: "flex flex-col gap-1 relative", children: [_jsx("label", { className: "text-[10px] font-bold uppercase tracking-wider text-muted", children: "Ageing Buckets" }), _jsxs("button", { className: "flex h-9 items-center gap-2 rounded border border-border px-3 text-sm hover:bg-slate-50 transition-colors", onClick: () => setShowBucketEditor((v) => !v), type: "button", children: [_jsx(SlidersHorizontal, { className: "h-3.5 w-3.5 text-muted" }), "Customize"] }), showBucketEditor && (_jsxs("div", { className: "absolute top-14 left-0 z-30 w-72 rounded-card border border-border bg-white p-4 shadow-xl", children: [_jsx("p", { className: "mb-1 text-xs font-bold text-charcoal", children: "Bucket Thresholds (days)" }), _jsxs("p", { className: "mb-2 text-[10px] text-muted", children: ["E.g. ", _jsx("code", { children: "30,60,90,120" }), " \u2192 Current, 1-30, 31-60, 61-90, 91-120, 120+"] }), _jsx("input", { className: "h-9 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none", value: bucketInput, onChange: (e) => setBucketInput(e.target.value), placeholder: "30,60,90,120" }), _jsxs("p", { className: "mt-2 text-[10px] text-muted", children: ["Preview: ", _jsx("span", { className: "font-semibold", children: parsePreviewBuckets(bucketInput).join(" · ") })] }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("button", { className: "flex-1 h-8 rounded bg-gold text-xs font-bold text-white hover:bg-gold-dark", onClick: applyBuckets, type: "button", children: "Apply" }), _jsx("button", { className: "flex-1 h-8 rounded border border-border text-xs hover:bg-slate-50", onClick: () => setShowBucketEditor(false), type: "button", children: "Cancel" })] })] }))] }), _jsx("button", { className: "mt-auto h-9 rounded border border-border px-3 text-sm hover:bg-slate-50 transition-colors", onClick: () => { setParams({ asOf: today(), view: "summary" }); setSearch(""); setBucketInput(DEFAULT_BUCKET_INPUT); }, type: "button", children: "Reset" })] }), isLoading && (_jsxs("div", { className: "flex items-center justify-center py-20 text-muted", children: [_jsx("div", { className: "h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent mr-3" }), "Calculating ageing\u2026"] })), !isLoading && (_jsx("div", { className: "overflow-hidden rounded-card border-t-2 border-t-gold bg-card shadow-card", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gold-tint", children: [params.view === "detail" && _jsx("th", { className: "w-8" }), _jsx("th", { className: "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-charcoal", children: "Code" }), _jsx("th", { className: "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-charcoal", children: "Supplier" }), _jsx("th", { className: "px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-charcoal", children: "Total O/S" }), bucketLabels.map((label) => (_jsx("th", { className: "px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-charcoal whitespace-nowrap", children: label }, label))), _jsx("th", { className: "px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-charcoal", children: "Ledger" })] }) }), _jsxs("tbody", { children: [rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: bucketLabels.length + 5, className: "px-4 py-12 text-center text-muted", children: "No outstanding payables found for the selected filters." }) })), rows.map((row) => (_jsxs(_Fragment, { children: [_jsxs("tr", { className: "border-b border-border/60 hover:bg-slate-50/60 transition-colors", children: [params.view === "detail" && (_jsx("td", { className: "w-8 pl-3", children: _jsx("button", { className: "text-muted hover:text-gold transition-colors", onClick: () => toggleRow(row.supplierId), type: "button", children: expandedRows.has(row.supplierId) ? _jsx(ChevronDown, { className: "h-4 w-4" }) : _jsx(ChevronRight, { className: "h-4 w-4" }) }) })), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted", children: row.supplierCode }), _jsxs("td", { className: "px-4 py-3", children: [_jsx("button", { className: "font-semibold text-charcoal hover:text-gold transition-colors text-left", onClick: () => navigate(`/suppliers/${row.supplierId}`), type: "button", children: row.supplierName }), row.category && _jsx("span", { className: "ml-2 text-[10px] text-muted", children: row.category })] }), _jsx("td", { className: "px-4 py-3 text-right font-mono font-bold text-charcoal", children: formatCurrency(row.totalOutstanding) }), bucketLabels.map((label) => {
                                                        const val = row[label] ?? 0;
                                                        return (_jsx("td", { className: "px-4 py-3 text-right", children: val > 0 ? (_jsx("span", { className: `inline-block rounded px-2 py-0.5 font-mono text-xs ${heatClass(val, row.totalOutstanding)}`, children: formatCurrency(val) })) : (_jsx("span", { className: "text-muted", children: "\u2014" })) }, label));
                                                    }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsx("button", { className: "text-xs font-semibold text-sapphire hover:underline", onClick: () => navigate(`/suppliers/${row.supplierId}`), type: "button", children: "Ledger" }) })] }, row.supplierId), params.view === "detail" && expandedRows.has(row.supplierId) && (row.bills ?? []).map((bill) => (_jsx(BillDetailRow, { bill: bill, navigate: navigate }, bill.id)))] })))] }), rows.length > 0 && (_jsx("tfoot", { children: _jsxs("tr", { className: "border-t-2 border-t-gold bg-gold-tint font-bold", children: [params.view === "detail" && _jsx("td", {}), _jsxs("td", { colSpan: 2, className: "px-4 py-3 text-xs font-bold uppercase tracking-wider text-charcoal", children: ["Grand Total (", rows.length, " suppliers)"] }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-charcoal", children: formatCurrency(totals.totalOutstanding ?? 0) }), bucketLabels.map((label) => (_jsx("td", { className: "px-4 py-3 text-right font-mono", children: formatCurrency(totals[label] ?? 0) }, label))), _jsx("td", {})] }) }))] }) }) }))] }));
};
