import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { billService } from "@/services/billService";
import { LinkedSettlementsPanel } from "@/components/shared/LinkedSettlementsPanel";
export const BillViewPage = () => {
    const navigate = useNavigate();
    const { id = "" } = useParams();
    const [showPayment, setShowPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["bill", id],
        queryFn: () => billService.getById(id),
    });
    const postMutation = useMutation({
        mutationFn: () => billService.post(id),
        onSuccess: () => {
            toast.success("Bill posted");
            void refetch();
        },
    });
    const duplicateMutation = useMutation({
        mutationFn: () => billService.duplicate(id),
        onSuccess: (record) => {
            toast.success("Bill duplicated");
            navigate(`/bills/${record.id}/edit`);
        },
    });
    const voidMutation = useMutation({
        mutationFn: () => billService.void(id),
        onSuccess: () => {
            toast.success("Bill voided");
            void refetch();
        },
    });
    const paymentMutation = useMutation({
        mutationFn: () => billService.recordPayment(id, {
            date: new Date().toISOString().slice(0, 10),
            mode: "BANK_TRANSFER",
            amount: paymentAmount,
        }),
        onSuccess: () => {
            toast.success("Supplier payment recorded");
            setShowPayment(false);
            void refetch();
        },
        onError: (error) => toast.error(error?.response?.data?.error?.message ?? "Unable to record payment"),
    });
    if (isLoading || !data) {
        return _jsx("div", { className: "rounded-card bg-card p-6 shadow-card", children: "Loading bill..." });
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: data.billNo, subtitle: `Supplier: ${data.supplierName}`, actions: _jsxs(_Fragment, { children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => navigate(`/bills/${id}/edit`), type: "button", children: "Edit" }), _jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => duplicateMutation.mutate(), type: "button", children: "Duplicate" }), _jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => postMutation.mutate(), type: "button", children: "Post" }), _jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => setShowPayment((prev) => !prev), type: "button", children: "Record Payment" }), _jsx("button", { className: "h-10 rounded-btn bg-ruby px-4 text-sm text-white", onClick: () => voidMutation.mutate(), type: "button", children: "Void" })] }) }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsxs("div", { className: "mb-3 flex items-center gap-2", children: [_jsx(StatusBadge, { status: data.status }), _jsxs("span", { className: "text-sm text-muted", children: ["Due ", data.dueDate] })] }), _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gold-tint text-charcoal", children: _jsxs("tr", { children: [_jsx("th", { className: "px-2 py-2 text-left", children: "SKU" }), _jsx("th", { className: "px-2 py-2 text-left", children: "Description" }), _jsx("th", { className: "px-2 py-2 text-left", children: "Karat" }), _jsx("th", { className: "px-2 py-2 text-right", children: "Net Wt" }), _jsx("th", { className: "px-2 py-2 text-right", children: "Rate/g" }), _jsx("th", { className: "px-2 py-2 text-right", children: "GST%" })] }) }), _jsx("tbody", { children: data.lines.map((line, idx) => (_jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "px-2 py-2 font-mono", children: line.sku }), _jsx("td", { className: "px-2 py-2", children: line.description }), _jsx("td", { className: "px-2 py-2", children: line.karat }), _jsx("td", { className: "px-2 py-2 text-right font-mono", children: formatWeight(line.netWt, "g") }), _jsx("td", { className: "px-2 py-2 text-right font-mono", children: formatCurrency(line.ratePerGram) }), _jsx("td", { className: "px-2 py-2 text-right font-mono", children: line.gstPct.toFixed(2) })] }, `${line.sku}-${idx}`))) })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-xl font-semibold", children: "Payment History" }), data.payments.length === 0 ? (_jsx("p", { className: "text-sm text-muted", children: "No payments recorded yet." })) : (_jsx("ul", { className: "space-y-2", children: data.payments.map((payment) => (_jsxs("li", { className: "flex items-center justify-between rounded border border-border px-3 py-2 text-sm", children: [_jsxs("span", { children: [payment.date, " \u00B7 ", payment.mode] }), _jsx("span", { className: "font-mono", children: formatCurrency(payment.amount) })] }, payment.id))) }))] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-xl font-semibold", children: "Totals" }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Sub Total" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.subTotal) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Discount" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.discount) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Taxable" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.taxableAmount) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "GST" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.taxTotal) })] }), _jsxs("div", { className: "flex justify-between border-t border-border pt-2 font-semibold", children: [_jsx("span", { children: "Grand Total" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.grandTotal) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Paid" }), _jsx("span", { className: "font-mono text-emerald", children: formatCurrency(data.paidAmount) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Balance Due" }), _jsx("span", { className: "font-mono text-ruby", children: formatCurrency(data.balanceDue) })] })] }), showPayment && (_jsxs("div", { className: "mt-4 space-y-2 border-t border-border pt-3", children: [_jsxs("label", { className: "block text-xs text-muted", children: ["Payment Amount", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", step: "0.01", type: "number", value: paymentAmount, onChange: (event) => setPaymentAmount(Number(event.target.value)) })] }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => paymentMutation.mutate(), type: "button", children: "Save Payment" })] }))] })] }), _jsx(LinkedSettlementsPanel, { targetType: "bill", targetId: data.id, grandTotal: data.grandTotal, partyId: data.supplierId, partyName: data.supplierName ?? data.supplier?.name ?? "Supplier", status: data.status, onSettled: () => void refetch() })] }));
};
