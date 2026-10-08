import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { accountsService } from "@/services/accountsService";
import { supplierService } from "@/services/supplierService";
import { expenseService } from "@/services/expenseService";
import { formatCurrency } from "@/lib/formatters";
const expenseFormSchema = z.object({
    date: z.string().min(1, "Date is required"),
    paymentMethodLedgerId: z.coerce.number().min(1, "Please select a payment method"),
    expenseLedgerId: z.coerce.number().min(1, "Please select an expense account"),
    amount: z.coerce.number().positive("Amount must be greater than zero"),
    supplierId: z.preprocess((val) => (val === "" || val === null || val === undefined || Number(val) === 0 ? null : Number(val)), z.number().positive().nullable().optional()),
    narration: z.string().optional(),
});
export const ExpenseFormPage = () => {
    const navigate = useNavigate();
    const form = useForm({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: {
            date: new Date().toISOString().slice(0, 10),
            paymentMethodLedgerId: 0,
            expenseLedgerId: 0,
            amount: undefined,
            supplierId: null,
            narration: "",
        },
    });
    const { data: accounts = [] } = useQuery({
        queryKey: ["accounts-list"],
        queryFn: () => accountsService.list(),
    });
    const { data: suppliers = [] } = useQuery({
        queryKey: ["suppliers-list"],
        queryFn: () => supplierService.list(),
    });
    // Filter only Cash / Bank accounts for the payment method
    const cashBankAccounts = accounts.filter((acc) => {
        const type = String(acc.type).toLowerCase();
        const text = `${acc.code} ${acc.name} ${acc.group}`.toLowerCase();
        return ((type === "asset" || type === "assets") &&
            /(cash|bank|current account|savings account|petty cash)/.test(text));
    });
    // Filter only Expense accounts for the expense ledger
    const expenseAccounts = accounts.filter((acc) => ["expense", "expenses"].includes(String(acc.type).toLowerCase()));
    const cashBankOptions = cashBankAccounts.map((a) => ({
        value: String(a.id),
        label: `${a.code} - ${a.name}`,
        meta: a.group,
    }));
    const expenseOptions = expenseAccounts.map((a) => ({
        value: String(a.id),
        label: `${a.code} - ${a.name}`,
        meta: a.group,
    }));
    const supplierOptions = suppliers.map((s) => ({
        value: String(s.id),
        label: s.name,
        meta: s.code,
    }));
    const saveMutation = useMutation({
        mutationFn: (values) => expenseService.create(values),
        onSuccess: () => {
            toast.success("Expense recorded and journal posted successfully!");
            navigate("/expenses");
        },
        onError: (err) => {
            console.error(err);
            const detail = err?.response?.data?.error?.details?.[0]?.message;
            const msg = err?.response?.data?.error?.message ?? err?.message ?? "Failed to save expense";
            toast.error(detail ?? msg);
        },
    });
    const onInvalid = (errors) => {
        console.warn("Form validation errors:", errors);
        toast.error("Please fix the highlighted errors before saving.");
    };
    const onSubmit = form.handleSubmit((values) => saveMutation.mutate(values), onInvalid);
    const watchedAmount = form.watch("amount");
    return (_jsxs("div", { className: "mx-auto max-w-3xl space-y-6 pb-20", children: [_jsx(PageHeader, { title: "Add Direct Expense", subtitle: "Record operational expenses paid directly from Cash or Bank", actions: _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { className: "flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors", onClick: () => navigate("/expenses"), type: "button", children: [_jsx(X, { className: "h-4 w-4" }), " Cancel"] }), _jsxs("button", { className: "flex h-10 items-center gap-2 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:bg-gold-dark disabled:opacity-40 transition-all", disabled: saveMutation.isPending, onClick: onSubmit, type: "button", children: [_jsx(Save, { className: "h-4 w-4" }), saveMutation.isPending ? "Saving…" : "Save & Post"] })] }) }), _jsxs("div", { className: "rounded-card border border-border bg-card p-6 shadow-card space-y-6", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-muted", children: "Date *" }), _jsx("input", { type: "date", className: `h-10 w-full rounded-md border ${form.formState.errors.date ? "border-ruby" : "border-border"} bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all`, ...form.register("date") }), form.formState.errors.date && (_jsx("p", { className: "text-[10px] font-bold uppercase text-ruby", children: form.formState.errors.date.message }))] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-muted", children: "Amount *" }), _jsx("input", { type: "number", step: "0.01", placeholder: "0.00", className: `h-10 w-full rounded-md border ${form.formState.errors.amount ? "border-ruby" : "border-border"} bg-slate-50/50 px-3 text-right text-sm font-mono focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all`, ...form.register("amount") }), form.formState.errors.amount && (_jsx("p", { className: "text-[10px] font-bold uppercase text-ruby", children: form.formState.errors.amount.message }))] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-muted", children: "Expense Via / Payment Method (Cash or Bank) *" }), _jsx(SearchableSelect, { options: cashBankOptions, placeholder: "Select Cash or Bank account\u2026", value: String(form.watch("paymentMethodLedgerId") || ""), onChange: (val) => {
                                    form.setValue("paymentMethodLedgerId", Number(val), { shouldValidate: true });
                                } }), form.formState.errors.paymentMethodLedgerId && (_jsx("p", { className: "text-[10px] font-bold uppercase text-ruby", children: form.formState.errors.paymentMethodLedgerId.message })), _jsx("p", { className: "text-[10px] text-muted", children: "Only Cash ledgers and Bank ledgers are shown." })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-muted", children: "Expense Ledger *" }), _jsx(SearchableSelect, { options: expenseOptions, placeholder: "Select expense account (e.g. Freight, Fuel, Office Expense)\u2026", value: String(form.watch("expenseLedgerId") || ""), onChange: (val) => {
                                    form.setValue("expenseLedgerId", Number(val), { shouldValidate: true });
                                } }), form.formState.errors.expenseLedgerId && (_jsx("p", { className: "text-[10px] font-bold uppercase text-ruby", children: form.formState.errors.expenseLedgerId.message }))] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "text-[11px] font-bold uppercase tracking-wider text-muted", children: ["Supplier Name ", _jsx("span", { className: "text-muted/60 normal-case font-normal", children: "(Optional \u2014 for history only, no outstanding created)" })] }), _jsx(SearchableSelect, { options: [{ value: "", label: "— No Supplier —", meta: "" }, ...supplierOptions], placeholder: "Select supplier (optional)\u2026", value: String(form.watch("supplierId") ?? ""), onChange: (val) => {
                                    form.setValue("supplierId", val === "" ? null : Number(val));
                                } })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-muted", children: "Narration" }), _jsx("input", { type: "text", placeholder: "e.g. Freight paid for gold consignment, May 2024", className: "h-10 w-full rounded-md border border-border bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all", ...form.register("narration") })] })] }), watchedAmount && Number(watchedAmount) > 0 && (_jsxs("div", { className: "rounded-card border border-gold/20 bg-gold/5 p-4 space-y-2", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-gold", children: "Accounting Effect (Preview)" }), _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-[10px] uppercase font-bold text-muted border-b border-border/50", children: [_jsx("th", { className: "pb-2 text-left", children: "Account" }), _jsx("th", { className: "pb-2 text-right w-32", children: "Debit" }), _jsx("th", { className: "pb-2 text-right w-32", children: "Credit" })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { className: "py-1 text-charcoal", children: expenseOptions.find(o => o.value === String(form.watch("expenseLedgerId") || ""))?.label || "Expense Account" }), _jsx("td", { className: "py-1 text-right font-mono font-semibold text-charcoal", children: formatCurrency(Number(watchedAmount)) }), _jsx("td", { className: "py-1 text-right font-mono text-muted", children: "\u2014" })] }), _jsxs("tr", { children: [_jsx("td", { className: "py-1 text-charcoal", children: cashBankOptions.find(o => o.value === String(form.watch("paymentMethodLedgerId") || ""))?.label || "Cash / Bank Account" }), _jsx("td", { className: "py-1 text-right font-mono text-muted", children: "\u2014" }), _jsx("td", { className: "py-1 text-right font-mono font-semibold text-charcoal", children: formatCurrency(Number(watchedAmount)) })] })] })] })] }))] }));
};
