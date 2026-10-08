import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { expenseService } from "@/services/expenseService";
import { formatCurrency } from "@/lib/formatters";
import { useState } from "react";

interface ExpenseRow {
  id: number;
  date: string;
  reference: string | null;
  amount: number;
  narration: string | null;
  expenseAccount: string;
  paymentAccount: string;
  supplierName: string | null;
  journalEntryNo: string | null;
}

const col = createColumnHelper<ExpenseRow>();

export const ExpenseListPage = () => {
  const navigate = useNavigate();
  
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [filters, setFilters] = useState<Record<string, string>>({
    from: firstDay,
    to: lastDay,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses-list", filters],
    queryFn: () => expenseService.list(filters),
  });

  const rows: ExpenseRow[] = (data ?? []).map((item: any) => ({
    ...item,
    date: item.date ? new Date(item.date).toLocaleDateString("en-IN") : "—",
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Direct Expenses"
        subtitle="Operational expenses paid directly from Cash or Bank"
        actions={
          <button
            className="flex h-10 items-center gap-2 rounded-btn bg-gold px-4 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:bg-gold-dark transition-all"
            onClick={() => navigate("/expenses/new")}
            type="button"
          >
            <Receipt className="h-4 w-4" />
            + Add Expense
          </button>
        }
      />

      <FilterBar
        filters={[
          { key: "from", type: "date", label: "From" },
          { key: "to", type: "date", label: "To" },
        ]}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ from: firstDay, to: lastDay })}
        values={filters}
      />

      <DataTable
        columns={[
          col.accessor("date", { header: "Date" }),
          col.accessor("reference", {
            header: "Reference",
            cell: (info) => <span className="font-mono text-xs">{info.getValue() ?? "—"}</span>,
          }),
          col.accessor("expenseAccount", { header: "Expense Ledger" }),
          col.accessor("paymentAccount", { header: "Paid Via" }),
          col.accessor("supplierName", {
            header: "Supplier",
            cell: (info) => info.getValue() ?? <span className="text-muted text-xs">—</span>,
          }),
          col.accessor("narration", {
            header: "Narration",
            cell: (info) => (
              <span className="max-w-xs truncate block text-sm text-slate-600" title={info.getValue() ?? ""}>
                {info.getValue() ?? "—"}
              </span>
            ),
          }),
          col.accessor("amount", {
            header: "Amount",
            cell: (info) => (
              <span className="font-mono font-semibold text-charcoal">
                {formatCurrency(info.getValue())}
              </span>
            ),
          }),
          col.accessor("journalEntryNo", {
            header: "Voucher No",
            cell: (info) => (
              <span className="font-mono text-xs text-gold">
                {info.getValue() ?? "—"}
              </span>
            ),
          }),
        ]}
        data={rows}
        loading={isLoading}
      />
    </div>
  );
};
