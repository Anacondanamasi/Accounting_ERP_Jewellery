import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { customerService } from "@/services/customerService";
const customerSchema = z.object({
    code: z.string().min(1, "Code is required"),
    name: z.string().min(1, "Name is required"),
    mobile: z.string().min(6, "Mobile is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    gstin: z.string().optional(),
    city: z.string().min(1, "City is required"),
    category: z.enum(["B2B", "RETAIL"]),
    creditLimit: z.coerce.number().nonnegative(),
    creditDays: z.coerce.number().int().nonnegative(),
    notes: z.string().optional(),
});
export const CustomerFormModal = ({ open, initialData, onClose, onSaved, }) => {
    const [tab, setTab] = useState("basic");
    const editing = Boolean(initialData?.id);
    const form = useForm({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            code: initialData?.code ?? "",
            name: initialData?.name ?? "",
            mobile: initialData?.mobile ?? "",
            email: initialData?.email ?? "",
            gstin: initialData?.gstin ?? "",
            city: initialData?.city ?? "",
            category: initialData?.category ?? "RETAIL",
            creditLimit: initialData?.creditLimit ?? 0,
            creditDays: initialData?.creditDays ?? 0,
            notes: initialData?.notes ?? "",
        },
    });
    useEffect(() => {
        form.reset({
            code: initialData?.code ?? "",
            name: initialData?.name ?? "",
            mobile: initialData?.mobile ?? "",
            email: initialData?.email ?? "",
            gstin: initialData?.gstin ?? "",
            city: initialData?.city ?? "",
            category: initialData?.category ?? "RETAIL",
            creditLimit: initialData?.creditLimit ?? 0,
            creditDays: initialData?.creditDays ?? 0,
            notes: initialData?.notes ?? "",
        });
    }, [form, initialData, open]);
    const mutation = useMutation({
        mutationFn: async (payload) => editing ? customerService.update(initialData.id, payload) : customerService.create(payload),
        onSuccess: () => {
            toast.success(editing ? "Customer updated" : "Customer created");
            onSaved();
            onClose();
        },
        onError: () => toast.error("Unable to save customer"),
    });
    if (!open) {
        return null;
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4", onClick: (event) => {
            if (event.currentTarget === event.target)
                onClose();
        }, children: _jsxs("form", { className: "w-full max-w-3xl rounded-card bg-card p-6 shadow-modal", onSubmit: form.handleSubmit((values) => mutation.mutate(values)), children: [_jsx("h3", { className: "mb-4 font-display text-2xl font-semibold text-charcoal", children: editing ? "Edit Customer" : "Add Customer" }), _jsxs("div", { className: "mb-4 flex gap-2", children: [_jsx("button", { className: `rounded-full px-3 py-1 text-xs ${tab === "basic" ? "bg-gold text-white" : "bg-slate-100"}`, onClick: () => setTab("basic"), type: "button", children: "Basic Info" }), _jsx("button", { className: `rounded-full px-3 py-1 text-xs ${tab === "financial" ? "bg-gold text-white" : "bg-slate-100"}`, onClick: () => setTab("financial"), type: "button", children: "Financial" }), _jsx("button", { className: `rounded-full px-3 py-1 text-xs ${tab === "tax" ? "bg-gold text-white" : "bg-slate-100"}`, onClick: () => setTab("tax"), type: "button", children: "GST & Tax" }), _jsx("button", { className: `rounded-full px-3 py-1 text-xs ${tab === "notes" ? "bg-gold text-white" : "bg-slate-100"}`, onClick: () => setTab("notes"), type: "button", children: "Notes" })] }), tab === "basic" && (_jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Code", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("code") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Customer Name", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("name") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Mobile", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("mobile") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Email", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("email") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["City", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("city") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Category", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("category"), children: [_jsx("option", { value: "RETAIL", children: "Retail" }), _jsx("option", { value: "B2B", children: "B2B" })] })] })] })), tab === "financial" && (_jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Credit Limit", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", step: "0.01", type: "number", ...form.register("creditLimit", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Credit Days", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register("creditDays", { valueAsNumber: true }) })] })] })), tab === "tax" && (_jsx("div", { className: "grid gap-3 md:grid-cols-2", children: _jsxs("label", { className: "text-xs text-muted", children: ["GSTIN", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("gstin") })] }) })), tab === "notes" && (_jsxs("label", { className: "text-xs text-muted", children: ["Notes", _jsx("textarea", { className: "mt-1 min-h-24 w-full rounded border border-border px-3 py-2 text-sm", ...form.register("notes") })] })), _jsx("div", { className: "mt-2 text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message }), _jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: onClose, type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: mutation.isPending, type: "submit", children: editing ? "Update Customer" : "Create Customer" })] })] }) }));
};
