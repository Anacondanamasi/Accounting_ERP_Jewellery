import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { bankingService, type BankAccount, type BankTransaction } from "@/services/bankingService";
import { BankingTabs } from "./BankingTabs";

interface ChequeRow {
  id: number;
  date: string;
  reference?: string;
  narration: string;
  amount: number;
  flow: "IN" | "OUT";
  isReconciled: boolean;
}

const col = createColumnHelper<ChequeRow>();

const isChequeTransaction = (row: BankTransaction) => {
  const text = `${row.narration ?? ""} ${row.reference ?? ""}`.toLowerCase();
  return text.includes("chq") || text.includes("cheque") || text.includes("check");
};

export const ChequeManagementPage = () => {
  const [accountId, setAccountId] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({
    from: "2025-04-01",
    to: "2025-04-30",
    reconciled: "",
    flow: "",
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["bank-accounts-cheques"],
    queryFn: () => bankingService.listAccounts(),
  });

  const selectedAccount = useMemo(
    () => (accounts as BankAccount[])[0]?.id ?? "",
    [accounts],
  );

  const activeAccountId = accountId || selectedAccount;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cheque-transactions", activeAccountId, filters.from, filters.to, filters.reconciled],
    queryFn: () => bankingService.listTransactions(activeAccountId, {
      from: filters.from,
      to: filters.to,
      reconciled: filters.reconciled,
    }),
    enabled: Boolean(activeAccountId),
  });

  const rows = useMemo(() => {
    return (transactions as BankTransaction[])
      .filter((row) => isChequeTransaction(row))
      .map((row) => {
        const outAmount = Number(row.debit ?? 0);
        const inAmount = Number(row.credit ?? 0);
        const flow: "IN" | "OUT" = inAmount > 0 ? "IN" : "OUT";
        const amount = inAmount > 0 ? inAmount : outAmount;
        return {
          id: Number(row.id),
          date: row.date,
          reference: row.reference,
          narration: row.narration,
          amount,
          flow,
          isReconciled: row.isReconciled,
        };
      })
      .filter((row) => (filters.flow ? row.flow === filters.flow : true));
  }, [filters.flow, transactions]);

  const totals = rows.reduce(
    (acc, row) => {
      if (row.flow === "IN") acc.inward += row.amount;
      if (row.flow === "OUT") acc.outward += row.amount;
      if (!row.isReconciled) acc.pending += row.amount;
      return acc;
    },
    { inward: 0, outward: 0, pending: 0 },
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cheque Management"
        subtitle={`Inward ${formatCurrency(totals.inward)} | Outward ${formatCurrency(totals.outward)} | Pending ${formatCurrency(totals.pending)}`}
      />
      <BankingTabs />

      <div className="rounded-card border border-border bg-card p-4">
        <p className="mb-1 text-xs text-muted">Bank Account</p>
        <SearchableSelect
          onChange={setAccountId}
          options={(accounts as BankAccount[]).map((account) => ({
            value: account.id,
            label: `${account.bankName} - ${account.accountNoMasked}`,
            meta: account.accountName,
          }))}
          value={activeAccountId}
        />
      </div>

      <FilterBar
        filters={[
          { key: "from", type: "date", label: "From" },
          { key: "to", type: "date", label: "To" },
          {
            key: "reconciled",
            type: "select",
            label: "Reconciled",
            options: [
              { label: "Reconciled", value: "true" },
              { label: "Pending", value: "false" },
            ],
          },
          {
            key: "flow",
            type: "select",
            label: "Direction",
            options: [
              { label: "Inward", value: "IN" },
              { label: "Outward", value: "OUT" },
            ],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() =>
          setFilters({
            from: "2025-04-01",
            to: "2025-04-30",
            reconciled: "",
            flow: "",
          })}
      />

      <DataTable
        columns={[
          col.accessor("date", { header: "Date", cell: (info) => formatDate(info.getValue(), "display") }),
          col.accessor("reference", { header: "Cheque Ref", cell: (info) => info.getValue() || "-" }),
          col.accessor("narration", { header: "Narration" }),
          col.accessor("flow", {
            header: "Direction",
            cell: (info) => (
              <span className={`rounded-full px-2 py-1 text-xs ${info.getValue() === "IN" ? "bg-emerald/10 text-emerald" : "bg-ruby/10 text-ruby"}`}>
                {info.getValue()}
              </span>
            ),
          }),
          col.accessor("amount", {
            header: "Amount",
            cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
          }),
          col.accessor("isReconciled", {
            header: "Status",
            cell: (info) => (
              <span className={`rounded-full px-2 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-gold/10 text-gold"}`}>
                {info.getValue() ? "CLEARED" : "PENDING"}
              </span>
            ),
          }),
        ]}
        data={rows}
        loading={isLoading || accountsLoading}
      />
    </div>
  );
};
