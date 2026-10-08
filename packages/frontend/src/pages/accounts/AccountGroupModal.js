import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { accountsService } from "@/services/accountsService";
const accountTypesByHeading = {
    ASSETS: ["Current Asset", "Fixed Asset", "Inventory", "Non-current Asset", "Prepayment", "Bank"],
    EQUITY: ["Equity"],
    EXPENSES: ["Depreciation", "Direct Costs", "Expense", "Overhead"],
    LIABILITIES: ["Current Liability", "Liability", "Non-current Liability"],
    REVENUE: ["Other Income", "Revenue", "Sales"],
};
const groupSchema = z.object({
    name: z.string().trim().min(1, "Group name is required"),
    heading: z.enum(["ASSETS", "EQUITY", "EXPENSES", "LIABILITIES", "REVENUE"]).optional(),
    type: z.string().min(1, "Account type is required"),
    code: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
});
export const AccountGroupModal = ({ isOpen, onClose, initialData }) => {
    const queryClient = useQueryClient();
    const editing = Boolean(initialData);
    const form = useForm({
        resolver: zodResolver(groupSchema),
        defaultValues: initialData || {
            name: "",
            heading: "EXPENSES",
            type: "Expense",
            code: "",
            isActive: true,
        },
    });
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                form.reset({
                    name: initialData.name,
                    heading: initialData.heading,
                    type: initialData.type,
                    code: initialData.code || "",
                    isActive: initialData.isActive,
                });
            }
            else {
                form.reset({ name: "", type: "Expense", code: "", isActive: true });
            }
        }
    }, [form, isOpen, initialData]);
    const mutation = useMutation({
        mutationFn: (data) => editing
            ? accountsService.updateGroup(initialData.id, data)
            : accountsService.createGroup(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["account-groups"] });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            toast.success(editing ? "Account group updated" : "Account group created");
            onClose();
        },
        onError: (error) => {
            const msg = error?.response?.data?.error?.message ?? "Unable to save account group";
            const details = error?.response?.data?.error?.details;
            if (details && Array.isArray(details) && details.length > 0) {
                toast.error(`${msg}: ${details[0].message} (${details[0].path.join('.')})`);
            }
            else {
                toast.error(msg);
            }
        },
    });
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-lg rounded-card border border-border bg-card shadow-card", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-6 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "grid h-10 w-10 place-items-center rounded-full bg-gold/10 text-gold", children: _jsx(Layers, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("h2", { className: "font-display text-xl font-bold text-charcoal", children: editing ? "Edit Account Group" : "New Account Group" }), _jsx("p", { className: "text-xs text-muted", children: "Chart of accounts classification" })] })] }), _jsx("button", { className: "grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-slate-100", onClick: onClose, type: "button", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { className: "space-y-5 p-6", onSubmit: form.handleSubmit((values) => mutation.mutate(values)), children: [_jsx("div", { className: "grid grid-cols-1 gap-4", children: _jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-wider text-muted", children: "Account Type" }), _jsx("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm outline-none transition-colors focus:border-gold", ...form.register("type"), children: Object.entries(accountTypesByHeading).map(([h, types]) => (_jsx("optgroup", { label: h, className: "font-bold text-slate-800 bg-slate-100", children: types.map((t) => (_jsx("option", { value: t, className: "font-normal bg-white text-slate-700", children: t }, t))) }, h))) })] }) }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-wider text-muted", children: "Group Code (Optional)" }), _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm outline-none transition-colors focus:border-gold", ...form.register("code") })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-wider text-muted", children: "Group Name" }), _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm outline-none transition-colors focus:border-gold", ...form.register("name") }), form.formState.errors.name && _jsx("p", { className: "mt-1 text-[10px] text-ruby", children: form.formState.errors.name.message })] })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm font-medium", children: [_jsx("input", { type: "checkbox", ...form.register("isActive"), className: "rounded border-border text-gold focus:ring-gold" }), "Active"] }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx("button", { className: "h-10 flex-1 rounded-btn border border-border text-sm font-medium transition-colors hover:bg-slate-50", onClick: onClose, type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 flex-1 rounded-btn bg-gold text-sm font-bold text-white shadow-lg transition-all hover:bg-gold-dark disabled:opacity-50", disabled: mutation.isPending, children: mutation.isPending ? "Saving..." : (editing ? "Update Group" : "Create Group") })] })] })] }) }));
};
