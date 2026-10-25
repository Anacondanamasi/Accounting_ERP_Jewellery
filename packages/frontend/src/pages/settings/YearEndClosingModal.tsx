import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  RotateCcw,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  financialYearService,
  type FinancialYear,
} from "@/services/financialYearService";

interface YearEndClosingModalProps {
  financialYear: FinancialYear;
  isOpen: boolean;
  onClose: () => void;
}

export const YearEndClosingModal = ({
  financialYear,
  isOpen,
  onClose,
}: YearEndClosingModalProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"summary" | "journal">("summary");

  const {
    data: preview,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["fy-closing-preview", financialYear.id],
    queryFn: () => financialYearService.getClosingPreview(financialYear.id),
    enabled: isOpen,
  });

  const closeMutation = useMutation({
    mutationFn: () => financialYearService.close(financialYear.id),
    onSuccess: (data) => {
      toast.success(
        data.message || `Financial Year ${financialYear.label} closed successfully!`,
      );
      void queryClient.invalidateQueries({ queryKey: ["financial-years"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: ["journal"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Failed to close financial year",
      );
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => financialYearService.reopen(financialYear.id),
    onSuccess: (data) => {
      toast.success(
        data.message || `Financial Year ${financialYear.label} reopened successfully!`,
      );
      void queryClient.invalidateQueries({ queryKey: ["financial-years"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: ["journal"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Failed to reopen financial year",
      );
    },
  });

  if (!isOpen) return null;

  const isProfit = (preview?.netProfit ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                financialYear.isClosed
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gold/15 text-gold"
              }`}
            >
              {financialYear.isClosed ? (
                <Lock className="h-5 w-5" />
              ) : (
                <Scale className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-charcoal">
                {financialYear.isClosed
                  ? `Financial Year ${financialYear.label} (Closed)`
                  : `Year-End Closing & P&L Transfer: ${financialYear.label}`}
              </h2>
              <p className="text-xs text-muted">
                Period: {new Date(financialYear.startDate).toLocaleDateString()} to{" "}
                {new Date(financialYear.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-slate-200 hover:text-charcoal transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              <p className="text-sm text-muted">
                Calculating revenue, expense balances and retained earnings transfer...
              </p>
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4" /> Failed to load closing preview.
              </div>
              <p className="text-xs">
                Could not retrieve period account balances. Please check your connection.
              </p>
              <button
                onClick={() => void refetch()}
                className="text-xs underline font-semibold"
                type="button"
              >
                Retry calculation
              </button>
            </div>
          )}

          {preview && (
            <>
              {/* Closed Warning Banner */}
              {financialYear.isClosed && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-700" />
                    <span>
                      This financial year is already closed. The Net Profit of{" "}
                      <strong>{formatCurrency(preview.netProfit)}</strong> has been
                      transferred to{" "}
                      <strong>
                        {preview.retainedEarningsAccount?.code} -{" "}
                        {preview.retainedEarningsAccount?.name}
                      </strong>
                      .
                    </span>
                  </div>
                  {financialYear.closingEntryId && (
                    <a
                      href={`/journal/${financialYear.closingEntryId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-amber-800 hover:text-amber-950 ml-4"
                    >
                      View Closing Journal #{financialYear.closingEntryId}
                    </a>
                  )}
                </div>
              )}

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-slate-50/50 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Total Revenue
                  </span>
                  <div className="mt-1 font-mono text-lg font-bold text-emerald-600">
                    {formatCurrency(preview.totalRevenue)}
                  </div>
                  <span className="text-[10px] text-muted">
                    {preview.revenueAccounts.length} income accounts
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-slate-50/50 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Total Expenses
                  </span>
                  <div className="mt-1 font-mono text-lg font-bold text-amber-600">
                    {formatCurrency(preview.totalExpense)}
                  </div>
                  <span className="text-[10px] text-muted">
                    {preview.expenseAccounts.length} expense & COGS accounts
                  </span>
                </div>

                <div
                  className={`rounded-lg border p-4 ${
                    isProfit
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-ruby/20 bg-ruby/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {isProfit ? "Net Profit" : "Net Loss"}
                    </span>
                    {isProfit ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-ruby" />
                    )}
                  </div>
                  <div
                    className={`mt-1 font-mono text-lg font-bold ${
                      isProfit ? "text-emerald-700" : "text-ruby"
                    }`}
                  >
                    {formatCurrency(preview.netProfit)}
                  </div>
                  <span className="text-[10px] text-muted">
                    Revenue minus Expenses
                  </span>
                </div>

                <div className="rounded-lg border border-sapphire/20 bg-sapphire/5 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sapphire">
                    Transfer Destination
                  </span>
                  <div className="mt-1 font-mono text-sm font-bold text-charcoal">
                    {preview.retainedEarningsAccount
                      ? `${preview.retainedEarningsAccount.code} - ${preview.retainedEarningsAccount.name}`
                      : "3100 - Retained Earnings"}
                  </div>
                  <span className="text-[10px] text-sapphire/70">
                    Equity Control Account
                  </span>
                </div>
              </div>

              {/* Tabs: Breakdown vs Generated Journal */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("summary")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === "summary"
                      ? "border-gold text-charcoal"
                      : "border-transparent text-muted hover:text-charcoal"
                  }`}
                  type="button"
                >
                  P&L Accounts Breakdown ({preview.revenueAccounts.length + preview.expenseAccounts.length})
                </button>
                <button
                  onClick={() => setActiveTab("journal")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === "journal"
                      ? "border-gold text-charcoal"
                      : "border-transparent text-muted hover:text-charcoal"
                  }`}
                  type="button"
                >
                  Closing Journal Entry Preview ({preview.proposedLines.length} lines)
                </button>
              </div>

              {activeTab === "summary" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Revenue List */}
                  <div className="rounded-lg border border-border p-4 bg-card">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center justify-between">
                      <span>Revenue Accounts (To be Debited to 0)</span>
                      <span>{formatCurrency(preview.totalRevenue)}</span>
                    </h4>
                    {preview.revenueAccounts.length === 0 ? (
                      <p className="text-xs text-muted py-4 text-center">
                        No revenue transactions recorded in this period.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {preview.revenueAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className="flex items-center justify-between text-xs py-1 border-b border-border/50"
                          >
                            <span className="font-mono text-charcoal">
                              {acc.code} - {acc.name}
                            </span>
                            <span className="font-mono font-semibold text-emerald-600">
                              {formatCurrency(acc.balance)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expense List */}
                  <div className="rounded-lg border border-border p-4 bg-card">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center justify-between">
                      <span>Expense & COGS Accounts (To be Credited to 0)</span>
                      <span>{formatCurrency(preview.totalExpense)}</span>
                    </h4>
                    {preview.expenseAccounts.length === 0 ? (
                      <p className="text-xs text-muted py-4 text-center">
                        No expense transactions recorded in this period.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {preview.expenseAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className="flex items-center justify-between text-xs py-1 border-b border-border/50"
                          >
                            <span className="font-mono text-charcoal">
                              {acc.code} - {acc.name}
                            </span>
                            <span className="font-mono font-semibold text-amber-600">
                              {formatCurrency(acc.balance)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-border text-left font-bold text-muted uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Account</th>
                        <th className="px-4 py-2.5">Action & Purpose</th>
                        <th className="px-4 py-2.5 text-right">Debit (DR)</th>
                        <th className="px-4 py-2.5 text-right">Credit (CR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {preview.proposedLines.map((line, idx) => {
                        const isRetained =
                          line.code === "3100" ||
                          line.name.toLowerCase().includes("retained");
                        return (
                          <tr
                            key={idx}
                            className={
                              isRetained ? "bg-gold/10 font-bold" : "hover:bg-slate-50/50"
                            }
                          >
                            <td className="px-4 py-2 font-mono">
                              {line.code} - {line.name}
                            </td>
                            <td className="px-4 py-2 text-muted">
                              {isRetained
                                ? "Net Profit Transfer to Retained Earnings"
                                : line.drCr === "DR"
                                ? "Zero out revenue balance"
                                : "Zero out expense balance"}
                            </td>
                            <td className="px-4 py-2 text-right font-mono">
                              {line.drCr === "DR" ? formatCurrency(line.amount) : "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-mono">
                              {line.drCr === "CR" ? formatCurrency(line.amount) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-border font-bold">
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-right uppercase">
                          Total Balanced Lines:
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-charcoal">
                          {formatCurrency(preview.totalDr)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-charcoal">
                          {formatCurrency(preview.totalCr)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Invariant Banner */}
              <div
                className={`rounded-lg border p-3 flex items-center justify-between text-xs ${
                  preview.isBalanced
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-ruby/30 bg-ruby/5 text-ruby"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      preview.isBalanced ? "text-emerald-600" : "text-ruby"
                    }`}
                  />
                  <span>
                    <strong>Double-Entry Invariant:</strong> Total Debits (
                    {formatCurrency(preview.totalDr)}) = Total Credits (
                    {formatCurrency(preview.totalCr)}).
                  </span>
                </div>
                <span className="font-semibold text-[11px]">
                  Accounting Equation: Assets = Liabilities + Equity (Verified)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-slate-50/80 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-colors"
            type="button"
          >
            Cancel / Close Window
          </button>

          <div className="flex items-center gap-2">
            {financialYear.isClosed ? (
              <button
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-50"
                type="button"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {reopenMutation.isPending
                  ? "Reopening Year..."
                  : "Reopen Financial Year (Reverse Closing)"}
              </button>
            ) : (
              <button
                onClick={() => closeMutation.mutate()}
                disabled={
                  closeMutation.isPending || !preview || !preview.isBalanced
                }
                className="flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-gold/90 transition-all disabled:opacity-50"
                type="button"
              >
                <Lock className="h-3.5 w-3.5" />
                {closeMutation.isPending
                  ? "Posting Year-End Closing Entry..."
                  : `Close ${financialYear.label} & Transfer P&L to Retained Earnings`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
