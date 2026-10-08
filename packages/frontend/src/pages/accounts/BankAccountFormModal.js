import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { X, Landmark, CreditCard } from "lucide-react";
import { accountsService } from "@/services/accountsService";
import { bankingService } from "@/services/bankingService";
const bankAccountSchema = z.object({
    accountFormType: z.enum(["BANK", "CREDIT_CARD"]),
    accountName: z.string().min(1, "Account name is required"),
    accountCode: z.string().min(1, "Account code is required"),
    currency: z.string().min(1, "Currency is required"),
    accountNumber: z.string().min(4, "Account number should have at least 4 characters"),
    bankName: z.string().min(1, "Bank name is required"),
    ifsc: z.string().min(4, "IFSC/routing code should have at least 4 characters"),
    description: z.string().max(500).optional(),
    makePrimary: z.boolean().default(false),
    openingBookBalance: z.coerce.number().default(0),
    openingBankBalance: z.coerce.number().default(0),
    mappingType: z.enum(["new", "existing"]),
    accountId: z.coerce.number().optional(),
    groupId: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    if (data.mappingType === "existing") {
        if (!data.accountId || data.accountId <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["accountId"],
                message: "Ledger account mapping is required",
            });
        }
    }
    else {
        if (!data.groupId || data.groupId <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["groupId"],
                message: "Bank Account Group is required",
            });
        }
    }
});
export const BankAccountFormModal = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const { data: groups = [] } = useQuery({
        queryKey: ["account-groups"],
        queryFn: () => accountsService.listGroups(),
        enabled: isOpen,
    });
    const { data: allAccounts = [] } = useQuery({
        queryKey: ["accounts"],
        queryFn: () => accountsService.list({}),
        enabled: isOpen,
    });
    const form = useForm({
        resolver: zodResolver(bankAccountSchema),
        defaultValues: {
            accountFormType: "BANK",
            accountName: "",
            accountCode: "",
            currency: "INR",
            accountNumber: "",
            bankName: "",
            ifsc: "",
            description: "",
            makePrimary: false,
            openingBookBalance: 0,
            openingBankBalance: 0,
            mappingType: "new",
            accountId: 0,
            groupId: 0,
        },
    });
    const watchAccountFormType = form.watch("accountFormType");
    const watchMappingType = form.watch("mappingType");
    useEffect(() => {
        if (isOpen) {
            form.reset({
                accountFormType: "BANK",
                accountName: "",
                accountCode: "",
                currency: "INR",
                accountNumber: "",
                bankName: "",
                ifsc: "",
                description: "",
                makePrimary: false,
                openingBookBalance: 0,
                openingBankBalance: 0,
                mappingType: "new",
                accountId: 0,
                groupId: 0,
            });
        }
    }, [isOpen, form]);
    const bankGroups = useMemo(() => {
        return groups.filter((g) => g.type === "Current Asset" || g.type === "Bank" || g.name.toLowerCase().includes("bank"));
    }, [groups]);
    const creditCardGroups = useMemo(() => {
        return groups.filter((g) => g.type === "Current Liability" ||
            g.type === "Liability" ||
            g.name.toLowerCase().includes("credit") ||
            g.name.toLowerCase().includes("card"));
    }, [groups]);
    const targetGroups = useMemo(() => {
        return watchAccountFormType === "CREDIT_CARD" ? creditCardGroups : bankGroups;
    }, [watchAccountFormType, bankGroups, creditCardGroups]);
    const ledgerAccounts = useMemo(() => {
        if (watchAccountFormType === "CREDIT_CARD") {
            return allAccounts.filter((acc) => acc.type?.toLowerCase().includes("liability") ||
                acc.group?.toLowerCase().includes("liability") ||
                acc.group?.toLowerCase().includes("credit card"));
        }
        else {
            return allAccounts.filter((acc) => acc.type === "Bank" ||
                acc.isBankAccount ||
                acc.group?.toLowerCase().includes("bank"));
        }
    }, [allAccounts, watchAccountFormType]);
    const mutation = useMutation({
        mutationFn: async (data) => {
            let mappedAccountId = data.accountId;
            if (data.mappingType === "new") {
                // Create a new Account in the Chart of Accounts
                const newAccount = await accountsService.create({
                    code: data.accountCode,
                    name: data.accountName,
                    description: data.description || `Bank Account: ${data.accountNumber}`,
                    groupId: data.groupId || null,
                    type: data.accountFormType === "CREDIT_CARD" ? "Liability" : "Bank",
                    openingBalance: data.openingBookBalance,
                    taxCode: "Tax Exempt (0%)",
                    isBankAccount: true,
                    enablePayments: true,
                    showOnDashboard: true,
                    isActive: true,
                    allowManualJournals: true,
                });
                mappedAccountId = newAccount.id;
            }
            // Create BankAccount record linked to the new or existing Account
            return bankingService.createAccount({
                bankName: data.bankName,
                accountName: data.accountName,
                accountNo: data.accountNumber,
                accountNoMasked: data.accountNumber,
                ifsc: data.ifsc,
                accountType: data.accountFormType === "CREDIT_CARD" ? "CASH_CREDIT" : "CURRENT",
                bookBalance: data.openingBookBalance,
                bankBalance: data.openingBankBalance,
                accountId: mappedAccountId,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
            toast.success("Bank account created and mapped successfully");
            onClose();
        },
        onError: (error) => {
            const msg = error?.response?.data?.error?.message ?? "Unable to save bank account";
            const details = error?.response?.data?.error?.details;
            if (details && Array.isArray(details) && details.length > 0) {
                toast.error(`${msg}: ${details[0].message} (${details[0].path.join(".")})`);
            }
            else {
                toast.error(msg);
            }
        },
    });
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm overflow-y-auto", children: _jsxs("div", { className: "w-full max-w-3xl bg-white shadow-xl rounded-card overflow-hidden my-8", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border bg-canvas/30 px-6 py-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [watchAccountFormType === "CREDIT_CARD" ? (_jsx(CreditCard, { className: "h-6 w-6 text-gold" })) : (_jsx(Landmark, { className: "h-6 w-6 text-gold" })), _jsx("h2", { className: "text-xl font-bold text-charcoal", children: "Add Bank or Credit Card" })] }), _jsx("button", { onClick: onClose, className: "rounded-full p-1 text-muted hover:bg-canvas transition-colors", type: "button", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("form", { onSubmit: form.handleSubmit((v) => mutation.mutate(v)), className: "p-6 space-y-6", children: [_jsxs("div", { className: "grid gap-6 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-semibold uppercase tracking-wider text-muted border-b border-border pb-1", children: "Account Details" }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: ["Select Account Type ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsxs("div", { className: "flex items-center gap-4 py-1.5", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm text-charcoal font-medium cursor-pointer", children: [_jsx("input", { type: "radio", value: "BANK", className: "text-gold focus:ring-gold", ...form.register("accountFormType") }), _jsx("span", { children: "Bank Account" })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm text-charcoal font-medium cursor-pointer", children: [_jsx("input", { type: "radio", value: "CREDIT_CARD", className: "text-gold focus:ring-gold", ...form.register("accountFormType") }), _jsx("span", { children: "Credit Card" })] })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: ["Account Name ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsx("input", { type: "text", placeholder: "e.g. Business checking", className: "h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors", ...form.register("accountName") }), form.formState.errors.accountName && (_jsx("p", { className: "mt-1 text-xs text-ruby", children: form.formState.errors.accountName.message }))] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: ["Account Code ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsx("input", { type: "text", placeholder: "e.g. 1002", className: "h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors font-mono", ...form.register("accountCode") }), form.formState.errors.accountCode && (_jsx("p", { className: "mt-1 text-xs text-ruby", children: form.formState.errors.accountCode.message }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: ["Currency ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsxs("select", { className: "h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none bg-white transition-colors", ...form.register("currency"), children: [_jsx("option", { value: "INR", children: "INR" }), _jsx("option", { value: "USD", children: "USD" }), _jsx("option", { value: "AED", children: "AED" }), _jsx("option", { value: "EUR", children: "EUR" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: "IFSC / Code" }), _jsx("input", { type: "text", placeholder: "IFSC Code", className: "h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors", ...form.register("ifsc") }), form.formState.errors.ifsc && (_jsx("p", { className: "mt-1 text-xs text-ruby", children: form.formState.errors.ifsc.message }))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: "Description" }), _jsx("textarea", { placeholder: "Details or notes about this bank/card", rows: 2, className: "w-full rounded-btn border border-border p-3 text-sm focus:border-gold outline-none transition-colors", ...form.register("description") })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-semibold uppercase tracking-wider text-muted border-b border-border pb-1", children: "Bank Details & Mapping" }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: ["Bank Name ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsx("input", { type: "text", placeholder: "e.g. HDFC Bank", className: "h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors", ...form.register("bankName") }), form.formState.errors.bankName && (_jsx("p", { className: "mt-1 text-xs text-ruby", children: form.formState.errors.bankName.message }))] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: ["Account Number ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsx("input", { type: "text", placeholder: "Full Account Number", className: "h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none transition-colors", ...form.register("accountNumber") }), form.formState.errors.accountNumber && (_jsx("p", { className: "mt-1 text-xs text-ruby", children: form.formState.errors.accountNumber.message }))] }), _jsxs("div", { className: "border border-gold-tint bg-gold-tint/10 rounded-card p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("label", { className: "block text-xs font-semibold text-gold", children: ["Chart of Accounts Mapping ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsxs("select", { className: "text-xs font-semibold text-sapphire border border-border bg-white rounded px-2 py-1 outline-none", ...form.register("mappingType"), children: [_jsx("option", { value: "new", children: "Create New Account" }), _jsx("option", { value: "existing", children: "Map Existing Account" })] })] }), watchMappingType === "existing" ? (_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] text-muted mb-1", children: "Select Ledger Account" }), _jsxs("select", { className: "h-9 w-full rounded-btn border border-border px-3 text-sm focus:border-gold bg-white outline-none", ...form.register("accountId", { valueAsNumber: true }), children: [_jsx("option", { value: 0, children: "-- Select Ledger Account --" }), ledgerAccounts.map((acc) => (_jsxs("option", { value: acc.id, children: [acc.name, " (", acc.code, ")"] }, acc.id)))] }), form.formState.errors.accountId && (_jsx("p", { className: "mt-1 text-xs text-ruby", children: form.formState.errors.accountId.message }))] })) : (_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] text-muted mb-1", children: "Bank Account Group" }), _jsxs("select", { className: "h-9 w-full rounded-btn border border-border px-3 text-sm focus:border-gold bg-white outline-none", ...form.register("groupId", { valueAsNumber: true }), children: [_jsx("option", { value: 0, children: "-- Select Group --" }), targetGroups.map((g) => (_jsx("option", { value: g.id, children: g.name }, g.id)))] }), form.formState.errors.groupId && (_jsx("p", { className: "mt-1 text-xs text-ruby", children: form.formState.errors.groupId.message }))] }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: "Opening Balance (Books)" }), _jsx("input", { type: "number", step: "0.01", className: "h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none", ...form.register("openingBookBalance", { valueAsNumber: true }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-charcoal mb-1", children: "Opening Balance (Bank)" }), _jsx("input", { type: "number", step: "0.01", className: "h-10 w-full rounded-btn border border-border px-3 text-sm focus:border-gold outline-none", ...form.register("openingBankBalance", { valueAsNumber: true }) })] })] }), _jsx("div", { className: "pt-2", children: _jsxs("label", { className: "inline-flex items-center gap-2 text-sm text-charcoal font-medium cursor-pointer", children: [_jsx("input", { type: "checkbox", className: "rounded border-border text-gold focus:ring-gold", ...form.register("makePrimary") }), _jsx("span", { children: "Make this primary" })] }) })] })] }), _jsxs("div", { className: "flex justify-end gap-3 border-t border-border pt-4 mt-6", children: [_jsx("button", { onClick: onClose, className: "h-10 rounded-btn border border-border px-6 text-sm font-semibold hover:bg-canvas transition-colors", type: "button", children: "Cancel" }), _jsx("button", { disabled: mutation.isPending, className: "inline-flex h-10 items-center justify-center rounded-btn bg-gold px-6 text-sm font-bold text-white shadow-sm hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-60 transition-colors", type: "submit", children: mutation.isPending ? "Saving..." : "Save" })] })] })] }) }));
};
