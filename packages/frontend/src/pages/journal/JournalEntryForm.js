import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Save, Send, X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { journalService } from "@/services/journalService";
import { accountsService } from "@/services/accountsService";
import { formatCurrency } from "@/lib/formatters";
const lineSchema = z.object({
    accountId: z.coerce.number().min(1, "Please select an account"),
    debit: z.coerce.number().min(0).optional().default(0),
    credit: z.coerce.number().min(0).optional().default(0),
    narration: z.string().optional(),
}).refine(data => (data.debit || 0) > 0 || (data.credit || 0) > 0, {
    message: "Enter either a Debit or Credit amount",
    path: ["debit"],
});
const journalSchema = z.object({
    date: z.string().min(1, "Date is required"),
    reference: z.string().optional(),
    narration: z.string().optional(), // Now optional
    lines: z.array(lineSchema).min(2, "At least two lines are required"),
});
const defaultLine = {
    accountId: 0,
    debit: 0,
    credit: 0,
    narration: "",
};
export const JournalEntryForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const editing = Boolean(id);
    const form = useForm({
        resolver: zodResolver(journalSchema),
        defaultValues: {
            date: new Date().toISOString().slice(0, 10),
            reference: "",
            narration: "",
            lines: [
                { ...defaultLine },
                { ...defaultLine },
            ],
        },
    });
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    });
    const { data: accounts = [] } = useQuery({
        queryKey: ["accounts-list"],
        queryFn: () => accountsService.list(),
    });
    const { data: entry } = useQuery({
        queryKey: ["journal", id],
        queryFn: () => journalService.getById(id),
        enabled: editing,
    });
    useEffect(() => {
        if (!entry || !editing)
            return;
        form.reset({
            date: entry.date,
            reference: entry.reference ?? "",
            narration: entry.narration ?? "",
            lines: entry.lines.map((line) => ({
                accountId: line.accountId,
                debit: Number(line.debit) || 0,
                credit: Number(line.credit) || 0,
                narration: line.narration ?? "",
            })),
        });
    }, [editing, entry, form]);
    const accountOptions = accounts.map((a) => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
        meta: a.group,
    }));
    const watchedLines = form.watch("lines");
    const totals = (watchedLines || []).reduce((acc, line) => {
        acc.debit += Number(line?.debit || 0);
        acc.credit += Number(line?.credit || 0);
        return acc;
    }, { debit: 0, credit: 0 });
    const difference = Math.abs(totals.debit - totals.credit);
    const balanced = difference < 0.01 && totals.debit > 0;
    const transformToApi = (values) => ({
        ...values,
        narration: values.narration || "Journal Entry", // Default narration for backend if empty
        lines: values.lines.map(l => ({
            accountId: l.accountId,
            drCr: (l.debit || 0) > 0 ? "DR" : "CR",
            amount: (l.debit || 0) > 0 ? l.debit : l.credit,
            narration: l.narration,
        })),
    });
    const saveMutation = useMutation({
        mutationFn: (values) => {
            const payload = transformToApi(values);
            return editing ? journalService.update(id, payload) : journalService.create(payload);
        },
        onSuccess: () => {
            toast.success("Journal saved successfully");
            navigate(`/journal`);
        },
        onError: (err) => {
            console.error(err);
            toast.error(err.response?.data?.message || "Unable to save journal entry");
        },
    });
    const postMutation = useMutation({
        mutationFn: async (values) => {
            const payload = transformToApi(values);
            const record = editing ? await journalService.update(id, payload) : await journalService.create(payload);
            return journalService.post(record.id);
        },
        onSuccess: () => {
            toast.success("Journal posted successfully");
            navigate("/journal");
        },
        onError: (err) => {
            console.error(err);
            toast.error(err.response?.data?.message || "Unable to post journal");
        },
    });
    const onInvalid = (errors) => {
        console.warn("Form Validation Errors:", errors);
        toast.error("Please fix the errors in the form before submitting.");
    };
    const onSave = form.handleSubmit((values) => saveMutation.mutate(values), onInvalid);
    const onPost = form.handleSubmit((values) => postMutation.mutate(values), onInvalid);
    const handleDebitChange = (index, value) => {
        const val = parseFloat(value) || 0;
        form.setValue(`lines.${index}.debit`, val);
        if (val > 0) {
            form.setValue(`lines.${index}.credit`, 0);
        }
    };
    const handleCreditChange = (index, value) => {
        const val = parseFloat(value) || 0;
        form.setValue(`lines.${index}.credit`, val);
        if (val > 0) {
            form.setValue(`lines.${index}.debit`, 0);
        }
    };
    return (_jsxs("div", { className: "mx-auto max-w-6xl space-y-6 pb-20", children: [_jsx(PageHeader, { title: editing ? "Edit Journal Entry" : "New Journal Entry", subtitle: "Manage accounting adjustments and internal transfers", actions: _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { className: "flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors", onClick: () => navigate("/journal"), type: "button", children: [_jsx(X, { className: "h-4 w-4" }), " Cancel"] }), _jsxs("button", { className: "flex h-10 items-center gap-2 rounded-btn border border-gold/30 bg-white px-4 text-sm font-semibold text-charcoal hover:bg-gold/5 transition-colors", onClick: () => onSave(), type: "button", children: [_jsx(Save, { className: "h-4 w-4 text-gold" }), " Save Draft"] }), _jsxs("button", { className: "flex h-10 items-center gap-2 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:bg-gold-dark disabled:opacity-40 disabled:shadow-none transition-all", disabled: !balanced || saveMutation.isPending || postMutation.isPending, onClick: () => onPost(), type: "button", children: [_jsx(Send, { className: "h-4 w-4" }), " Post Entry"] })] }) }), _jsxs("div", { className: "grid gap-6 rounded-card border border-border bg-card p-6 shadow-card md:grid-cols-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-muted", children: "Date" }), _jsx("input", { className: "h-10 w-full rounded-md border border-border bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all", type: "date", ...form.register("date") })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-muted", children: "Reference #" }), _jsx("input", { className: "h-10 w-full rounded-md border border-border bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all", placeholder: "e.g. JVN-2024-001", ...form.register("reference") })] }), _jsxs("div", { className: "md:col-span-2 space-y-1.5", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-muted", children: "Main Narration" }), _jsx("input", { className: "h-10 w-full rounded-md border border-border bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all", placeholder: "Describe the purpose of this entry...", ...form.register("narration") })] })] }), _jsxs("div", { className: "rounded-card border border-border bg-card shadow-card", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border bg-slate-50/50 px-6 py-3", children: [_jsx("h2", { className: "text-sm font-bold uppercase tracking-widest text-slate-500", children: "Transaction Lines" }), _jsxs("button", { className: "inline-flex h-8 items-center gap-1.5 rounded-md bg-white border border-border px-3 text-xs font-bold text-gold hover:bg-slate-50 transition-colors shadow-sm", onClick: () => append({ ...defaultLine }), type: "button", children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), " Add New Line"] })] }), _jsx("div", { className: "p-0 min-h-[300px]", children: _jsxs("table", { className: "w-full border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-50/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border", children: [_jsx("th", { className: "px-6 py-3 font-bold", children: "Account Selection" }), _jsx("th", { className: "w-36 px-3 py-3 text-right", children: "Debit" }), _jsx("th", { className: "w-36 px-3 py-3 text-right", children: "Credit" }), _jsx("th", { className: "px-3 py-3", children: "Line Narration" }), _jsx("th", { className: "w-12 px-6 py-3 text-center" })] }) }), _jsx("tbody", { className: "divide-y divide-border/50", children: fields.map((field, index) => (_jsxs("tr", { className: "group hover:bg-slate-50/30 transition-colors", children: [_jsx("td", { className: "px-6 py-4 align-top", children: _jsxs("div", { className: "relative z-[40]", children: [_jsx(SearchableSelect, { onChange: (val) => {
                                                                form.setValue(`lines.${index}.accountId`, Number(val));
                                                                form.clearErrors(`lines.${index}.accountId`);
                                                            }, options: accountOptions.map(o => ({ ...o, value: String(o.value) })), placeholder: "Select an account...", value: String(form.watch(`lines.${index}.accountId`) || "") }), form.formState.errors.lines?.[index]?.accountId && (_jsx("p", { className: "mt-1 text-[10px] text-ruby font-bold uppercase tracking-tight", children: form.formState.errors.lines[index].accountId?.message }))] }) }), _jsx("td", { className: "px-3 py-4 align-top", children: _jsx("input", { className: `h-10 w-full rounded-md border ${form.formState.errors.lines?.[index]?.debit ? 'border-ruby bg-ruby/5' : 'border-border bg-white'} px-3 text-right text-sm font-mono focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all`, placeholder: "0.00", step: "0.01", type: "number", value: form.watch(`lines.${index}.debit`) || "", onChange: (e) => handleDebitChange(index, e.target.value) }) }), _jsx("td", { className: "px-3 py-4 align-top", children: _jsx("input", { className: `h-10 w-full rounded-md border ${form.formState.errors.lines?.[index]?.credit ? 'border-ruby bg-ruby/5' : 'border-border bg-white'} px-3 text-right text-sm font-mono focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all`, placeholder: "0.00", step: "0.01", type: "number", value: form.watch(`lines.${index}.credit`) || "", onChange: (e) => handleCreditChange(index, e.target.value) }) }), _jsx("td", { className: "px-3 py-4 align-top", children: _jsx("input", { className: "h-10 w-full rounded-md border border-border bg-white px-3 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all", placeholder: "Line remark...", ...form.register(`lines.${index}.narration`) }) }), _jsx("td", { className: "px-6 py-4 align-top text-center", children: _jsx("button", { className: "p-2 mt-1 rounded-md text-slate-300 hover:text-ruby hover:bg-ruby/5 transition-all opacity-0 group-hover:opacity-100", onClick: () => remove(index), type: "button", title: "Remove Line", children: _jsx(Trash2, { className: "h-4 w-4" }) }) })] }, field.id))) }), _jsx("tfoot", { children: _jsxs("tr", { className: "bg-slate-50/50 border-t border-border font-medium", children: [_jsx("td", { className: "px-6 py-6 text-right text-xs font-bold uppercase text-muted", children: "Grand Total" }), _jsx("td", { className: "px-3 py-6 text-right font-mono text-base font-bold text-charcoal", children: formatCurrency(totals.debit) }), _jsx("td", { className: "px-3 py-6 text-right font-mono text-base font-bold text-charcoal", children: formatCurrency(totals.credit) }), _jsx("td", { colSpan: 2, className: "px-6 py-6", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `h-3 w-3 rounded-full ${balanced ? "bg-emerald shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-ruby shadow-[0_0_8px_rgba(239,68,68,0.5)]"}` }), _jsx("span", { className: `text-xs font-bold uppercase tracking-wider ${balanced ? "text-emerald" : "text-ruby"}`, children: balanced ? "Journal Balanced" : `Unbalanced: ${formatCurrency(difference)}` })] }) })] }) })] }) })] }), !balanced && totals.debit > 0 && (_jsx("div", { className: "rounded-md bg-ruby/5 border border-ruby/20 p-4 animate-in fade-in slide-in-from-top-2", children: _jsxs("p", { className: "text-xs font-medium text-ruby", children: [_jsx("strong", { children: "Warning:" }), " The journal entry is currently unbalanced by ", _jsx("strong", { children: formatCurrency(difference) }), ". Accounting standards require total debits to equal total credits before posting."] }) }))] }));
};
