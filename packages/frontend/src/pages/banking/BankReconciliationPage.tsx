import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import {
  bankingService,
  type BankAccount,
  type ReconciliationSuggestion,
  type BankTransaction,
} from "@/services/bankingService";
import { BankingTabs } from "./BankingTabs";

export const BankReconciliationPage = () => {
  const [searchParams] = useSearchParams();
  const [accountId, setAccountId] = useState(searchParams.get("accountId") ?? 1);
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, string>>({});

  const {
    data: accounts = [],
    isError: accountError,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["bank-recon-accounts"],
    queryFn: () => bankingService.listAccounts(),
  });

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["bank-reconciliation", accountId, month, year],
    queryFn: () => bankingService.getReconciliation(accountId, { month, year }),
    enabled: Boolean(accountId),
  });

  const matchMutation = useMutation({
    mutationFn: () =>
      bankingService.matchReconciliation(accountId, {
        links: Object.entries(selectedSuggestions).map(([bankTransactionId, journalRef]) => ({
          bankTransactionId: Number(bankTransactionId),
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
  const auto90 = useMemo(
    () => suggestions.filter((row) => row.confidence >= 90),
    [suggestions],
  );

  const unreconciledBank = useMemo(
    () => (data?.bankTransactions ?? []).filter((txn) => !txn.isReconciled),
    [data?.bankTransactions],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bank Reconciliation"
        subtitle="Match statement lines against books with confidence scoring"
        actions={
          <>
            <button
              className="h-10 rounded-btn border border-border px-4 text-sm disabled:opacity-50"
              disabled={Object.keys(selectedSuggestions).length === 0 || matchMutation.isPending}
              onClick={() => matchMutation.mutate()}
              type="button"
            >
              {matchMutation.isPending ? "Matching..." : "Match Selected"}
            </button>
            <button
              className="h-10 rounded-btn border border-border px-4 text-sm"
              onClick={() => {
                const bulk: Record<string, string> = {};
                for (const suggestion of auto90) {
                  bulk[suggestion.bankTransactionId] = suggestion.candidateRef;
                }
                setSelectedSuggestions(bulk);
                toast.info(`Prepared ${auto90.length} high-confidence matches`);
              }}
              type="button"
            >
              Match All (90%+)
            </button>
            <button
              className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50"
              disabled={finalizeMutation.isPending}
              onClick={() => finalizeMutation.mutate()}
              type="button"
            >
              {finalizeMutation.isPending ? "Finalizing..." : "Finalize Reconciliation"}
            </button>
          </>
        }
      />
      <BankingTabs />

      {accountError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load bank accounts.
          <button className="ml-3 underline" onClick={() => void refetchAccounts()} type="button">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-muted">Bank Account</p>
          <SearchableSelect
            onChange={setAccountId}
            options={accounts.map((account: BankAccount) => ({
              value: account.id,
              label: `${account.bankName} - ${account.accountNoMasked}`,
            }))}
            value={accountId}
          />
        </div>
        <label className="text-xs text-muted">
          Month
          <select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {idx + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Year
          <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
        </label>
      </div>

      <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
        {isLoading || !data ? (
          <div>Loading reconciliation...</div>
        ) : isError ? (
          <div className="rounded border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
            Failed to load reconciliation data.
            <button className="ml-3 underline" onClick={() => void refetch()} type="button">
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded border border-border p-3 text-sm">
                <div className="mb-1 font-medium">Bank-side</div>
                <div className="flex justify-between"><span>Balance per Bank</span><span className="font-mono">{formatCurrency(data.summary.balancePerBank)}</span></div>
                <div className="flex justify-between"><span>+ Deposits in Transit</span><span className="font-mono">{formatCurrency(data.summary.depositsInTransit)}</span></div>
                <div className="flex justify-between"><span>- Outstanding Cheques</span><span className="font-mono">{formatCurrency(data.summary.outstandingCheques)}</span></div>
                <div className="mt-1 flex justify-between border-t border-border pt-1"><span>Adjusted Bank Balance</span><span className="font-mono">{formatCurrency(data.summary.adjustedBankBalance)}</span></div>
              </div>
              <div className="rounded border border-border p-3 text-sm">
                <div className="mb-1 font-medium">Books-side</div>
                <div className="flex justify-between"><span>Balance per Books</span><span className="font-mono">{formatCurrency(data.summary.balancePerBooks)}</span></div>
                <div className="mt-1 flex justify-between border-t border-border pt-1"><span>Difference</span><span className={`font-mono ${data.summary.difference === 0 ? "text-emerald" : "text-ruby"}`}>{formatCurrency(data.summary.difference)}</span></div>
              </div>
              <div className="rounded border border-border p-3 text-sm">
                <div className="mb-1 font-medium">Status</div>
                <span className={`rounded-full px-3 py-1 text-xs ${data.summary.status === "RECONCILED" ? "bg-emerald/10 text-emerald" : data.summary.status === "PARTIALLY_RECONCILED" ? "bg-gold/10 text-gold" : "bg-ruby/10 text-ruby"}`}>
                  {data.summary.status}
                </span>
                <div className="mt-3 text-xs text-muted">Unmatched bank items: {unreconciledBank.length}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <div className="rounded border border-border p-3">
                <h4 className="mb-2 font-display text-lg font-semibold">Bank Statement</h4>
                <div className="space-y-2">
                  {(data.bankTransactions ?? []).map((txn: BankTransaction) => (
                    <div key={txn.id} className={`rounded border px-2 py-2 text-xs ${txn.isReconciled ? "border-emerald/30 bg-emerald/5" : "border-yellow-400/50 bg-yellow-50"}`}>
                      <div className="flex justify-between"><span>{txn.date}</span><span className="font-mono">{formatCurrency(txn.debit > 0 ? -txn.debit : txn.credit)}</span></div>
                      <div>{txn.narration}</div>
                      {!txn.isReconciled ? (
                        <div className="mt-1 flex gap-2">
                          <button className="rounded border border-border px-2 py-1" type="button" onClick={() => toast.info(`Create Journal Entry for ${txn.id} queued`)}>Create Journal Entry</button>
                          <button className="rounded border border-border px-2 py-1" type="button" onClick={() => toast.info(`Marked ${txn.id} as non-business`) }>Mark Non-Business</button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded border border-border p-3">
                <h4 className="mb-2 font-display text-lg font-semibold">AI Match Suggestions</h4>
                <div className="space-y-2">
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-muted">No suggestions for selected period.</p>
                  ) : (
                    suggestions.map((suggestion: ReconciliationSuggestion) => (
                      <div key={suggestion.bankTransactionId} className="rounded border border-border px-2 py-2 text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium">{suggestion.bankTransactionId}</span>
                          <span className="rounded bg-sapphire/10 px-2 py-0.5 text-sapphire">{suggestion.confidence}%</span>
                        </div>
                        <div className="mt-1 text-muted">{suggestion.reason}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            className="h-8 w-full rounded border border-border px-2 text-xs"
                            value={selectedSuggestions[suggestion.bankTransactionId] ?? suggestion.candidateRef}
                            onChange={(event) =>
                              setSelectedSuggestions((prev) => ({
                                ...prev,
                                [suggestion.bankTransactionId]: event.target.value,
                              }))
                            }
                          />
                          <button
                            className="rounded border border-border px-2 py-1"
                            onClick={() =>
                              setSelectedSuggestions((prev) => ({
                                ...prev,
                                [suggestion.bankTransactionId]: prev[suggestion.bankTransactionId] ?? suggestion.candidateRef,
                              }))
                            }
                            type="button"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded border border-border p-3">
                <h4 className="mb-2 font-display text-lg font-semibold">Books Transactions</h4>
                <div className="space-y-2">
                  {(data.booksTransactions ?? []).map((txn: BankTransaction) => (
                    <div key={txn.id} className="rounded border border-border px-2 py-2 text-xs">
                      <div className="flex justify-between"><span>{txn.date}</span><span className="font-mono">{formatCurrency(txn.debit > 0 ? -txn.debit : txn.credit)}</span></div>
                      <div>{txn.narration}</div>
                      {!txn.isReconciled ? (
                        <div className="mt-1 flex gap-2">
                          <button className="rounded border border-border px-2 py-1" type="button" onClick={() => toast.info(`Marked ${txn.id} as outstanding`) }>Mark Outstanding</button>
                          <button className="rounded border border-border px-2 py-1" type="button" onClick={() => toast.info(`Create missing bank entry for ${txn.id} queued`)}>Create Missing Entry</button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
