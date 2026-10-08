import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WeightCell } from "@/components/shared/WeightCell";
import { formatCurrency } from "@/lib/formatters";
import { invoiceService } from "@/services/invoiceService";
import { format } from "date-fns";

interface InvoiceRow {
  id: number;
  invoiceNo: string;
  date: string;
  customer?: { name: string };
  lines: Array<{ netWt: number }>;
  grandTotal: number;
  balanceDue: number;
  dueDate: string;
  status: string;
}

const col = createColumnHelper<InvoiceRow>();

export const InvoiceListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => invoiceService.list(filters),
  });

  const rows: InvoiceRow[] = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Invoices"
        subtitle="April 2025 · All statuses"
        actions={
          <>
            <button className="h-10 rounded-btn border border-border px-4 text-sm" type="button">
              Bulk Export
            </button>
            <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => navigate("/invoices/new")} type="button">
              + New Invoice
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
              { label: "Draft", value: "Draft" },
              { label: "Posted", value: "POSTED" },
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
          col.accessor("invoiceNo", {
            header: "Invoice No",
            cell: (info) => (
              <Link className="text-sapphire hover:underline" to={`/invoices/${info.row.original.id}`}>
                {info.getValue()}
              </Link>
            ),
          }),
          col.accessor("date", { 
            header: "Date",
            cell: (info) => {
              const val = info.getValue();
              return val ? format(new Date(val), "dd-MM-yyyy") : "";
            }
          }),
          col.accessor((row) => row.customer?.name ?? "-", { header: "Customer" }),
          col.accessor((row) => row.lines.reduce((sum, line) => sum + Number(line.netWt ?? 0), 0), {
            header: "Gold Wt",
            cell: (info) => <WeightCell weight={info.getValue()} unit="g" />,
          }),
          col.accessor("grandTotal", {
            header: "Total",
            cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
          }),
          col.accessor("balanceDue", {
            header: "Balance",
            cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
          }),
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
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
      />
      <button className="h-9 rounded-btn border border-border px-4 text-sm" onClick={() => void refetch()} type="button">
        Refresh
      </button>
    </div>
  );
};
