import { useQuery } from "@tanstack/react-query";
import { Landmark, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/formatters";
import { bankingService, type BankAccount } from "@/services/bankingService";
import { BankingTabs } from "./BankingTabs";
import { BankAccountFormModal } from "@/pages/accounts/BankAccountFormModal";

export const BankAccountsPage = () => {
  const [openModal, setOpenModal] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => bankingService.listAccounts(),
  });

  const totalBankBalance = useMemo(
    () => (data ?? []).reduce((acc, row) => acc + Number(row.bankBalance ?? 0), 0),
    [data],
  );

  if (isLoading) {
    return <div className="rounded-card bg-card p-6 shadow-card">Loading bank accounts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <h1 className="text-[32px] font-semibold text-charcoal">Banking Overview</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="rounded-btn border border-border px-4 py-2 text-sm text-sapphire" to="/banking/import">
              Bank Statements
            </Link>
            <button className="rounded-btn bg-sapphire px-4 py-2 text-sm text-white" onClick={() => setOpenModal(true)} type="button">
              Add Bank or Credit Card
            </button>
            <button
              className="rounded-btn border border-border px-4 py-2 text-sm text-charcoal"
              onClick={() => toast.info("Transaction rules manager will be available here")}
              type="button"
            >
              Manage Transaction Rules
            </button>
          </div>
        </div>

        <div className="mt-4">
          <BankingTabs />
        </div>

        {isError ? (
          <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
            Failed to load bank accounts.
            <button className="ml-3 underline" onClick={() => void refetch()} type="button">
              Retry
            </button>
          </div>
        ) : null}

        <div className="rounded-card border border-border p-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <button className="text-xl font-medium text-charcoal" type="button">All Accounts</button>
            <button className="text-sm text-charcoal" type="button">Last 30 days</button>
          </div>

          <div className="mt-5 flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-border/70 text-muted">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-charcoal">Cash In Hand</p>
                <p className="text-2xl font-semibold text-charcoal">{formatCurrency(0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald/15 text-emerald">
                <Landmark className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-charcoal">Bank Balance</p>
                <p className="text-2xl font-semibold text-charcoal">{formatCurrency(totalBankBalance)}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border p-4">
            <div className="mb-4 text-sm text-sapphire">Hide Chart</div>
            <div className="h-44 rounded border border-border bg-gradient-to-b from-canvas to-white" />
            <div className="mt-4 flex items-center gap-6 text-sm text-charcoal">
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-muted" />Cash In Hand</span>
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald" />Bank Balance</span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-card border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[28px] font-medium text-charcoal">Active Accounts</h2>
          </div>
          {!data?.length ? (
            <div className="p-4">
              <EmptyState
                icon={Landmark}
                title="No bank accounts"
                description="Add your first bank account to start imports and reconciliation."
                actionLabel="Add Account"
                onAction={() => setOpenModal(true)}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Account Details</th>
                    <th className="px-4 py-3">Uncategorized</th>
                    <th className="px-4 py-3">Pending Checks</th>
                    <th className="px-4 py-3 text-right">Amount In Bank</th>
                    <th className="px-4 py-3 text-right">Amount In Books</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((account: BankAccount) => (
                    <tr key={account.id} className="border-t border-border">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted">
                            <Landmark className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-medium text-sapphire">{account.accountName || account.bankName}</p>
                            <p className="text-xs text-muted">{account.bankName} � {account.accountNoMasked}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Link className="rounded border border-border px-2 py-1 text-xs" to={`/banking/transactions?accountId=${account.id}`}>
                                Transactions
                              </Link>
                              <Link className="rounded border border-border px-2 py-1 text-xs" to={`/banking/import?accountId=${account.id}`}>
                                Import
                              </Link>
                              <Link className="rounded border border-border px-2 py-1 text-xs" to={`/banking/reconcile?accountId=${account.id}`}>
                                Reconcile
                              </Link>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">-</td>
                      <td className="px-4 py-4">{account.unreconciledCount}</td>
                      <td className="px-4 py-4 text-right font-mono">{formatCurrency(account.bankBalance)}</td>
                      <td className="px-4 py-4 text-right font-mono">{formatCurrency(account.bookBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <BankAccountFormModal isOpen={openModal} onClose={() => setOpenModal(false)} />
    </div>
  );
};
