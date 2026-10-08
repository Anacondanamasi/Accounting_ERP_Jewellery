import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { invoiceService } from "@/services/invoiceService";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LinkedSettlementsPanel } from "@/components/shared/LinkedSettlementsPanel";
import { format } from "date-fns";
const toNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
};
export const InvoiceViewPage = () => {
    const navigate = useNavigate();
    const { id = "" } = useParams();
    const [paymentOpen, setPaymentOpen] = useState(false);
    const openInvoicePdf = async (invoiceId, print = false) => {
        const blob = await invoiceService.getPdf(invoiceId);
        const url = URL.createObjectURL(blob);
        if (!print) {
            const link = document.createElement("a");
            link.href = url;
            link.download = `${data?.invoiceNo ?? `invoice-${invoiceId}`}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return;
        }
        const opened = window.open(url, "_blank");
        if (opened) {
            opened.addEventListener("load", () => {
                opened.print();
            });
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
        else {
            URL.revokeObjectURL(url);
            throw new Error("Popup blocked");
        }
    };
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["invoice", id],
        queryFn: () => invoiceService.getById(id),
    });
    const postMutation = useMutation({
        mutationFn: () => invoiceService.post(id),
        onSuccess: () => {
            toast.success("Invoice posted");
            void refetch();
        },
        onError: () => toast.error("Unable to post invoice"),
    });
    const duplicateMutation = useMutation({
        mutationFn: () => invoiceService.duplicate(id),
        onSuccess: (record) => {
            toast.success("Invoice duplicated");
            navigate(`/invoices/${record.id}/edit`);
        },
    });
    const voidMutation = useMutation({
        mutationFn: () => invoiceService.void(id),
        onSuccess: () => {
            toast.success("Invoice voided");
            void refetch();
        },
    });
    if (isLoading || !data) {
        return _jsx("div", { className: "rounded-card bg-card p-6 shadow-card", children: "Loading invoice..." });
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: data.invoiceNo, subtitle: `Customer: ${data.customerName}`, actions: _jsxs(_Fragment, { children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => navigate(`/invoices/${id}/edit`), type: "button", children: "Edit" }), _jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => duplicateMutation.mutate(), type: "button", children: "Duplicate" }), _jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => postMutation.mutate(), type: "button", children: "Post" }), _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm", onClick: async () => {
                                try {
                                    await openInvoicePdf(id);
                                }
                                catch {
                                    toast.error("Unable to download PDF");
                                }
                            }, type: "button", children: [_jsx(Download, { className: "h-4 w-4" }), "PDF"] }), _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm", onClick: async () => {
                                try {
                                    await openInvoicePdf(id, true);
                                }
                                catch {
                                    toast.error("Unable to print PDF");
                                }
                            }, type: "button", children: [_jsx(Printer, { className: "h-4 w-4" }), "Print"] }), _jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => setPaymentOpen(true), type: "button", children: "Record Payment" }), _jsx("button", { className: "h-10 rounded-btn bg-ruby px-4 text-sm text-white", onClick: () => voidMutation.mutate(), type: "button", children: "Void" })] }) }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsxs("div", { className: "mb-3 flex items-center gap-2", children: [_jsx(StatusBadge, { status: data.status }), _jsxs("span", { className: "text-sm text-muted", children: ["Due ", data.dueDate ? format(new Date(data.dueDate), "dd-MMM-yyyy") : ""] })] }), _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gold-tint text-charcoal", children: _jsxs("tr", { children: [_jsx("th", { className: "px-2 py-2 text-left", children: "SKU" }), _jsx("th", { className: "px-2 py-2 text-left", children: "Description" }), _jsx("th", { className: "px-2 py-2 text-left", children: "Karat" }), _jsx("th", { className: "px-2 py-2 text-right", children: "Net Wt" }), _jsx("th", { className: "px-2 py-2 text-right", children: "Rate/g" }), _jsx("th", { className: "px-2 py-2 text-right", children: "GST%" })] }) }), _jsx("tbody", { children: data.lines.map((line, idx) => (_jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "px-2 py-2 font-mono", children: line.sku }), _jsx("td", { className: "px-2 py-2", children: line.description }), _jsx("td", { className: "px-2 py-2", children: line.karat }), _jsx("td", { className: "px-2 py-2 text-right font-mono", children: formatWeight(line.netWt, "g") }), _jsx("td", { className: "px-2 py-2 text-right font-mono", children: formatCurrency(line.ratePerGram) }), _jsx("td", { className: "px-2 py-2 text-right font-mono", children: toNumber(line.gstPct).toFixed(2) })] }, `${line.sku}-${idx}`))) })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-xl font-semibold", children: "Payment History" }), data.payments.length === 0 ? (_jsx("p", { className: "text-sm text-muted", children: "No payments recorded yet." })) : (_jsx("ul", { className: "space-y-2", children: data.payments.map((payment) => (_jsxs("li", { className: "flex items-center justify-between rounded border border-border px-3 py-2 text-sm", children: [_jsxs("span", { children: [payment.date, " \u00B7 ", payment.mode] }), _jsx("span", { className: "font-mono", children: formatCurrency(payment.amount) })] }, payment.id))) }))] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-xl font-semibold", children: "Totals" }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Sub Total" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.subTotal) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Discount" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.discount) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Taxable" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.taxableAmount) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "GST" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.taxTotal) })] }), _jsxs("div", { className: "flex justify-between border-t border-border pt-2 font-semibold", children: [_jsx("span", { children: "Grand Total" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.grandTotal) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Paid" }), _jsx("span", { className: "font-mono text-emerald", children: formatCurrency(data.paidAmount) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Balance Due" }), _jsx("span", { className: "font-mono text-ruby", children: formatCurrency(data.balanceDue) })] })] })] })] }), _jsx(LinkedSettlementsPanel, { targetType: "invoice", targetId: data.id, grandTotal: data.grandTotal, partyId: data.customerId, partyName: data.customerName ?? data.customer?.name ?? "Customer", status: data.status, onSettled: () => void refetch() }), _jsx(RecordPaymentModal, { balanceDue: data.balanceDue, invoiceId: data.id, invoiceNo: data.invoiceNo, onClose: () => setPaymentOpen(false), onSaved: () => void refetch(), open: paymentOpen })] }));
};
