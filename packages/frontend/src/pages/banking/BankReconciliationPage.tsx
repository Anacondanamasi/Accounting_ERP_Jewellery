import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  History,
  Calendar,
  Check,
  FileText,
  Undo2,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Printer,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  bankingService,
  type BankAccount,
  type ReconciliationHistoryRow,
  type ReconcileSessionData,
  type ReconcileBookItem,
} from "@/services/bankingService";
import { BankingTabs } from "./BankingTabs";

export const BankReconciliationPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [accountId, setAccountId] = useState<number>(Number(searchParams.get("accountId") || 1));
  const [activeView, setActiveView] = useState<"WORKSPACE" | "HISTORY">("WORKSPACE");

  // Reconcile Setup Form State
  const [statementDate, setStatementDate] = useState(() => {
    // Default to last day of previous month
    const now = new Date();
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return lastDayPrevMonth.toISOString().slice(0, 10);
  });
  const [endingBalanceInput, setEndingBalanceInput] = useState<string>("0");

  // Active Session State
  const [session, setSession] = useState<ReconcileSessionData | null>(null);
  const [clearedItemKeys, setClearedItemKeys] = useState<Set<string>>(new Set());
  const [itemTab, setItemTab] = useState<"ALL" | "PAYMENTS" | "DEPOSITS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [selectedReportRow, setSelectedReportRow] = useState<ReconciliationHistoryRow | null>(null);

  // Accounts list query
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["bank-accounts-list"],
    queryFn: () => bankingService.listAccounts(),
  });

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) || accounts[0],
    [accounts, accountId]
  );

  useEffect(() => {
    if (selectedAccount && Number(selectedAccount.id) !== accountId) {
      setAccountId(Number(selectedAccount.id));
    }
  }, [selectedAccount, accountId]);

  // Reconciliation History Query
  const {
    data: history = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["reconciliation-history", accountId],
    queryFn: () => bankingService.getReconciliationHistory(accountId),
    enabled: Boolean(accountId),
  });

  // Calculate default beginning balance from previous reconciled session or account opening balance
  const previousReconciled = useMemo(
    () => history.find((h) => h.status === "RECONCILED"),
    [history]
  );
  const suggestedBeginningBalance = useMemo(() => {
    if (previousReconciled) return Number(previousReconciled.endingBalance);
    return selectedAccount ? Number(selectedAccount.bankBalance || selectedAccount.bookBalance || 0) : 0;
  }, [previousReconciled, selectedAccount]);

  // Start / Resume session mutation
  const startSessionMutation = useMutation({
    mutationFn: () =>
      bankingService.startReconciliation(accountId, {
        statementDate,
        endingBalance: parseFloat(endingBalanceInput) || 0,
      }),
    onSuccess: (data) => {
      setSession(data);
      // Initialize cleared set from backend items
      const initialSet = new Set<string>();
      for (const d of data.deposits) {
        if (d.isCleared) initialSet.add(`${d.sourceType}:${d.id}`);
      }
      for (const p of data.payments) {
        if (p.isCleared) initialSet.add(`${p.sourceType}:${p.id}`);
      }
      setClearedItemKeys(initialSet);
      toast.success("Reconciliation workspace ready");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to start reconciliation");
    },
  });

  // Toggle single item cleared state
  const handleToggleItem = (sourceType: string, id: number) => {
    const key = `${sourceType}:${id}`;
    const next = new Set(clearedItemKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setClearedItemKeys(next);
  };

  // Bulk toggle visible items
  const handleBulkToggle = (items: ReconcileBookItem[], check: boolean) => {
    const next = new Set(clearedItemKeys);
    for (const item of items) {
      const key = `${item.sourceType}:${item.id}`;
      if (check) next.add(key);
      else next.delete(key);
    }
    setClearedItemKeys(next);
  };

  // Live recalculation of cleared balances
  const allDeposits = session?.deposits || [];
  const allPayments = session?.payments || [];

  const clearedDeposits = useMemo(
    () => allDeposits.filter((d) => clearedItemKeys.has(`${d.sourceType}:${d.id}`)),
    [allDeposits, clearedItemKeys]
  );
  const clearedPayments = useMemo(
    () => allPayments.filter((p) => clearedItemKeys.has(`${p.sourceType}:${p.id}`)),
    [allPayments, clearedItemKeys]
  );

  const clearedDepositsSum = useMemo(
    () => clearedDeposits.reduce((acc, d) => acc + d.amount, 0),
    [clearedDeposits]
  );
  const clearedPaymentsSum = useMemo(
    () => clearedPayments.reduce((acc, p) => acc + p.amount, 0),
    [clearedPayments]
  );

  const liveBeginningBalance = session ? session.beginningBalance : suggestedBeginningBalance;
  const liveEndingBalance = session ? session.endingBalance : (parseFloat(endingBalanceInput) || 0);

  const liveClearedBalance = useMemo(
    () => liveBeginningBalance + clearedDepositsSum - clearedPaymentsSum,
    [liveBeginningBalance, clearedDepositsSum, clearedPaymentsSum]
  );

  const liveDifference = useMemo(
    () => Math.round((liveEndingBalance - liveClearedBalance) * 100) / 100,
    [liveEndingBalance, liveClearedBalance]
  );

  const isDifferenceZero = Math.abs(liveDifference) < 0.01;

  // Persist cleared items helper
  const saveClearedItemsPayload = () => {
    if (!session) return [];
    const items: Array<{ sourceType: string; id: number; amount: number; direction: string }> = [];
    for (const d of allDeposits) {
      if (clearedItemKeys.has(`${d.sourceType}:${d.id}`)) {
        items.push({ sourceType: d.sourceType, id: d.id, amount: d.amount, direction: "DEPOSIT" });
      }
    }
    for (const p of allPayments) {
      if (clearedItemKeys.has(`${p.sourceType}:${p.id}`)) {
        items.push({ sourceType: p.sourceType, id: p.id, amount: p.amount, direction: "PAYMENT" });
      }
    }
    return items;
  };

  // Save for later mutation
  const saveForLaterMutation = useMutation({
    mutationFn: () => {
      if (!session) throw new Error("No active session");
      return bankingService.updateReconciliationItems(accountId, session.reconciliationId, saveClearedItemsPayload());
    },
    onSuccess: () => {
      toast.success("Progress saved. You can resume at any time.");
      queryClient.invalidateQueries({ queryKey: ["reconciliation-history", accountId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save progress");
    },
  });

  // Finish reconciliation mutation
  const finishMutation = useMutation({
    mutationFn: (autoAdjust: boolean) => {
      if (!session) throw new Error("No active session");
      return bankingService.finishReconciliation(accountId, session.reconciliationId, autoAdjust);
    },
    onSuccess: () => {
      toast.success("Reconciliation successfully completed and locked!");
      setShowDiscrepancyModal(false);
      setSession(null);
      void refetchHistory();
      setActiveView("HISTORY");
      queryClient.invalidateQueries({ queryKey: ["bank-feed", accountId] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-history", accountId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to finalize reconciliation");
    },
  });

  // Undo reconciliation mutation
  const undoMutation = useMutation({
    mutationFn: (reconId: number) => bankingService.undoReconciliation(accountId, reconId),
    onSuccess: () => {
      toast.success("Reconciliation undone. Associated records have been unlocked.");
      void refetchHistory();
      queryClient.invalidateQueries({ queryKey: ["bank-feed", accountId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Cannot undo reconciliation");
    },
  });

  // Filtered lists for table
  const filteredDeposits = useMemo(() => {
    if (!searchQuery) return allDeposits;
    const q = searchQuery.toLowerCase();
    return allDeposits.filter(
      (d) =>
        d.narration.toLowerCase().includes(q) ||
        (d.reference && d.reference.toLowerCase().includes(q)) ||
        (d.payeeOrParty && d.payeeOrParty.toLowerCase().includes(q)) ||
        d.amount.toString().includes(q)
    );
  }, [allDeposits, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery) return allPayments;
    const q = searchQuery.toLowerCase();
    return allPayments.filter(
      (p) =>
        p.narration.toLowerCase().includes(q) ||
        (p.reference && p.reference.toLowerCase().includes(q)) ||
        (p.payeeOrParty && p.payeeOrParty.toLowerCase().includes(q)) ||
        p.amount.toString().includes(q)
    );
  }, [allPayments, searchQuery]);

  const displayItems = useMemo(() => {
    if (itemTab === "PAYMENTS") return filteredPayments;
    if (itemTab === "DEPOSITS") return filteredDeposits;
    return [...filteredPayments, ...filteredDeposits].sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [itemTab, filteredPayments, filteredDeposits]);

  const allVisibleCleared = useMemo(() => {
    if (displayItems.length === 0) return false;
    return displayItems.every((item) => clearedItemKeys.has(`${item.sourceType}:${item.id}`));
  }, [displayItems, clearedItemKeys]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reconcile"
        subtitle="Reconcile bank accounts against your official monthly statements"
        actions={
          <div className="flex items-center gap-2">
            <select
              className="h-9 w-64 rounded-btn border border-border bg-white px-3 text-sm font-semibold text-charcoal focus:border-gold outline-none"
              value={accountId.toString()}
              onChange={(e) => {
                const newId = Number(e.target.value);
                setAccountId(newId);
                setSearchParams({ accountId: newId.toString() });
                setSession(null);
              }}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountName || acc.accountNoMasked}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetchHistory();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <BankingTabs />

      {/* Sub Navigation Views: Workspace vs History */}
      <div className="flex border-b border-border">
        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeView === "WORKSPACE"
              ? "border-sapphire text-sapphire"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
          onClick={() => setActiveView("WORKSPACE")}
        >
          <Sparkles className="h-4 w-4" />
          Reconciliation Workspace
          {session && (
            <span className="ml-1 rounded-full bg-sapphire/10 px-2 py-0.5 text-xs text-sapphire font-bold">
              In Progress
            </span>
          )}
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeView === "HISTORY"
              ? "border-sapphire text-sapphire"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
          onClick={() => setActiveView("HISTORY")}
        >
          <History className="h-4 w-4" />
          History & Reports
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-charcoal">
            {history.length}
          </span>
        </button>
      </div>

      {/* ================= WORKSPACE VIEW ================= */}
      {activeView === "WORKSPACE" && (
        <div className="space-y-4">
          {!session ? (
            /* STEP 1: STATEMENT SETUP CARD */
            <div className="mx-auto max-w-3xl rounded-card border border-border bg-card p-6 shadow-card">
              <div className="mb-6 border-b border-border pb-4">
                <h2 className="text-xl font-bold text-charcoal">Reconcile an account</h2>
                <p className="text-sm text-muted">
                  Open your bank statement and enter the statement ending date and ending balance below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase mb-1">
                    Bank Account
                  </label>
                  <div className="rounded-input border border-border bg-slate-50 p-2.5 text-sm font-medium text-charcoal">
                    {selectedAccount?.bankName} - {selectedAccount?.accountName || selectedAccount?.accountNoMasked}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase mb-1">
                    Beginning Balance
                  </label>
                  <div className="rounded-input border border-border bg-slate-50 p-2.5 text-sm font-semibold text-charcoal">
                    {formatCurrency(suggestedBeginningBalance)}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {previousReconciled
                      ? `Matches previous reconciled ending balance (${formatDate(previousReconciled.statementDate)})`
                      : "Matches bank account opening balance"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase mb-1">
                    Statement Ending Date <span className="text-crimson">*</span>
                  </label>
                  <Input
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted">Date printed on your bank statement</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase mb-1">
                    Statement Ending Balance <span className="text-crimson">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-muted">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-7 text-base font-semibold"
                      placeholder="0.00"
                      value={endingBalanceInput}
                      onChange={(e) => setEndingBalanceInput(e.target.value)}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">Final closing balance shown on your statement</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-border pt-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveView("HISTORY")}
                >
                  View Past Reconciliations
                </Button>
                <Button
                  className="bg-sapphire text-white hover:bg-sapphire-dark px-6"
                  disabled={startSessionMutation.isPending || !endingBalanceInput}
                  onClick={() => startSessionMutation.mutate()}
                >
                  {startSessionMutation.isPending ? "Loading Books..." : "Start Reconciling"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: ACTIVE RECONCILIATION WORKSPACE */
            <div className="space-y-4">
              {/* STICKY TOP SUMMARY BAR */}
              <div className="sticky top-0 z-20 rounded-card border border-border bg-card p-4 shadow-elevated">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border-r border-border pr-4">
                      <div className="text-xs font-semibold uppercase text-muted">Statement Ending</div>
                      <div className="text-lg font-bold text-charcoal">
                        {formatCurrency(session.endingBalance)}
                      </div>
                      <div className="text-xs text-muted">{formatDate(session.statementDate)}</div>
                    </div>

                    <div className="border-r border-border pr-4">
                      <div className="text-xs font-semibold uppercase text-muted">Cleared Balance</div>
                      <div className="text-lg font-bold text-charcoal">
                        {formatCurrency(liveClearedBalance)}
                      </div>
                      <div className="text-xs text-muted">
                        Beg: {formatCurrency(liveBeginningBalance)}
                      </div>
                    </div>

                    <div className="border-r border-border pr-4">
                      <div className="text-xs font-semibold uppercase text-muted">Cleared Money In</div>
                      <div className="text-base font-bold text-emerald-600">
                        +{formatCurrency(clearedDepositsSum)}
                      </div>
                      <div className="text-xs text-muted">
                        {clearedDeposits.length} deposits cleared
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase text-muted">Cleared Money Out</div>
                      <div className="text-base font-bold text-crimson">
                        -{formatCurrency(clearedPaymentsSum)}
                      </div>
                      <div className="text-xs text-muted">
                        {clearedPayments.length} payments cleared
                      </div>
                    </div>
                  </div>

                  {/* DIFFERENCE BADGE & ACTIONS */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex flex-col items-end rounded-card border px-4 py-2 ${
                        isDifferenceZero
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-amber-300 bg-amber-50 text-amber-900"
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">Difference</span>
                      <div className="flex items-center gap-1.5 text-xl font-black">
                        {isDifferenceZero && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                        {formatCurrency(liveDifference)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saveForLaterMutation.isPending}
                        onClick={() => saveForLaterMutation.mutate()}
                      >
                        {saveForLaterMutation.isPending ? "Saving..." : "Save for later"}
                      </Button>

                      <Button
                        className={`font-semibold ${
                          isDifferenceZero
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-amber-600 text-white hover:bg-amber-700"
                        }`}
                        size="sm"
                        disabled={finishMutation.isPending}
                        onClick={() => {
                          if (isDifferenceZero) {
                            finishMutation.mutate(false);
                          } else {
                            setShowDiscrepancyModal(true);
                          }
                        }}
                      >
                        {finishMutation.isPending ? "Finalizing..." : "Finish now"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted hover:text-charcoal"
                        onClick={() => {
                          if (confirm("Close reconciliation session? Unsaved checkbox states will be lost.")) {
                            setSession(null);
                          }
                        }}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEARCH & TAB TOOLBAR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-card border border-border bg-card p-3 shadow-card">
                <div className="flex items-center gap-2">
                  <button
                    className={`rounded-btn px-4 py-1.5 text-sm font-semibold transition-colors ${
                      itemTab === "ALL"
                        ? "bg-sapphire text-white"
                        : "border border-border bg-white text-charcoal hover:bg-gold-tint"
                    }`}
                    onClick={() => setItemTab("ALL")}
                  >
                    All ({allDeposits.length + allPayments.length})
                  </button>
                  <button
                    className={`rounded-btn px-4 py-1.5 text-sm font-semibold transition-colors ${
                      itemTab === "PAYMENTS"
                        ? "bg-sapphire text-white"
                        : "border border-border bg-white text-charcoal hover:bg-gold-tint"
                    }`}
                    onClick={() => setItemTab("PAYMENTS")}
                  >
                    Payments / Money Out ({allPayments.length})
                  </button>
                  <button
                    className={`rounded-btn px-4 py-1.5 text-sm font-semibold transition-colors ${
                      itemTab === "DEPOSITS"
                        ? "bg-sapphire text-white"
                        : "border border-border bg-white text-charcoal hover:bg-gold-tint"
                    }`}
                    onClick={() => setItemTab("DEPOSITS")}
                  >
                    Deposits / Money In ({allDeposits.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
                    <Input
                      placeholder="Search payee, ref, desc..."
                      className="h-9 pl-8 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkToggle(displayItems, !allVisibleCleared)}
                  >
                    {allVisibleCleared ? "Uncheck All Visible" : "Check All Visible"}
                  </Button>
                </div>
              </div>

              {/* CHECKLIST DATA TABLE */}
              <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase text-muted">
                      <tr>
                        <th className="w-12 px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border text-sapphire"
                            checked={allVisibleCleared}
                            onChange={(e) => handleBulkToggle(displayItems, e.target.checked)}
                          />
                        </th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Ref / Entry #</th>
                        <th className="px-4 py-3">Payee / Description</th>
                        <th className="px-4 py-3 text-right">Cleared Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-muted">
                            No book transactions found matching this filter up to statement date.
                          </td>
                        </tr>
                      ) : (
                        displayItems.map((item) => {
                          const key = `${item.sourceType}:${item.id}`;
                          const isCleared = clearedItemKeys.has(key);
                          const isDeposit = item.direction === "DEPOSIT";

                          return (
                            <tr
                              key={key}
                              className={`cursor-pointer transition-colors ${
                                isCleared ? "bg-sapphire/5 hover:bg-sapphire/10" : "hover:bg-slate-50"
                              }`}
                              onClick={() => handleToggleItem(item.sourceType, item.id)}
                            >
                              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-border text-sapphire cursor-pointer"
                                  checked={isCleared}
                                  onChange={() => handleToggleItem(item.sourceType, item.id)}
                                />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-medium text-charcoal">
                                {formatDate(item.date)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    isDeposit
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-charcoal"
                                  }`}
                                >
                                  {isDeposit ? "Deposit" : "Payment"}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                                {item.reference || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-charcoal">
                                  {item.payeeOrParty || "—"}
                                </div>
                                <div className="line-clamp-1 text-xs text-muted">{item.narration}</div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                <span className={isDeposit ? "text-emerald-700" : "text-crimson"}>
                                  {isDeposit ? "+" : "-"}
                                  {formatCurrency(item.amount)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= HISTORY & REPORTS VIEW ================= */}
      {activeView === "HISTORY" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-charcoal">Past Reconciliations</h2>
            <Button
              className="bg-sapphire text-white hover:bg-sapphire-dark"
              size="sm"
              onClick={() => setActiveView("WORKSPACE")}
            >
              Start New Reconciliation
            </Button>
          </div>

          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Statement Date</th>
                    <th className="px-4 py-3">Reconciled On</th>
                    <th className="px-4 py-3 text-right">Ending Balance</th>
                    <th className="px-4 py-3 text-right">Difference</th>
                    <th className="px-4 py-3 text-right">Adjustment</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted">
                        No previous reconciliations found for this account.
                      </td>
                    </tr>
                  ) : (
                    history.map((row, idx) => {
                      const isLatest = idx === 0 && row.status === "RECONCILED";

                      return (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-charcoal">
                            {formatDate(row.statementDate)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                            {row.reconciledAt ? formatDate(row.reconciledAt) : "—"}
                            {row.reconciledBy && ` by ${row.reconciledBy}`}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-charcoal">
                            {formatCurrency(row.endingBalance)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs">
                            {Math.abs(row.difference) < 0.01 ? (
                              <span className="text-emerald-600 font-semibold">₹0.00</span>
                            ) : (
                              <span className="text-amber-600 font-semibold">{formatCurrency(row.difference)}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                            {row.autoAdjustmentAmount && Math.abs(row.autoAdjustmentAmount) > 0.01 ? (
                              <span className="font-semibold text-purple-700">
                                {formatCurrency(row.autoAdjustmentAmount)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                row.status === "RECONCILED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : row.status === "UNDONE"
                                  ? "bg-slate-100 text-muted line-through"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedReportRow(row)}
                              >
                                <FileText className="mr-1 h-3.5 w-3.5" />
                                Report
                              </Button>

                              {isLatest && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-crimson hover:bg-crimson/10"
                                  disabled={undoMutation.isPending}
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Are you sure you want to undo the reconciliation for statement dated ${formatDate(
                                          row.statementDate
                                        )}? All cleared lines will be unlocked.`
                                      )
                                    ) {
                                      undoMutation.mutate(row.id);
                                    }
                                  }}
                                >
                                  <Undo2 className="mr-1 h-3.5 w-3.5" />
                                  Undo
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= DISCREPANCY ADJUSTMENT CONFIRMATION MODAL ================= */}
      {showDiscrepancyModal && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-card border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-charcoal">Unreconciled Difference</h3>
                <p className="mt-1 text-sm text-muted">
                  You have an unreconciled difference of{" "}
                  <strong className="text-amber-800">{formatCurrency(liveDifference)}</strong> between
                  your statement ending balance and the cleared balance.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-card border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
              <p className="font-semibold">What would you like to do?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>Keep working:</strong> Review uncleared deposits or payments and adjust your
                  checkmarks to reach ₹0.00 difference.
                </li>
                <li>
                  <strong>Auto-adjust:</strong> Create an automatic adjustment entry in your ledger to the
                  &quot;Reconciliation Discrepancies&quot; account and finalize this statement.
                </li>
              </ul>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDiscrepancyModal(false)}
              >
                Keep Working
              </Button>
              <Button
                className="bg-amber-600 text-white hover:bg-amber-700"
                disabled={finishMutation.isPending}
                onClick={() => finishMutation.mutate(true)}
              >
                {finishMutation.isPending ? "Creating adjustment..." : "Create Adjustment & Finish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RECONCILIATION STATEMENT REPORT MODAL ================= */}
      {selectedReportRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-card border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-charcoal">Reconciliation Report</h3>
                <p className="text-xs text-muted">
                  Statement Ending Date: {formatDate(selectedReportRow.statementDate)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="mr-1 h-3.5 w-3.5" />
                Print Report
              </Button>
            </div>

            <div className="my-6 space-y-4">
              <div className="rounded-card border border-border bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase text-muted mb-2">Statement Summary</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Beginning Balance:</span>
                    <span className="font-medium">{formatCurrency(selectedReportRow.beginningBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">
                      Cleared Deposits ({selectedReportRow.clearedDepositsCount || 0}):
                    </span>
                    <span className="font-medium text-emerald-700">
                      +{formatCurrency(selectedReportRow.clearedDepositsAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">
                      Cleared Payments ({selectedReportRow.clearedPaymentsCount || 0}):
                    </span>
                    <span className="font-medium text-crimson">
                      -{formatCurrency(selectedReportRow.clearedPaymentsAmount || 0)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-base text-charcoal">
                    <span>Statement Ending Balance:</span>
                    <span>{formatCurrency(selectedReportRow.endingBalance)}</span>
                  </div>
                </div>
              </div>

              {selectedReportRow.autoAdjustmentAmount && Math.abs(selectedReportRow.autoAdjustmentAmount) > 0.01 && (
                <div className="rounded-card border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                  <strong>Auto-Adjustment Posted:</strong> ₹
                  {formatCurrency(selectedReportRow.autoAdjustmentAmount)} was posted to the
                  Reconciliation Discrepancies ledger account to balance this statement.
                </div>
              )}

              <div className="text-xs text-muted">
                Reconciliation completed on{" "}
                <strong>{formatDate(selectedReportRow.reconciledAt || selectedReportRow.statementDate)}</strong>
                {selectedReportRow.reconciledBy && ` by ${selectedReportRow.reconciledBy}`}.
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedReportRow(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
