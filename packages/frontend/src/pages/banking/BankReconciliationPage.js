import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { bankingService, } from "@/services/bankingService";
import { BankingTabs } from "./BankingTabs";
export const BankReconciliationPage = () => {
    const [searchParams] = useSearchParams();
    const [accountId, setAccountId] = useState(searchParams.get("accountId") ?? 1);
    const [month, setMonth] = useState(4);
    const [year, setYear] = useState(2025);
    const [selectedSuggestions, setSelectedSuggestions] = useState({});
    const { data: accounts = [], isError: accountError, refetch: refetchAccounts, } = useQuery({
        queryKey: ["bank-recon-accounts"],
        queryFn: () => bankingService.listAccounts(),
    });
    const { data, isLoading, isError, refetch, } = useQuery({
        queryKey: ["bank-reconciliation", accountId, month, year],
        queryFn: () => bankingService.getReconciliation(accountId, { month, year }),
        enabled: Boolean(accountId),
    });
    const matchMutation = useMutation({
        mutationFn: () => bankingService.matchReconciliation(accountId, {
            links: Object.entries(selectedSuggestions).map(([bankTransactionId, journalRef]) => ({
                bankTransactionId,
                journalRef,
            })),
        }),
        onSuccess: (result) => {
            toast.success(`${result.matched} transactions matched`);
            setSelectedSuggestions({});
            void refetch();
        },
        onError: () => toast.error("Unable to match selected transactions"),
    });
    const finalizeMutation = useMutation({
        mutationFn: () => bankingService.finalizeReconciliation(accountId, { month, year }),
        onSuccess: () => {
            toast.success("Reconciliation finalized");
            void refetch();
        },
        onError: () => toast.error("Unable to finalize reconciliation"),
    });
    const suggestions = data?.suggestions ?? [];
    const auto90 = useMemo(() => suggestions.filter((row) => row.confidence >= 90), [suggestions]);
    const unreconciledBank = useMemo(() => (data?.bankTransactions ?? []).filter((txn) => !txn.isReconciled), [data?.bankTransactions]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Bank Reconciliation", subtitle: "Match statement lines against books with confidence scoring", actions: _jsxs(_Fragment, { children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm disabled:opacity-50", disabled: Object.keys(selectedSuggestions).length === 0 || matchMutation.isPending, onClick: () => matchMutation.mutate(), type: "button", children: matchMutation.isPending ? "Matching..." : "Match Selected" }), _jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => {
                                const bulk = {};
                                for (const suggestion of auto90) {
                                    bulk[suggestion.bankTransactionId] = suggestion.candidateRef;
                                }
                                setSelectedSuggestions(bulk);
                                toast.info(`Prepared ${auto90.length} high-confidence matches`);
                            }, type: "button", children: "Match All (90%+)" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: finalizeMutation.isPending, onClick: () => finalizeMutation.mutate(), type: "button", children: finalizeMutation.isPending ? "Finalizing..." : "Finalize Reconciliation" })] }) }), _jsx(BankingTabs, {}), accountError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load bank accounts.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetchAccounts(), type: "button", children: "Retry" })] })) : null, _jsxs("div", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("p", { className: "mb-1 text-xs text-muted", children: "Bank Account" }), _jsx(SearchableSelect, { onChange: setAccountId, options: accounts.map((account) => ({
                                    value: account.id,
                                    label: `${account.bankName} - ${account.accountNoMasked}`,
                                })), value: accountId })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Month", _jsx("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", value: month, onChange: (event) => setMonth(Number(event.target.value)), children: Array.from({ length: 12 }).map((_, idx) => (_jsx("option", { value: idx + 1, children: idx + 1 }, idx + 1))) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Year", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", value: year, onChange: (event) => setYear(Number(event.target.value)) })] })] }), _jsx("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: isLoading || !data ? (_jsx("div", { children: "Loading reconciliation..." })) : isError ? (_jsxs("div", { className: "rounded border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load reconciliation data.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("div", { className: "rounded border border-border p-3 text-sm", children: [_jsx("div", { className: "mb-1 font-medium", children: "Bank-side" }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Balance per Bank" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.summary.balancePerBank) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "+ Deposits in Transit" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.summary.depositsInTransit) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "- Outstanding Cheques" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.summary.outstandingCheques) })] }), _jsxs("div", { className: "mt-1 flex justify-between border-t border-border pt-1", children: [_jsx("span", { children: "Adjusted Bank Balance" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.summary.adjustedBankBalance) })] })] }), _jsxs("div", { className: "rounded border border-border p-3 text-sm", children: [_jsx("div", { className: "mb-1 font-medium", children: "Books-side" }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Balance per Books" }), _jsx("span", { className: "font-mono", children: formatCurrency(data.summary.balancePerBooks) })] }), _jsxs("div", { className: "mt-1 flex justify-between border-t border-border pt-1", children: [_jsx("span", { children: "Difference" }), _jsx("span", { className: `font-mono ${data.summary.difference === 0 ? "text-emerald" : "text-ruby"}`, children: formatCurrency(data.summary.difference) })] })] }), _jsxs("div", { className: "rounded border border-border p-3 text-sm", children: [_jsx("div", { className: "mb-1 font-medium", children: "Status" }), _jsx("span", { className: `rounded-full px-3 py-1 text-xs ${data.summary.status === "RECONCILED" ? "bg-emerald/10 text-emerald" : data.summary.status === "PARTIALLY_RECONCILED" ? "bg-gold/10 text-gold" : "bg-ruby/10 text-ruby"}`, children: data.summary.status }), _jsxs("div", { className: "mt-3 text-xs text-muted", children: ["Unmatched bank items: ", unreconciledBank.length] })] })] }), _jsxs("div", { className: "mt-4 grid gap-4 xl:grid-cols-3", children: [_jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("h4", { className: "mb-2 font-display text-lg font-semibold", children: "Bank Statement" }), _jsx("div", { className: "space-y-2", children: (data.bankTransactions ?? []).map((txn) => (_jsxs("div", { className: `rounded border px-2 py-2 text-xs ${txn.isReconciled ? "border-emerald/30 bg-emerald/5" : "border-yellow-400/50 bg-yellow-50"}`, children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: txn.date }), _jsx("span", { className: "font-mono", children: formatCurrency(txn.debit > 0 ? -txn.debit : txn.credit) })] }), _jsx("div", { children: txn.narration }), !txn.isReconciled ? (_jsxs("div", { className: "mt-1 flex gap-2", children: [_jsx("button", { className: "rounded border border-border px-2 py-1", type: "button", onClick: () => toast.info(`Create Journal Entry for ${txn.id} queued`), children: "Create Journal Entry" }), _jsx("button", { className: "rounded border border-border px-2 py-1", type: "button", onClick: () => toast.info(`Marked ${txn.id} as non-business`), children: "Mark Non-Business" })] })) : null] }, txn.id))) })] }), _jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("h4", { className: "mb-2 font-display text-lg font-semibold", children: "AI Match Suggestions" }), _jsx("div", { className: "space-y-2", children: suggestions.length === 0 ? (_jsx("p", { className: "text-xs text-muted", children: "No suggestions for selected period." })) : (suggestions.map((suggestion) => (_jsxs("div", { className: "rounded border border-border px-2 py-2 text-xs", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-medium", children: suggestion.bankTransactionId }), _jsxs("span", { className: "rounded bg-sapphire/10 px-2 py-0.5 text-sapphire", children: [suggestion.confidence, "%"] })] }), _jsx("div", { className: "mt-1 text-muted", children: suggestion.reason }), _jsxs("div", { className: "mt-1 flex items-center gap-2", children: [_jsx("input", { className: "h-8 w-full rounded border border-border px-2 text-xs", value: selectedSuggestions[suggestion.bankTransactionId] ?? suggestion.candidateRef, onChange: (event) => setSelectedSuggestions((prev) => ({
                                                                    ...prev,
                                                                    [suggestion.bankTransactionId]: event.target.value,
                                                                })) }), _jsx("button", { className: "rounded border border-border px-2 py-1", onClick: () => setSelectedSuggestions((prev) => ({
                                                                    ...prev,
                                                                    [suggestion.bankTransactionId]: prev[suggestion.bankTransactionId] ?? suggestion.candidateRef,
                                                                })), type: "button", children: "Accept" })] })] }, suggestion.bankTransactionId)))) })] }), _jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("h4", { className: "mb-2 font-display text-lg font-semibold", children: "Books Transactions" }), _jsx("div", { className: "space-y-2", children: (data.booksTransactions ?? []).map((txn) => (_jsxs("div", { className: "rounded border border-border px-2 py-2 text-xs", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: txn.date }), _jsx("span", { className: "font-mono", children: formatCurrency(txn.debit > 0 ? -txn.debit : txn.credit) })] }), _jsx("div", { children: txn.narration }), !txn.isReconciled ? (_jsxs("div", { className: "mt-1 flex gap-2", children: [_jsx("button", { className: "rounded border border-border px-2 py-1", type: "button", onClick: () => toast.info(`Marked ${txn.id} as outstanding`), children: "Mark Outstanding" }), _jsx("button", { className: "rounded border border-border px-2 py-1", type: "button", onClick: () => toast.info(`Create missing bank entry for ${txn.id} queued`), children: "Create Missing Entry" })] })) : null] }, txn.id))) })] })] })] })) })] }));
};
