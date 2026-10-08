import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { EmptyState } from "@/components/shared/EmptyState";
import { FileUploadZone } from "@/components/shared/FileUploadZone";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { bankingService } from "@/services/bankingService";
import { BankingTabs } from "./BankingTabs";
const importFormSchema = z.object({
    bankAccountId: z.coerce.number(),
    format: z.enum(["AUTO", "CSV", "OFX", "QFX", "PDF"]),
    fromDate: z.string().min(1, "From date is required"),
    toDate: z.string().min(1, "To date is required"),
});
const parseCsvPreview = async (file) => {
    const text = await file.text();
    const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (rows.length <= 1) {
        return [];
    }
    const parsed = rows.slice(1).map((line) => {
        const cols = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
        return {
            date: cols[0] ?? "",
            description: cols[1] ?? "",
            debit: Number(cols[2] ?? 0),
            credit: Number(cols[3] ?? 0),
            balance: Number(cols[4] ?? 0),
        };
    });
    return parsed.filter((row) => row.date && row.description).slice(0, 20);
};
export const BankImportPage = () => {
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [preview, setPreview] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [importSummary, setImportSummary] = useState(null);
    const form = useForm({
        resolver: zodResolver(importFormSchema),
        defaultValues: {
            bankAccountId: searchParams.get("accountId") ?? 1,
            format: "AUTO",
            fromDate: "2025-04-01",
            toDate: "2025-04-30",
        },
    });
    const { data: accounts = [], isLoading: accountsLoading, isError: accountError, refetch: refetchAccounts, } = useQuery({
        queryKey: ["bank-import-accounts"],
        queryFn: () => bankingService.listAccounts(),
    });
    const importMutation = useMutation({
        mutationFn: async () => {
            const values = form.getValues();
            return bankingService.importStatement(values.bankAccountId, {
                format: values.format,
                fromDate: values.fromDate,
                toDate: values.toDate,
                fileName: selectedFiles[0]?.name ?? null,
                previewRows: preview,
            });
        },
        onSuccess: (result) => {
            setImportSummary({
                importedRows: result.importedRows,
                duplicatesSkipped: result.duplicatesSkipped,
            });
            setStep(3);
            toast.success("Statement imported");
        },
        onError: () => toast.error("Unable to import statement"),
    });
    const selectedAccountId = form.watch("bankAccountId");
    const selectedFormat = form.watch("format");
    const previewRows = useMemo(() => preview.length
        ? preview
        : [
            {
                date: "2025-04-28",
                description: "UPI CR KIRAN JEWELS",
                debit: 0,
                credit: 100000,
                balance: 1841850,
            },
            {
                date: "2025-04-27",
                description: "NEFT SHREE BULLION",
                debit: 200000,
                credit: 0,
                balance: 1641850,
            },
        ], [preview]);
    const onParsePreview = async () => {
        const values = form.getValues();
        const validation = importFormSchema.safeParse(values);
        if (!validation.success) {
            validation.error.issues.forEach((issue) => {
                form.setError(issue.path[0], {
                    message: issue.message,
                });
            });
            return;
        }
        if (!selectedFiles.length) {
            toast.error("Please upload a statement file first");
            return;
        }
        if (values.format === "CSV" || values.format === "AUTO") {
            const rows = await parseCsvPreview(selectedFiles[0]);
            if (!rows.length) {
                toast.error("Unable to parse preview rows from file");
                return;
            }
            setPreview(rows);
        }
        else {
            setPreview([]);
        }
        setStep(2);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Import Bank Statement", subtitle: `Step ${step} of 3` }), _jsx(BankingTabs, {}), accountError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load bank accounts.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetchAccounts(), type: "button", children: "Retry" })] })) : null, step === 1 && (_jsxs("div", { className: "space-y-4 rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("div", { children: [_jsx("p", { className: "mb-1 text-xs text-muted", children: "Account" }), _jsx(SearchableSelect, { onChange: (value) => form.setValue("bankAccountId", value, { shouldValidate: true }), options: accounts.map((row) => ({
                                            value: row.id,
                                            label: `${row.bankName} - ${row.accountNoMasked}`,
                                        })), value: selectedAccountId }), form.formState.errors.bankAccountId ? (_jsx("p", { className: "mt-1 text-xs text-ruby", children: form.formState.errors.bankAccountId.message })) : null] }), _jsxs("label", { className: "text-xs text-muted", children: ["Format", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", value: selectedFormat, onChange: (event) => form.setValue("format", event.target.value, {
                                            shouldValidate: true,
                                        }), children: [_jsx("option", { value: "AUTO", children: "Auto-detect" }), _jsx("option", { value: "CSV", children: "CSV" }), _jsx("option", { value: "OFX", children: "OFX" }), _jsx("option", { value: "QFX", children: "QFX" }), _jsx("option", { value: "PDF", children: "PDF (OCR)" })] })] }), _jsxs("div", { className: "text-xs text-muted", children: ["Date Range", _jsxs("div", { className: "mt-1 flex gap-2", children: [_jsx("input", { className: "h-10 w-full rounded border border-border px-3 text-sm", type: "date", value: form.watch("fromDate"), onChange: (event) => form.setValue("fromDate", event.target.value, { shouldValidate: true }) }), _jsx("input", { className: "h-10 w-full rounded border border-border px-3 text-sm", type: "date", value: form.watch("toDate"), onChange: (event) => form.setValue("toDate", event.target.value, { shouldValidate: true }) })] })] })] }), accountsLoading ? _jsx("p", { className: "text-sm text-muted", children: "Loading accounts..." }) : null, !accountsLoading && accounts.length === 0 ? (_jsx(EmptyState, { icon: Inbox, title: "No bank accounts found", description: "Create at least one bank account before importing statements." })) : null, _jsx(FileUploadZone, { accept: ".csv,.ofx,.qfx,.pdf,.xls,.xlsx", multiple: false, onFilesSelected: setSelectedFiles }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: !selectedFiles.length, onClick: () => void onParsePreview(), type: "button", children: "Parse & Preview" })] })), step === 2 && (_jsxs("div", { className: "space-y-4 rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "font-display text-xl font-semibold", children: "Preview & Column Mapping" }), selectedFormat === "CSV" && (_jsx("div", { className: "grid gap-3 md:grid-cols-5", children: ["Date", "Description", "Debit", "Credit", "Balance"].map((column) => (_jsxs("label", { className: "text-xs text-muted", children: [column, _jsx("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", children: _jsx("option", { children: column }) })] }, column))) })), _jsx("div", { className: "rounded border border-border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gold-tint", children: _jsxs("tr", { children: [_jsx("th", { className: "px-2 py-2 text-left", children: "Date" }), _jsx("th", { className: "px-2 py-2 text-left", children: "Description" }), _jsx("th", { className: "px-2 py-2 text-right", children: "Debit" }), _jsx("th", { className: "px-2 py-2 text-right", children: "Credit" }), _jsx("th", { className: "px-2 py-2 text-right", children: "Balance" })] }) }), _jsx("tbody", { children: previewRows.map((row, idx) => (_jsxs("tr", { className: "border-t border-border", children: [_jsx("td", { className: "px-2 py-2", children: row.date }), _jsx("td", { className: "px-2 py-2", children: row.description }), _jsx("td", { className: "px-2 py-2 text-right", children: row.debit.toFixed(2) }), _jsx("td", { className: "px-2 py-2 text-right", children: row.credit.toFixed(2) }), _jsx("td", { className: "px-2 py-2 text-right", children: row.balance.toFixed(2) })] }, `${row.date}-${idx}`))) })] }) }), _jsx("div", { className: "rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-700", children: "Duplicate detection: probable duplicates are highlighted and skipped on import." }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => setStep(1), type: "button", children: "Back" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: importMutation.isPending, onClick: () => importMutation.mutate(), type: "button", children: importMutation.isPending ? "Importing..." : "Confirm Import" })] })] })), step === 3 && (_jsxs("div", { className: "space-y-3 rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "font-display text-2xl font-semibold text-charcoal", children: "Import Successful" }), _jsxs("p", { className: "text-sm text-muted", children: [importSummary?.importedRows ?? 0, " transactions imported, ", importSummary?.duplicatesSkipped ?? 0, " duplicates skipped."] }), _jsx(Link, { className: "inline-flex h-10 items-center rounded-btn bg-gold px-4 text-sm text-white", to: `/banking/reconcile?accountId=${selectedAccountId}`, children: "Go to Reconciliation" })] }))] }));
};
