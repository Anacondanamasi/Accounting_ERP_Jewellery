import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Download, Printer, Plus, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WeightCell } from "@/components/shared/WeightCell";
import { formatCurrency } from "@/lib/formatters";
import { invoiceService } from "@/services/invoiceService";
import { format } from "date-fns";
import { toast } from "sonner";

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

  // Clean GST Tax Invoice Print and Save as PDF
  const handleDownloadPdf = (id: number) => {
    window.open(`/invoices/${id}/print?autoprint=1`, "_blank", "noopener,noreferrer");
  };

  const handlePrint = (id: number) => {
    window.open(`/invoices/${id}/print?autoprint=1`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage sales invoices · Click row to edit"
        actions={
          <>
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-colors shadow-sm"
              onClick={() => void refetch()}
              type="button"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-gold px-4 text-xs font-bold text-white shadow hover:bg-gold-dark transition-all"
              onClick={() => navigate("/invoices/new")}
              type="button"
            >
              <Plus className="h-4 w-4" />
              New Invoice
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
              <Link
                className="text-sapphire hover:underline font-semibold"
                to={`/invoices/${info.row.original.id}/edit`}
                onClick={(e) => e.stopPropagation()}
              >
                {info.getValue()}
              </Link>
            ),
          }),
          col.accessor("date", {
            header: "Date",
            cell: (info) => {
              const val = info.getValue();
              return val ? format(new Date(val), "dd-MM-yyyy") : "";
            },
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
            },
          }),
          col.accessor("status", {
            header: "Status",
            cell: (info) => <StatusBadge status={info.getValue()} />,
          }),
          col.display({
            id: "actions",
            header: "Actions",
            cell: (info) => (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  title="Download Clean GST Tax Invoice (PDF / Print)"
                  onClick={() => handleDownloadPdf(info.row.original.id)}
                  className="inline-flex h-7 items-center gap-1 rounded border border-border bg-white px-2.5 text-2xs font-bold text-charcoal hover:bg-slate-50 shadow-sm transition-all"
                >
                  <Download className="h-3 w-3 text-gold" />
                  Download PDF
                </button>
                <button
                  type="button"
                  title="Print Clean GST Invoice"
                  onClick={() => handlePrint(info.row.original.id)}
                  className="inline-flex h-7 items-center gap-1 rounded border border-border bg-white px-2 text-2xs font-semibold text-charcoal hover:bg-slate-50 shadow-sm transition-all"
                >
                  <Printer className="h-3 w-3 text-muted" />
                  Print
                </button>
              </div>
            ),
          }),
        ]}
        data={rows}
        loading={isLoading}
        onRowClick={(row) => navigate(`/invoices/${row.id}/edit`)}
      />
    </div>
  );
};
export default InvoiceListPage;
