import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { invoiceService } from "@/services/invoiceService";
const paymentSchema = z.object({
    date: z.string().min(1),
    mode: z.string().min(1),
    amount: z.coerce.number().positive(),
    reference: z.string().optional(),
    notes: z.string().optional(),
});
const toNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
};
export const RecordPaymentModal = ({ open, invoiceId, invoiceNo, balanceDue, onClose, onSaved, }) => {
    const form = useForm({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            date: new Date().toISOString().slice(0, 10),
            mode: "UPI",
            amount: Number(toNumber(balanceDue).toFixed(2)),
            reference: "",
            notes: "",
        },
    });
    const mutation = useMutation({
        mutationFn: (payload) => invoiceService.recordPayment(invoiceId, payload),
        onSuccess: () => {
            toast.success("Payment recorded");
            onSaved();
            onClose();
        },
        onError: () => toast.error("Failed to record payment"),
    });
    if (!open) {
        return null;
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4", onClick: (e) => e.currentTarget === e.target && onClose(), children: _jsxs("form", { className: "w-full max-w-md rounded-card bg-card p-6 shadow-modal", onSubmit: form.handleSubmit(async (values) => mutation.mutate(values)), children: [_jsx("h3", { className: "font-display text-2xl font-semibold text-charcoal", children: "Record Payment" }), _jsxs("p", { className: "mb-4 text-sm text-muted", children: [invoiceNo, " \u00B7 Amount Due: ", _jsx("span", { className: "font-mono", children: formatCurrency(balanceDue) })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Payment Date", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", ...form.register("date") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Mode", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("mode"), children: [_jsx("option", { value: "CASH", children: "Cash" }), _jsx("option", { value: "CARD", children: "Card" }), _jsx("option", { value: "UPI", children: "UPI" }), _jsx("option", { value: "CHEQUE", children: "Cheque" }), _jsx("option", { value: "BANK_TRANSFER", children: "Bank Transfer" })] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Amount", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", step: "0.01", type: "number", ...form.register("amount", { valueAsNumber: true }) }), _jsx("p", { className: "mt-1 text-xs text-ruby", children: form.formState.errors.amount?.message })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Reference", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("reference") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Notes", _jsx("textarea", { className: "mt-1 min-h-20 w-full rounded border border-border px-3 py-2 text-sm", ...form.register("notes") })] })] }), _jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: onClose, type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: mutation.isPending, type: "submit", children: "Save Payment" })] })] }) }));
};
