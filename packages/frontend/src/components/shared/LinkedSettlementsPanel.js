import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * LinkedSettlementsPanel
 *
 * Renders the Xero-style "Linked Settlements" card on any Invoice or Bill view.
 * Shows: original amount, all credit notes / payments applied, total settled,
 * outstanding balance. Supports applying a credit note and reversing a settlement.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trash2, Link, PlusCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { settlementService } from "@/services/settlementService";
import { StatusBadge } from "./StatusBadge";
import { ApplyNoteModal } from "./ApplyNoteModal";
import { ApplyToTargetModal } from "./ApplyToTargetModal";
const fmtDate = (v) => {
    if (!v)
        return "—";
    try {
        return format(new Date(String(v)), "dd-MMM-yyyy");
    }
    catch {
        return "—";
    }
};
const sourceLabel = {
    CREDIT_NOTE: "Credit Note",
    DEBIT_NOTE: "Debit Note",
    PAYMENT: "Payment",
};
const sourceColor = {
    CREDIT_NOTE: "text-ruby",
    DEBIT_NOTE: "text-ruby",
    PAYMENT: "text-emerald-600",
};
export const LinkedSettlementsPanel = ({ targetType, targetId, grandTotal, partyId, partyName, status, onSettled, }) => {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [applyNoteOpen, setApplyNoteOpen] = useState(false);
    const summaryKey = ["settlement-summary", targetType, targetId];
    const { data: summary, isLoading } = useQuery({
        queryKey: summaryKey,
        queryFn: () => settlementService.getSummary(targetType, targetId),
    });
    const reverseMutation = useMutation({
        mutationFn: (settlementId) => settlementService.reverse(settlementId),
        onSuccess: () => {
            toast.success("Settlement reversed");
            void qc.invalidateQueries({ queryKey: summaryKey });
            onSettled?.();
        },
        onError: (e) => toast.error(e?.response?.data?.error?.message ?? "Could not reverse settlement"),
    });
    if (isLoading) {
        return (_jsx("div", { className: "rounded-card border border-border bg-card p-6 shadow-card animate-pulse", children: _jsx("div", { className: "h-4 w-48 rounded bg-slate-200" }) }));
    }
    const linked = summary?.linkedSettlements ?? [];
    const totalSettled = linked.reduce((s, l) => s + l.amount, 0);
    const outstanding = Number(grandTotal) - totalSettled;
    const computedStatus = outstanding <= 0 ? "PAID"
        : totalSettled > 0 ? "PARTIAL"
            : "OPEN";
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "rounded-card border border-border bg-card shadow-card overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link, { className: "h-4 w-4 text-sapphire" }), _jsx("h3", { className: "font-display font-bold text-charcoal", children: "Linked Settlements" })] }), outstanding > 0.005 && (_jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-btn bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20 transition-colors", onClick: () => setApplyNoteOpen(true), type: "button", children: [_jsx(PlusCircle, { className: "h-3.5 w-3.5" }), targetType === "note"
                                        ? (window.location.pathname.includes("debit") ? "Apply to Bill" : "Apply to Invoice")
                                        : "Apply Credit Note"] }))] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full min-w-[600px] text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsx("tr", { children: ["Type", "Ref No.", "Date", "Amount Applied", ""].map((h) => (_jsx("th", { className: "px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted", children: h }, h))) }) }), _jsxs("tbody", { children: [linked.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-5 py-8 text-center text-sm text-muted", children: "No settlements linked yet." }) })), linked.map((item, i) => (_jsxs("tr", { className: "border-t border-border/50 hover:bg-slate-50/60 transition-colors", children: [_jsx("td", { className: "px-5 py-3", children: _jsx("span", { className: `text-xs font-semibold ${sourceColor[item.sourceType] ?? "text-charcoal"}`, children: sourceLabel[item.sourceType] ?? item.type }) }), _jsx("td", { className: "px-5 py-3", children: (() => {
                                                        let path = "";
                                                        if (targetType === "note") {
                                                            if (item.type === "INVOICE")
                                                                path = `/invoices/${item.targetId}`;
                                                            else if (item.type === "BILL")
                                                                path = `/bills/${item.targetId}`;
                                                        }
                                                        else {
                                                            // Original behavior for invoices/bills targeting notes/payments
                                                            // Assuming payments don't have a distinct view page right now except ledger
                                                            if (item.sourceType === "CREDIT_NOTE")
                                                                path = `/credit-notes/${item.sourceId}`;
                                                            else if (item.sourceType === "DEBIT_NOTE")
                                                                path = `/debit-notes/${item.sourceId}`;
                                                            else if (item.sourceType === "PAYMENT")
                                                                path = `/advance-receipts`;
                                                        }
                                                        if (path) {
                                                            return (_jsx("button", { className: "font-mono text-xs font-semibold text-sapphire underline underline-offset-2 hover:text-sapphire/70", onClick: () => navigate(path), type: "button", children: item.refNo }));
                                                        }
                                                        return _jsx("span", { className: "font-mono text-xs text-charcoal", children: item.refNo });
                                                    })() }), _jsx("td", { className: "px-5 py-3 tabular-nums text-xs text-muted", children: fmtDate(item.date) }), _jsx("td", { className: "px-5 py-3 text-right", children: _jsxs("span", { className: `font-mono text-xs font-bold ${sourceColor[item.sourceType] ?? ""}`, children: ["\u2212", formatCurrency(item.amount)] }) }), _jsx("td", { className: "px-5 py-3 text-right", children: item.id && (_jsx("button", { className: "rounded p-1 text-muted hover:bg-ruby/10 hover:text-ruby transition-colors", onClick: () => {
                                                            if (confirm(`Reverse this settlement of ${formatCurrency(item.amount)}? The outstanding balance will be restored.`)) {
                                                                reverseMutation.mutate(item.id);
                                                            }
                                                        }, title: "Reverse settlement", type: "button", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })) })] }, i)))] }), _jsxs("tfoot", { className: "bg-gold/5 border-t-2 border-border font-semibold text-sm", children: [_jsxs("tr", { children: [_jsx("td", { colSpan: 3, className: "px-5 py-3 text-right text-xs uppercase tracking-wider text-muted", children: "Total Settled" }), _jsx("td", { className: "px-5 py-3 text-right font-mono text-emerald-600", children: totalSettled > 0 ? `−${formatCurrency(totalSettled)}` : formatCurrency(0) }), _jsx("td", {})] }), _jsxs("tr", { className: "border-t border-border/60", children: [_jsx("td", { colSpan: 3, className: "px-5 py-3 text-right text-xs uppercase tracking-wider text-charcoal", children: "Original Amount" }), _jsx("td", { className: "px-5 py-3 text-right font-mono font-bold text-charcoal", children: formatCurrency(grandTotal) }), _jsx("td", {})] }), _jsxs("tr", { className: "border-t border-border", children: [_jsx("td", { colSpan: 3, className: "px-5 py-3 text-right text-sm font-bold text-charcoal", children: "Outstanding Balance" }), _jsx("td", { className: "px-5 py-3 text-right", children: _jsx("span", { className: `font-mono text-base font-extrabold ${outstanding <= 0 ? "text-emerald-600" : "text-ruby"}`, children: formatCurrency(Math.max(0, outstanding)) }) }), _jsx("td", { className: "px-5 py-3", children: _jsx(StatusBadge, { status: computedStatus }) })] })] })] }) }), outstanding < -0.005 && (_jsxs("div", { className: "flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700", children: [_jsx(AlertCircle, { className: "h-4 w-4 flex-shrink-0" }), _jsxs("span", { children: ["This document is ", _jsx("strong", { children: "overpaid" }), " by ", formatCurrency(Math.abs(outstanding)), ". Please review."] })] }))] }), targetType !== "note" && (_jsx(ApplyNoteModal, { open: applyNoteOpen, onClose: () => setApplyNoteOpen(false), targetType: targetType, targetId: targetId, partyId: partyId, partyName: partyName, outstanding: outstanding, onApplied: () => {
                    void qc.invalidateQueries({ queryKey: summaryKey });
                    setApplyNoteOpen(false);
                    onSettled?.();
                } })), targetType === "note" && (_jsx(ApplyToTargetModal, { open: applyNoteOpen, onClose: () => setApplyNoteOpen(false), sourceNoteId: targetId, noteType: (window.location.pathname.includes("debit") ? "DEBIT_NOTE" : "CREDIT_NOTE"), partyId: partyId, partyName: partyName, outstandingNoteAmount: outstanding, onApplied: () => {
                    void qc.invalidateQueries({ queryKey: summaryKey });
                    setApplyNoteOpen(false);
                    onSettled?.();
                } }))] }));
};
