import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { accountsService } from "@/services/accountsService";
const accountSchema = z.object({
    code: z.string().min(1, "Code is required"),
    name: z.string().min(1, "Account name is required"),
    description: z.string().optional().nullable(),
    groupId: z.coerce.number().optional(),
    type: z.string().optional(),
    openingBalance: z.coerce.number().default(0),
    taxCode: z.string().optional().nullable(),
    taxTreatment: z.string().optional().nullable(),
    showOnDashboard: z.boolean().default(false),
    showInExpenseClaims: z.boolean().default(false),
    enablePayments: z.boolean().default(false),
    allowManualJournals: z.boolean().default(true),
    allowReconciliation: z.boolean().default(false),
    isBankAccount: z.boolean().default(false),
    isCashAccount: z.boolean().default(false),
    isControlAccount: z.boolean().default(false),
    cashFlowCategory: z.string().optional().nullable(),
    financialCategory: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
});
const accountTypesByHeading = {
    ASSETS: ["Current Asset", "Fixed Asset", "Inventory", "Non-current Asset", "Prepayment"],
    EQUITY: ["Equity"],
    EXPENSES: ["Depreciation", "Direct Costs", "Expense", "Overhead"],
    LIABILITIES: ["Current Liability", "Liability", "Non-current Liability"],
    REVENUE: ["Other Income", "Revenue", "Sales"],
};
export const AccountFormModal = ({ isOpen, onClose, initialData, onCreateGroup }) => {
    const queryClient = useQueryClient();
    const editing = Boolean(initialData);
    const [selectedType, setSelectedType] = useState("");
    const { data: groups = [] } = useQuery({
        queryKey: ["account-groups"],
        queryFn: () => accountsService.listGroups(),
        enabled: isOpen,
    });
    const form = useForm({
        resolver: zodResolver(accountSchema),
        defaultValues: initialData || {
            code: "",
            name: "",
            description: "",
            groupId: 0,
            type: "",
            openingBalance: 0,
            taxCode: "Tax Exempt (0%)",
            taxTreatment: "",
            showOnDashboard: false,
            showInExpenseClaims: false,
            enablePayments: false,
            allowManualJournals: true,
            allowReconciliation: false,
            isBankAccount: false,
            isCashAccount: false,
            isControlAccount: false,
            cashFlowCategory: "",
            financialCategory: "",
            isActive: true,
        },
    });
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                form.reset({
                    code: initialData.code ?? "",
                    name: initialData.name ?? "",
                    description: initialData.description ?? "",
                    groupId: initialData.groupId ?? initialData.accountGroup?.id ?? 0,
                    openingBalance: initialData.openingBalance ?? 0,
                    taxCode: initialData.taxCode ?? "Tax Exempt (0%)",
                    taxTreatment: initialData.taxTreatment ?? "",
                    showOnDashboard: initialData.showOnDashboard ?? false,
                    showInExpenseClaims: initialData.showInExpenseClaims ?? false,
                    enablePayments: initialData.enablePayments ?? false,
                    allowManualJournals: initialData.allowManualJournals ?? true,
                    allowReconciliation: initialData.allowReconciliation ?? false,
                    isBankAccount: initialData.isBankAccount ?? false,
                    isCashAccount: initialData.isCashAccount ?? false,
                    isControlAccount: initialData.isControlAccount ?? false,
                    cashFlowCategory: initialData.cashFlowCategory ?? "",
                    financialCategory: initialData.financialCategory ?? "",
                    isActive: initialData.isActive ?? true,
                });
                setSelectedType(initialData.type || initialData.accountGroup?.type || "");
            }
            else {
                form.reset({
                    code: "",
                    name: "",
                    description: "",
                    groupId: 0,
                    openingBalance: 0,
                    taxCode: "Tax Exempt (0%)",
                    taxTreatment: "",
                    showOnDashboard: false,
                    showInExpenseClaims: false,
                    enablePayments: false,
                    allowManualJournals: true,
                    allowReconciliation: false,
                    isBankAccount: false,
                    isCashAccount: false,
                    isControlAccount: false,
                    cashFlowCategory: "",
                    financialCategory: "",
                    isActive: true,
                });
                setSelectedType("");
            }
        }
    }, [initialData, form, isOpen]);
    const mutation = useMutation({
        mutationFn: (data) => {
            const payload = { ...data, type: selectedType };
            return editing
                ? accountsService.update(initialData.id, payload)
                : accountsService.create(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            toast.success(editing ? "Account updated" : "Account created");
            onClose();
        },
        onError: (error) => {
            const msg = error?.response?.data?.error?.message ?? "Unable to save account";
            const details = error?.response?.data?.error?.details;
            if (details && Array.isArray(details) && details.length > 0) {
                toast.error(`${msg}: ${details[0].message} (${details[0].path.join('.')})`);
            }
            else {
                toast.error(msg);
            }
        },
    });
    const deleteMutation = useMutation({
        mutationFn: () => accountsService.delete(initialData.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            toast.success("Account deleted successfully");
            onClose();
        },
        onError: (error) => {
            const msg = error?.response?.data?.error?.message ?? "Failed to delete account";
            toast.error(msg);
        },
    });
    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this account?")) {
            deleteMutation.mutate();
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex justify-center bg-charcoal/50 p-4 pt-16 backdrop-blur-sm overflow-y-auto", children: _jsxs("div", { className: "w-full max-w-[500px] bg-white shadow-xl h-fit", children: [_jsx("div", { className: "px-6 pt-6 pb-3 border-b border-slate-200", children: _jsx("h2", { className: "text-[22px] font-bold text-[#333333]", children: editing ? "Edit Account" : "Add New Account" }) }), _jsxs("form", { className: "p-6 space-y-5", onSubmit: form.handleSubmit((v) => mutation.mutate(v)), children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-[#333333]", children: "Account Type" }), _jsxs("div", { className: "relative inline-block mt-1", children: [_jsxs("select", { className: "h-[28px] w-[200px] rounded-sm border border-[#cccccc] pl-2 pr-6 text-[13px] bg-gradient-to-b from-white to-[#f5f5f5] focus:border-[#0082c3] outline-none appearance-none shadow-sm", value: selectedType, onChange: (e) => {
                                                setSelectedType(e.target.value);
                                                form.setValue("groupId", 0);
                                            }, children: [_jsx("option", { value: "", children: "Select type" }), Object.entries(accountTypesByHeading).map(([heading, types]) => (_jsx("optgroup", { label: heading, className: "font-bold text-slate-800 bg-slate-100", children: types.map((type) => (_jsx("option", { value: type, className: "font-normal bg-white text-slate-700", children: type }, type))) }, heading)))] }), _jsx("div", { className: "pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 border-l border-[#cccccc] bg-[#f0f0f0]", children: _jsx("svg", { className: "h-3 w-3 fill-current", viewBox: "0 0 20 20", children: _jsx("path", { d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z", clipRule: "evenodd", fillRule: "evenodd" }) }) })] })] }), selectedType && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-[#333333]", children: "Group" }), _jsxs("div", { className: "relative inline-block mt-1", children: [_jsxs("select", { className: "h-[28px] w-[200px] rounded-sm border border-[#cccccc] pl-2 pr-6 text-[13px] bg-gradient-to-b from-white to-[#f5f5f5] focus:border-[#0082c3] outline-none appearance-none shadow-sm", ...form.register("groupId"), children: [_jsx("option", { value: 0, children: "Select group" }), groups.filter(g => g.type === selectedType).map(g => (_jsx("option", { value: g.id, children: g.name }, g.id)))] }), _jsx("div", { className: "pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 border-l border-[#cccccc] bg-[#f0f0f0]", children: _jsx("svg", { className: "h-3 w-3 fill-current", viewBox: "0 0 20 20", children: _jsx("path", { d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z", clipRule: "evenodd", fillRule: "evenodd" }) }) })] }), form.formState.errors.groupId && _jsx("p", { className: "mt-1 text-[11px] text-red-500", children: form.formState.errors.groupId.message })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-[#333333]", children: "Code" }), _jsx("p", { className: "text-[13px] text-[#666666] mb-1", children: "A unique code/number for this account (limited to 10 characters)" }), _jsx("input", { className: "h-[28px] w-[150px] rounded-sm border border-[#cccccc] px-2 text-[13px] focus:border-[#0082c3] outline-none shadow-inner", maxLength: 10, ...form.register("code") }), form.formState.errors.code && _jsx("p", { className: "mt-1 text-[11px] text-red-500", children: form.formState.errors.code.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-[#333333]", children: "Name" }), _jsx("p", { className: "text-[13px] text-[#666666] mb-1", children: "A short title for this account (limited to 150 characters)" }), _jsx("input", { className: "h-[28px] w-full rounded-sm border border-[#cccccc] px-2 text-[13px] focus:border-[#0082c3] outline-none shadow-inner", maxLength: 150, ...form.register("name") }), form.formState.errors.name && _jsx("p", { className: "mt-1 text-[11px] text-red-500", children: form.formState.errors.name.message })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-[#333333]", children: ["Description ", _jsx("span", { className: "font-normal", children: "(optional)" })] }), _jsx("p", { className: "text-[13px] text-[#666666] mb-1", children: "A description of how this account should be used" }), _jsx("textarea", { className: "h-[60px] w-full rounded-sm border border-[#cccccc] p-2 text-[13px] focus:border-[#0082c3] outline-none resize-none shadow-inner", ...form.register("description") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-[#333333]", children: "Tax" }), _jsx("p", { className: "text-[13px] text-[#666666] mb-1", children: "The default tax setting for this account" }), _jsxs("div", { className: "relative inline-block mt-1", children: [_jsxs("select", { className: "h-[28px] w-[250px] rounded-sm border border-[#cccccc] pl-2 pr-6 text-[13px] bg-gradient-to-b from-white to-[#f5f5f5] focus:border-[#0082c3] outline-none appearance-none shadow-sm", ...form.register("taxCode"), children: [_jsx("option", { value: "Tax Exempt (0%)", children: "Tax Exempt (0%)" }), _jsx("option", { value: "Tax on Purchases (0%)", children: "Tax on Purchases (0%)" }), _jsx("option", { value: "Tax on Sales (0%)", children: "Tax on Sales (0%)" })] }), _jsx("div", { className: "pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 border-l border-[#cccccc] bg-[#f0f0f0]", children: _jsx("svg", { className: "h-3 w-3 fill-current", viewBox: "0 0 20 20", children: _jsx("path", { d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z", clipRule: "evenodd", fillRule: "evenodd" }) }) })] })] }), _jsxs("div", { className: "space-y-2 pt-2 pb-6 border-b border-slate-200", children: [_jsxs("label", { className: "flex items-center gap-2 text-[13px] text-[#333333]", children: [_jsx("input", { type: "checkbox", ...form.register("showOnDashboard"), className: "rounded-sm border-[#cccccc]" }), "Show on Dashboard Watchlist"] }), _jsxs("label", { className: "flex items-center gap-2 text-[13px] text-[#333333]", children: [_jsx("input", { type: "checkbox", ...form.register("showInExpenseClaims"), className: "rounded-sm border-[#cccccc]" }), "Show in Expense Claims"] }), _jsxs("label", { className: "flex items-center gap-2 text-[13px] text-[#333333]", children: [_jsx("input", { type: "checkbox", ...form.register("enablePayments"), className: "rounded-sm border-[#cccccc]" }), "Enable payments to this account"] }), editing && (_jsxs("label", { className: "flex items-center gap-2 text-[13px] text-[#333333] font-bold", children: [_jsx("input", { type: "checkbox", ...form.register("isActive"), className: "rounded-sm border-[#cccccc]" }), "Active"] }))] }), _jsxs("div", { className: "flex items-center justify-center gap-3 pt-2 pb-4", children: [editing && (_jsx("button", { className: "h-[34px] w-[100px] rounded-[3px] bg-[#d9534f] hover:bg-[#c9302c] text-[14px] font-bold text-white shadow-sm border border-[#d43f3a] transition-colors disabled:opacity-50", onClick: handleDelete, type: "button", disabled: deleteMutation.isPending, children: deleteMutation.isPending ? "..." : "Delete" })), _jsx("button", { className: "h-[34px] w-[100px] rounded-[3px] bg-[#8dc63f] text-[14px] font-bold text-white hover:bg-[#7eb238] shadow-sm border border-[#7ab033] disabled:opacity-50 transition-colors", disabled: mutation.isPending, children: mutation.isPending ? "..." : "Save" }), _jsx("button", { className: "h-[34px] w-[100px] rounded-[3px] bg-gradient-to-b from-[#b8bdc2] to-[#9a9fa5] text-[14px] font-bold text-white hover:from-[#a8adb2] hover:to-[#8a8f95] shadow-sm border border-[#8a8f95] transition-colors", onClick: onClose, type: "button", children: "Cancel" })] })] })] }) }));
};
