import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import {
  bankingService,
  type BankAccount,
  type BankTransaction,
} from "@/services/bankingService";
import { BankingTabs } from "./BankingTabs";

const col = createColumnHelper<BankTransaction>();

const manualTxnSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    narration: z.string().min(1, "Narration is required"),
    reference: z.string().optional(),
    debit: z.coerce.number().nonnegative(),
    credit: z.coerce.number().nonnegative(),
    balance: z.coerce.number(),
  })
  .refine((value) => !(value.debit > 0 && value.credit > 0), {
    message: "Only one of debit or credit can be non-zero",
    path: ["credit"],
  })
  .refine((value) => value.debit > 0 || value.credit > 0, {
    message: "Either debit or credit must be greater than zero",
    path: ["debit"],
  });

type ManualTxnInput = z.infer<typeof manualTxnSchema>;

export const BankTransactionsPage = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>({
    from: "2025-04-01",
    to: "2025-04-30",
    reconciled: "",
  });
  const [accountId, setAccountId] = useState(searchParams.get("accountId") ?? 1);
  const [showManual, setShowManual] = useState(false);

  const form = useForm<ManualTxnInput>({
    resolver: zodResolver(manualTxnSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      narration: "",
      reference: "",
      debit: 0,
      credit: 0,
      balance: 0,
    },
  });

  const {
    data: accounts = [],
    isError: accountsError,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["bank-accounts-selector"],
    queryFn: () => bankingService.listAccounts(),
  });

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["bank-transactions", accountId, filters],
    queryFn: () => bankingService.listTransactions(accountId, filters),
    enabled: Boolean(accountId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: ManualTxnInput) => bankingService.createTransaction(accountId, payload),
    onSuccess: () => {
      toast.success("Transaction added");
      setShowManual(false);
      form.reset({
        date: new Date().toISOString().slice(0, 10),
        narration: "",
        reference: "",
        debit: 0,
        credit: 0,
        balance: 0,
      });
      void refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) =>
      toast.error(error.response?.data?.error?.message ?? "Unable to add transaction"),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bank Transactions"
        subtitle="Statement and books transactions with reconciliation status"
        actions={
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => setShowManual((prev) => !prev)} type="button">
            Manual Add Transaction
          </button>
        }
      />
      <BankingTabs />

      {accountsError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load bank account options.
          <button className="ml-3 underline" onClick={() => void refetchAccounts()} type="button">
            Retry
          </button>
        </div>
      ) : null}

      <div className="rounded-card border border-border bg-card p-4">
        <p className="mb-1 text-xs text-muted">Bank Account</p>
        <SearchableSelect
          onChange={setAccountId}
          options={accounts.map((account: BankAccount) => ({
            value: account.id,
            label: `${account.bankName} - ${account.accountNoMasked}`,
            meta: account.accountName,
          }))}
          value={accountId}
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
              { label: "Unreconciled", value: "false" },
            ],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ from: "2025-04-01", to: "2025-04-30", reconciled: "" })}
      />
      {showManual && (
        <form
          className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-6"
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          <label className="text-xs text-muted">Date<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" {...form.register("date")} /></label>
          <label className="text-xs text-muted md:col-span-2">Narration<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("narration")} /></label>
          <label className="text-xs text-muted">Reference<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("reference")} /></label>
          <label className="text-xs text-muted">Debit<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("debit", { valueAsNumber: true })} /></label>
          <label className="text-xs text-muted">Credit<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("credit", { valueAsNumber: true })} /></label>
          <label className="text-xs text-muted">Balance<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("balance", { valueAsNumber: true })} /></label>
          <div className="text-xs text-ruby md:col-span-6">{Object.values(form.formState.errors)[0]?.message as string}</div>
          <div className="md:col-span-6">
            <button className="h-10 rounded-btn border border-border px-4 text-sm disabled:opacity-50" disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </form>
      )}
      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load bank transactions.
          <button className="ml-3 underline" onClick={() => void refetch()} type="button">
            Retry
          </button>
        </div>
      ) : null}
      <DataTable
        columns={[
          col.accessor("date", { header: "Date" }),
          col.accessor("narration", { header: "Narration" }),
          col.accessor("reference", { header: "Reference", cell: (info) => info.getValue() ?? "-" }),
          col.accessor("debit", {
            header: "Debit",
            cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
          }),
          col.accessor("credit", {
            header: "Credit",
            cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
          }),
          col.accessor("balance", {
            header: "Balance",
            cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
          }),
          col.accessor("isReconciled", {
            header: "Reconciled",
            cell: (info) => (
              <span className={`rounded-full px-3 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-gold/10 text-gold"}`}>
                {info.getValue() ? "Yes" : "No"}
              </span>
            ),
          }),
        ]}
        data={data ?? []}
        loading={isLoading}
      />
    </div>
  );
};
