import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { advanceService } from "@/services/advanceService";
import { customerService } from "@/services/customerService";
import { accountsService } from "@/services/accountsService";
import { useMemo, useState } from "react";
const col = createColumnHelper();
export const AdvanceReceiptsPage = () => {
    const [selectedAdvanceId, setSelectedAdvanceId] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState(1);
    const createForm = useForm({
        defaultValues: {
            customerId: 1,
            accountId: "",
            date: new Date().toISOString().slice(0, 10),
            amount: 0,
            mode: "UPI",
            reference: "",
        },
    });
    const applyForm = useForm({
        defaultValues: {
            invoiceId: "",
            amount: 0,
            date: new Date().toISOString().slice(0, 10),
        },
    });
    const { data: advances, isLoading, refetch } = useQuery({
        queryKey: ["advances"],
        queryFn: () => advanceService.list(),
    });
    const { data: accounts } = useQuery({
        queryKey: ["accounts"],
        queryFn: () => accountsService.list(),
    });
    const { data: customers } = useQuery({
        queryKey: ["customers-selector-adv"],
        queryFn: () => customerService.list({}),
    });
    const { data: customerInvoices } = useQuery({
        queryKey: ["adv-customer-invoices", selectedCustomerId],
        queryFn: () => customerService.getInvoices(selectedCustomerId),
        enabled: Boolean(selectedCustomerId),
    });
    const selectedAdvance = useMemo(() => (advances ?? []).find((row) => row.id === selectedAdvanceId), [advances, selectedAdvanceId]);
    const createMutation = useMutation({
        mutationFn: (payload) => advanceService.create(payload),
        onSuccess: (res) => {
            const createdAdvance = res.data ?? res; // Handle depending on axios response shape
            toast.success("Payment received successfully");
            const invoiceIdToApply = applyForm.watch("invoiceId");
            if (invoiceIdToApply) {
                applyMutation.mutate({
                    id: createdAdvance.id,
                    payload: {
                        invoiceId: invoiceIdToApply,
                        amount: createForm.watch("amount"),
                        date: createForm.watch("date"),
                    }
                });
            }
            else {
                createForm.reset();
                applyForm.reset();
                void refetch();
            }
        },
        onError: () => toast.error("Unable to record payment"),
    });
    const applyMutation = useMutation({
        mutationFn: ({ id, payload }) => advanceService.apply(id, payload),
        onSuccess: () => {
            toast.success("Payment allocated to invoice");
            createForm.reset();
            applyForm.reset();
            void refetch();
        },
        onError: (error) => toast.error(error?.response?.data?.error?.message ?? "Unable to apply advance"),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Payment Received", subtitle: "Receive payments from customers and apply against open invoices" }), _jsx("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card max-w-2xl mx-auto", children: _jsxs("form", { className: "space-y-4", onSubmit: createForm.handleSubmit((values) => {
                        const amount = Number(values.amount);
                        if (amount <= 0) {
                            toast.error("Amount must be greater than zero");
                            return;
                        }
                        if (!values.accountId) {
                            toast.error("Please select a Deposit Account");
                            return;
                        }
                        createMutation.mutate({
                            ...values,
                            amount,
                            mode: "BANK_TRANSFER", // Defaulting mode for legacy support, but using accountId for journals
                        });
                    }), children: [_jsx("h3", { className: "font-display text-xl font-semibold border-b border-border pb-2", children: "Receive Payment" }), _jsxs("div", { children: [_jsx("p", { className: "mb-1 text-xs text-muted font-bold uppercase tracking-wider", children: "Select Customer" }), _jsx(SearchableSelect, { onChange: (value) => {
                                        createForm.setValue("customerId", value);
                                        setSelectedCustomerId(value);
                                    }, options: (customers ?? []).map((customer) => ({
                                        value: customer.id,
                                        label: customer.name,
                                        meta: customer.code,
                                    })), value: createForm.watch("customerId") })] }), _jsxs("div", { children: [_jsxs("p", { className: "mb-1 text-xs text-muted font-bold uppercase tracking-wider", children: ["Deposit To (Bank/Cash Account) ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsx(SearchableSelect, { onChange: (value) => createForm.setValue("accountId", value), options: (accounts ?? [])
                                        .filter((acc) => acc.type === "ASSET" && (acc.name.toLowerCase().includes("bank") || acc.name.toLowerCase().includes("cash") || acc.group === "Current Assets"))
                                        .map((acc) => ({
                                        value: acc.id,
                                        label: acc.name,
                                        meta: acc.code,
                                    })), value: createForm.watch("accountId") })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-1 text-xs text-muted font-bold uppercase tracking-wider", children: "Allocate to Invoice (Optional)" }), _jsx(SearchableSelect, { onChange: (value) => {
                                        applyForm.setValue("invoiceId", value);
                                        // Auto-fill amount if an invoice is selected
                                        const invoice = (customerInvoices ?? []).find((inv) => inv.id === value);
                                        if (invoice && Number(createForm.watch("amount")) === 0) {
                                            createForm.setValue("amount", Number(invoice.balanceDue));
                                        }
                                    }, options: (customerInvoices ?? [])
                                        .filter((invoice) => invoice.balanceDue > 0)
                                        .map((invoice) => ({
                                        value: invoice.id,
                                        label: `${invoice.invoiceNo} · ${formatCurrency(invoice.balanceDue)} due`,
                                        meta: invoice.dueDate ? invoice.dueDate.slice(0, 10) : "",
                                    })), value: applyForm.watch("invoiceId") }), applyForm.watch("invoiceId") && (_jsx("p", { className: "mt-1 text-[11px] text-emerald", children: "Payment will be automatically applied to this invoice." }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-xs text-muted font-bold uppercase tracking-wider", children: ["Date", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm font-mono text-charcoal", type: "date", ...createForm.register("date") })] }), _jsxs("label", { className: "block text-xs text-muted font-bold uppercase tracking-wider", children: ["Amount", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm font-mono text-charcoal", step: "0.01", min: "0", type: "number", ...createForm.register("amount", { valueAsNumber: true }) })] })] }), _jsxs("label", { className: "block text-xs text-muted font-bold uppercase tracking-wider", children: ["Reference / Notes", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", placeholder: "e.g. UTR Number or Transfer Details", ...createForm.register("reference") })] }), _jsx("div", { className: "pt-2", children: _jsx("button", { className: "h-10 w-full rounded-btn bg-gold px-4 text-sm font-bold text-white shadow hover:bg-gold/90 disabled:opacity-50", type: "submit", disabled: createMutation.isPending || applyMutation.isPending, children: createMutation.isPending || applyMutation.isPending ? "Processing..." : "Save Payment" }) })] }) }), _jsx(DataTable, { columns: [
                    col.accessor("id", { header: "Advance ID" }),
                    col.accessor("date", { header: "Date" }),
                    col.accessor("customerId", { header: "Customer ID" }),
                    col.accessor("mode", { header: "Mode" }),
                    col.accessor("amount", {
                        header: "Amount",
                        cell: (info) => _jsx("span", { className: "font-mono text-emerald font-semibold", children: formatCurrency(info.getValue()) }),
                    }),
                ], data: advances ?? [], loading: isLoading })] }));
};
