import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";
import { KPICard } from "@/components/shared/KPICard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import { supplierService } from "@/services/supplierService";
import { Truck, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
const toN = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmtDate = (v) => {
    if (!v)
        return "";
    try {
        return format(new Date(String(v)), "dd-MM-yyyy");
    }
    catch {
        return "";
    }
};
const dueBadge = (dueInDays) => {
    if (dueInDays === null)
        return null;
    if (dueInDays < 0) {
        return (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-ruby/10 px-2 py-0.5 text-[11px] font-semibold text-ruby", children: [_jsx(Clock, { className: "h-3 w-3" }), Math.abs(dueInDays), "d overdue"] }));
    }
    if (dueInDays === 0) {
        return (_jsx("span", { className: "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700", children: "Due today" }));
    }
    return (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500", children: ["in ", dueInDays, "d"] }));
};
export const SupplierDetailPage = () => {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState("ledger");
    const [search, setSearch] = useState("");
    /* ── ESC: return to ledger tab or suppliers list ── */
    useEffect(() => {
        const handler = (e) => {
            if (e.key !== "Escape")
                return;
            if (tab !== "ledger")
                setTab("ledger");
            else
                navigate("/suppliers");
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [tab, navigate]);
    const { data: detail, isLoading, isError } = useQuery({
        queryKey: ["supplier", id],
        queryFn: () => supplierService.getById(id),
    });
    const { data: ledger } = useQuery({
        queryKey: ["supplier-ledger", id],
        queryFn: () => supplierService.getLedger(id, {}),
        enabled: Boolean(id),
    });
    const { data: bills } = useQuery({
        queryKey: ["supplier-bills", id],
        queryFn: () => supplierService.getBills(id),
        enabled: Boolean(id),
    });
    const payments = useMemo(() => (bills ?? []).flatMap((bill) => (bill.payments ?? []).map((payment) => ({ ...payment, billNo: bill.billNo }))), [bills]);
    const ledgerRows = useMemo(() => {
        const rows = ledger?.rows ?? [];
        if (!search)
            return rows;
        const q = search.toLowerCase();
        return rows.filter((r) => r.number?.toLowerCase().includes(q) ||
            r.type?.toLowerCase().includes(q) ||
            r.reference?.toLowerCase().includes(q) ||
            r.status?.toLowerCase().includes(q));
    }, [ledger, search]);
    if (isError) {
        return (_jsx(EmptyState, { actionLabel: "Back to list", description: "The requested supplier could not be loaded.", icon: Truck, onAction: () => navigate("/suppliers"), title: "Supplier not found" }));
    }
    if (isLoading || !detail) {
        return _jsx("div", { className: "rounded-card bg-card p-6 shadow-card", children: "Loading supplier..." });
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: detail.name, subtitle: `${detail.code} · ${detail.city ?? "—"} · ${detail.category ?? "—"}`, actions: _jsxs(_Fragment, { children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => navigate("/suppliers"), type: "button", children: "Back" }), _jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => navigate(`/suppliers/${id}/edit`), type: "button", children: "Edit" })] }) }), _jsxs("div", { className: "grid gap-4 xl:grid-cols-4", children: [_jsx(KPICard, { title: "Total Purchases", value: formatCurrency(toN(ledger?.totalInvoiced ?? detail.totalBusiness)) }), _jsx(KPICard, { title: "Outstanding", value: formatCurrency(toN(ledger?.totalOutstanding ?? detail.outstanding)), trendDirection: toN(detail.outstanding) > 0 ? "up" : "down" }), _jsx(KPICard, { title: "Total Paid", value: formatCurrency(toN(ledger?.totalPaid ?? 0)) }), _jsx(KPICard, { title: "Closing Balance", value: formatCurrency(toN(ledger?.closingBalance ?? 0)) })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [[["ledger", "Ledger"], ["bills", "Bills"], ["payments", "Payments"], ["notes", "Notes"]].map(([key, label]) => (_jsx("button", { className: `rounded-full px-3 py-1 text-xs font-medium transition-colors ${tab === key ? "bg-gold text-white" : "bg-slate-100 text-charcoal hover:bg-slate-200"}`, onClick: () => setTab(key), type: "button", children: label }, key))), _jsx("span", { className: "ml-auto text-[11px] italic text-muted", children: "Press Esc to go back" })] }), tab === "ledger" && (_jsxs("div", { className: "rounded-card border border-border bg-card shadow-card overflow-hidden", children: [_jsx("div", { className: "border-b border-border px-4 py-3", children: _jsx("input", { className: "w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40", placeholder: "Search by number, type, reference, status\u2026", value: search, onChange: (e) => setSearch(e.target.value) }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full min-w-[1100px] text-sm", children: [_jsx("thead", { className: "bg-gold/5 text-left", children: _jsx("tr", { children: ["Type", "Number", "Reference", "Issue Date", "Due Date", "Due in Days", "Paid Date", "Paid", "Due", "Total", "Status", ""].map((h) => (_jsx("th", { className: "whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted", children: h }, h))) }) }), _jsxs("tbody", { children: [ledgerRows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 12, className: "px-4 py-10 text-center text-sm text-muted", children: "No transactions found." }) })), ledgerRows.map((row, i) => {
                                            const isBill = row.type === "Bill";
                                            const isDebitNote = row.type === "Purchase Debit Note";
                                            const isOverdue = row.status === "OVERDUE";
                                            return (_jsxs("tr", { className: `border-t border-border/60 transition-colors ${row.sourcePath ? "hover:bg-gold/5 cursor-pointer" : ""} ${isOverdue ? "bg-ruby/5" : ""}`, onClick: () => row.sourcePath && navigate(row.sourcePath), children: [_jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `font-semibold text-xs ${isDebitNote ? "text-ruby" : isBill ? "text-charcoal" : "text-emerald-600"}`, children: row.type }) }), _jsx("td", { className: "px-4 py-3", children: row.sourcePath ? (_jsx("button", { className: "font-mono text-xs font-semibold text-sapphire underline underline-offset-2 hover:text-sapphire/70", onClick: (e) => { e.stopPropagation(); navigate(row.sourcePath); }, type: "button", children: row.number })) : (_jsx("span", { className: "font-mono text-xs text-charcoal", children: row.number })) }), _jsx("td", { className: "px-4 py-3 text-xs text-muted", children: row.reference || "—" }), _jsx("td", { className: "px-4 py-3 tabular-nums text-xs", children: fmtDate(row.issueDate) }), _jsx("td", { className: `px-4 py-3 tabular-nums text-xs ${isOverdue ? "text-ruby font-semibold" : ""}`, children: row.dueDate ? fmtDate(row.dueDate) : "—" }), _jsx("td", { className: "px-4 py-3", children: dueBadge(row.dueInDays) }), _jsx("td", { className: "px-4 py-3 tabular-nums text-xs text-muted", children: row.paidDate ? fmtDate(row.paidDate) : "—" }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx("span", { className: "font-mono text-xs font-semibold text-emerald-600", children: toN(row.paid) > 0 ? formatCurrency(toN(row.paid)) : "—" }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx("span", { className: `font-mono text-xs font-semibold ${toN(row.due) < 0 ? "text-ruby" : toN(row.due) > 0 ? "text-amber-600" : "text-muted"}`, children: toN(row.due) !== 0 ? `(${formatCurrency(Math.abs(toN(row.due)))})` : "—" }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx("span", { className: `font-mono text-xs font-bold ${isDebitNote ? "text-ruby" : "text-charcoal"}`, children: formatCurrency(toN(row.total)) }) }), _jsx("td", { className: "px-4 py-3", children: row.status ? _jsx(StatusBadge, { status: row.status }) : null }), _jsx("td", { className: "px-4 py-3 text-right", children: row.sourcePath && (_jsx(ExternalLink, { className: "h-3.5 w-3.5 text-muted hover:text-sapphire cursor-pointer", onClick: (e) => { e.stopPropagation(); navigate(row.sourcePath); } })) })] }, i));
                                        })] }), ledgerRows.length > 0 && (_jsx("tfoot", { className: "bg-gold/8 font-bold text-sm border-t-2 border-border", children: _jsxs("tr", { children: [_jsx("td", { colSpan: 7, className: "px-4 py-3 text-right text-xs uppercase tracking-wider text-muted", children: "Closing Balance" }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-emerald-600", children: formatCurrency(ledger?.totalPaid ?? 0) }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-amber-600", children: formatCurrency(ledger?.totalOutstanding ?? 0) }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-charcoal", children: formatCurrency(Math.abs(toN(ledger?.closingBalance))) }), _jsx("td", { colSpan: 2 })] }) }))] }) }), _jsxs("div", { className: "border-t border-border px-4 py-2 text-[11px] text-muted", children: ["Showing ", ledgerRows.length, " of ", ledger?.rows?.length ?? 0, " item", (ledger?.rows?.length ?? 0) !== 1 ? "s" : ""] })] })), tab === "bills" && (_jsx("div", { className: "rounded-card border border-border bg-card shadow-card overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full min-w-[800px] text-sm", children: [_jsx("thead", { className: "bg-gold/5", children: _jsx("tr", { children: ["Bill No", "Date", "Due Date", "Status", "Total", "Balance"].map((h) => (_jsx("th", { className: "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted", children: h }, h))) }) }), _jsx("tbody", { children: (bills ?? []).map((bill) => (_jsxs("tr", { className: "border-t border-border/60 hover:bg-gold/5 cursor-pointer", onClick: () => navigate(`/bills/${bill.id}`), children: [_jsx("td", { className: "px-4 py-3", children: _jsx("button", { className: "font-mono text-sm font-semibold text-sapphire underline", type: "button", children: bill.billNo }) }), _jsx("td", { className: "px-4 py-3 tabular-nums text-xs", children: fmtDate(bill.date) }), _jsx("td", { className: "px-4 py-3 tabular-nums text-xs", children: fmtDate(bill.dueDate) }), _jsx("td", { className: "px-4 py-3", children: _jsx(StatusBadge, { status: bill.status }) }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-xs font-bold", children: formatCurrency(bill.grandTotal) }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-xs text-amber-600", children: formatCurrency(bill.balanceDue) })] }, bill.id))) })] }) }) })), tab === "payments" && (_jsx("div", { className: "rounded-card border border-border bg-card shadow-card overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gold/5", children: _jsx("tr", { children: ["Date", "Bill No", "Mode", "Reference", "Amount"].map((h) => (_jsx("th", { className: "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted", children: h }, h))) }) }), _jsxs("tbody", { children: [payments.map((pmt) => (_jsxs("tr", { className: "border-t border-border/60 hover:bg-gold/5", children: [_jsx("td", { className: "px-4 py-3 tabular-nums text-xs", children: fmtDate(pmt.date) }), _jsx("td", { className: "px-4 py-3 font-mono text-xs", children: pmt.billNo }), _jsx("td", { className: "px-4 py-3 text-xs", children: pmt.mode }), _jsx("td", { className: "px-4 py-3 text-xs text-muted", children: pmt.reference || "—" }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-xs font-semibold text-emerald-600", children: formatCurrency(pmt.amount) })] }, pmt.id))), payments.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-8 text-center text-sm text-muted", children: "No payments recorded." }) }))] })] }) }) })), tab === "notes" && (_jsxs("div", { className: "rounded-card border border-border bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-xl font-semibold", children: "Internal Notes" }), _jsx("p", { className: "text-sm text-muted", children: detail.notes || "No notes available for this supplier." })] }))] }));
};
