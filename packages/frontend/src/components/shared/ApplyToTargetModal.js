import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { settlementService } from "@/services/settlementService";
import { SearchableSelect } from "./SearchableSelect";
export const ApplyToTargetModal = ({ open, onClose, sourceNoteId, noteType, partyId, partyName, outstandingNoteAmount, onApplied, }) => {
    const targetDocType = noteType === "CREDIT_NOTE" ? "invoice" : "bill";
    const [selectedTargetId, setSelectedTargetId] = useState(null);
    const [amount, setAmount] = useState("");
    useEffect(() => {
        if (open) {
            setSelectedTargetId(null);
            setAmount("");
        }
    }, [open]);
    const { data: openDocs = [], isLoading } = useQuery({
        queryKey: ["open-documents", partyId, targetDocType],
        queryFn: () => settlementService.getOpenDocuments({ partyType: noteType === "CREDIT_NOTE" ? "customer" : "supplier", partyId, docType: targetDocType }),
        enabled: open,
    });
    const selectedDoc = selectedTargetId
        ? openDocs.find((d) => d.id === selectedTargetId)
        : null;
    const handleSelectDoc = (id) => {
        setSelectedTargetId(id);
        const doc = openDocs.find((d) => d.id === id);
        if (doc) {
            const remainingTarget = Number(doc.balanceDue);
            setAmount(Math.min(outstandingNoteAmount, remainingTarget).toFixed(2));
        }
        else {
            setAmount("");
        }
    };
    const applyMutation = useMutation({
        mutationFn: () => settlementService.applyNote({
            sourceNoteId,
            allocations: [{ targetId: selectedTargetId, amount: Number(amount) }],
            settledAt: new Date().toISOString(),
        }),
        onSuccess: () => {
            toast.success(`${noteType === "CREDIT_NOTE" ? "Credit" : "Debit"} note applied successfully`);
            onApplied();
        },
        onError: (e) => toast.error(e?.response?.data?.error?.message ?? "Failed to apply note"),
    });
    if (!open)
        return null;
    const maxApply = Math.min(outstandingNoteAmount, selectedDoc ? Number(selectedDoc.balanceDue) : 0);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-lg rounded-card bg-card shadow-2xl border border-border", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-6 py-4", children: [_jsxs("h2", { className: "font-display text-lg font-bold text-charcoal", children: ["Apply to ", targetDocType === "invoice" ? "Invoice" : "Bill"] }), _jsx("button", { onClick: onClose, className: "rounded-full p-1.5 hover:bg-slate-100", type: "button", children: _jsx(X, { className: "h-4 w-4 text-muted" }) })] }), _jsxs("div", { className: "p-6 space-y-5", children: [_jsxs("div", { className: "rounded-lg bg-gold/5 border border-gold/20 px-4 py-3 text-sm", children: [_jsx("span", { className: "text-muted", children: "Party:" }), " ", _jsx("span", { className: "font-semibold text-charcoal", children: partyName }), _jsx("span", { className: "ml-4 text-muted", children: "Available Credit:" }), " ", _jsx("span", { className: "font-mono font-bold text-ruby", children: formatCurrency(outstandingNoteAmount) })] }), _jsxs("div", { children: [_jsxs("p", { className: "mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted", children: ["Select ", targetDocType === "invoice" ? "Invoice" : "Bill"] }), _jsx(SearchableSelect, { value: selectedTargetId ?? "", onChange: handleSelectDoc, options: openDocs.map((doc) => ({
                                        value: doc.id,
                                        label: `${doc.invoiceNo ?? doc.billNo} — ${formatCurrency(doc.balanceDue)} due`,
                                        meta: doc.status,
                                    })) }), isLoading && _jsxs("p", { className: "mt-2 text-xs text-muted", children: ["Loading open ", targetDocType, "s..."] }), openDocs.length === 0 && !isLoading && (_jsxs("p", { className: "mt-2 text-xs text-amber-600", children: ["No open ", targetDocType, "s found for this party."] }))] }), selectedDoc && (_jsxs("div", { className: "animate-in slide-in-from-top-2 duration-300", children: [_jsx("label", { className: "block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5", children: "Amount to Apply" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono", children: "\u20B9" }), _jsx("input", { type: "number", className: "h-11 w-full rounded border border-border pl-8 pr-4 font-mono text-charcoal outline-none transition-all focus:border-gold focus:ring-1 focus:ring-gold", value: amount, onChange: (e) => setAmount(e.target.value), step: "0.01", min: "0.01", max: maxApply })] }), _jsxs("p", { className: "mt-1.5 text-xs text-muted", children: ["Max available: ", _jsx("span", { className: "font-mono font-bold", children: formatCurrency(maxApply) })] })] }))] }), _jsxs("div", { className: "flex items-center justify-end gap-3 border-t border-border bg-slate-50 px-6 py-4 rounded-b-xl", children: [_jsx("button", { onClick: onClose, className: "rounded-btn px-4 py-2 text-sm font-semibold text-muted hover:bg-slate-200 transition-colors", type: "button", children: "Cancel" }), _jsxs("button", { onClick: () => applyMutation.mutate(), disabled: !selectedTargetId || !amount || Number(amount) <= 0 || applyMutation.isPending || Number(amount) > maxApply, className: "inline-flex items-center gap-2 rounded-btn bg-gold px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:bg-gold-dark disabled:opacity-50", type: "button", children: [applyMutation.isPending ? (_jsx("span", { className: "h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" })) : (_jsx(CheckCircle, { className: "h-4 w-4" })), "Apply ", formatCurrency(Number(amount))] })] })] }) }));
};
