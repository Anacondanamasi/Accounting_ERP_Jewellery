import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WeightCell } from "@/components/shared/WeightCell";
import { formatCurrency } from "@/lib/formatters";
import { billService } from "@/services/billService";
import { format } from "date-fns";

interface BillRow {
  id: number;
  billNo: string;
  date: string;
  supplier?: { name: string };
  lines: Array<{ netWt: number }>;
  grandTotal: number;
  balanceDue: number;
  dueDate: string;
  status: string;
}

const col = createColumnHelper<BillRow>();

export const BillListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bills", filters],
    queryFn: () => billService.list(filters),
  });

  const rows: BillRow[] = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Bills"
        subtitle="Supplier-side payable register"
        actions={
          <>
            <button className="h-10 rounded-btn border border-border px-4 text-sm" type="button">
              Bulk Export
            </button>
            <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => navigate("/bills/new")} type="button">
              + New Bill
            </button>
          </>
        }
      />
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search" },
          { key: "from", type: "date", label: "From" },
          { key: "to", type: "date", label: "To" },
          {
            key: "status",
            type: "select",
            label: "Status",
            options: [
              { label: "Open", value: "OPEN" },
              { label: "Void", value: "VOID" },
              { label: "Paid", value: "PAID" },
              { label: "Partial", value: "PARTIAL" },
            ],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({})}
      />
      <DataTable
        columns={[
          col.accessor("billNo", {
            header: "Bill No",
            cell: (info) => <Link className="text-sapphire hover:underline" to={`/bills/${info.row.original.id}/edit`}>{info.getValue()}</Link>,
          }),
          col.accessor("date", { 
            header: "Date",
            cell: (info) => {
              const val = info.getValue();
              return val ? format(new Date(val), "dd-MM-yyyy") : "";
            }
          }),
          col.accessor((row) => row.supplier?.name ?? "-", { header: "Supplier" }),
          col.accessor((row) => row.lines.reduce((sum, line) => sum + Number(line.netWt ?? 0), 0), {
            header: "Gold Wt",
            cell: (info) => <WeightCell weight={info.getValue()} unit="g" />,
          }),
          col.accessor("grandTotal", { header: "Total", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("balanceDue", { header: "Balance", cell: (info) => <span className="font-mono text-ruby">{formatCurrency(info.getValue())}</span> }),
          col.accessor("dueDate", { 
            header: "Due Date",
            cell: (info) => {
              const val = info.getValue();
              return val ? format(new Date(val), "dd-MM-yyyy") : "";
            }
          }),
          col.accessor("status", { header: "Status", cell: (info) => <StatusBadge status={info.getValue()} /> }),
        ]}
        data={rows}
        loading={isLoading}
        onRowClick={(row) => navigate(`/bills/${row.id}/edit`)}
      />
      <button className="h-9 rounded-btn border border-border px-4 text-sm" onClick={() => void refetch()} type="button">
        Refresh
      </button>
    </div>
  );
};
