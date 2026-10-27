import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Download,
  Printer,
  Plus,
  RefreshCw,
  TrendingUp,
  CreditCard,
  AlertCircle,
  FileText,
} from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WeightCell } from "@/components/shared/WeightCell";
import { formatCurrency } from "@/lib/formatters";
import { invoiceService } from "@/services/invoiceService";
import { downloadInvoicePdf } from "@/lib/downloadPdf";
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
  const summary = data?.summary || {
    total: 0,
    paid: 0,
    outstanding: 0,
    open: 0,
    overdue: 0,
  };

  // Clean GST Tax Invoice Direct Download (PDF)
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownloadPdf = async (id: number, invoiceNo?: string) => {
    setDownloadingId(id);
    try {
      await downloadInvoicePdf(id, invoiceNo);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrint = (id: number) => {
    window.open(`/invoices/${id}/print?autoprint=1`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage GST sales invoices · Filter by financial year, quarters, months, or custom date ranges"
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

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Total Invoiced</span>
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="mt-1 font-display text-base font-bold text-charcoal sm:text-lg">
            {formatCurrency(summary.total)}
          </div>
          <div className="text-[11px] text-muted">{rows.length} total invoices</div>
        </div>

        <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Amount Received</span>
            <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 font-display text-base font-bold text-emerald-700 sm:text-lg">
            {formatCurrency(summary.paid)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Settled to bank/cash</div>
        </div>

        <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Balance Outstanding</span>
            <AlertCircle className="h-3.5 w-3.5 text-ruby" />
          </div>
          <div className="mt-1 font-display text-base font-bold text-ruby sm:text-lg">
            {formatCurrency(summary.outstanding)}
          </div>
          <div className="text-[11px] text-muted">{summary.open} open invoices</div>
        </div>

        <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Overdue Invoices</span>
            <FileText className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-1 font-display text-base font-bold text-amber-700 sm:text-lg">
            {summary.overdue}
          </div>
          <div className="text-[11px] text-amber-700 font-medium">Past payment terms</div>
        </div>
      </div>

      {/* Date Period Dropdown & Advanced Filters Bar */}
      <FilterBar
        showDatePresets
        filters={[
          { key: "search", type: "search", label: "Search Invoice or Customer" },
          { key: "from", type: "date", label: "From Date" },
          { key: "to", type: "date", label: "To Date" },
          {
            key: "status",
            type: "select",
            label: "Invoice Status",
            options: [
              { label: "Open", value: "OPEN" },
              { label: "Paid", value: "PAID" },
              { label: "Partial", value: "PARTIAL" },
              { label: "Void", value: "VOID" },
            ],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onBatchChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
        onReset={() => setFilters({})}
      />

      <DataTable
        columns={[
          col.accessor("invoiceNo", {
            header: "Invoice No",
            cell: (info) => (
              <Link
                className="text-sapphire hover:underline font-semibold font-mono"
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
                  title="Direct Download GST Tax Invoice (PDF)"
                  disabled={downloadingId === info.row.original.id}
                  onClick={() => handleDownloadPdf(info.row.original.id, info.row.original.invoiceNo)}
                  className="inline-flex h-7 items-center gap-1 rounded border border-border bg-white px-2.5 text-2xs font-bold text-charcoal hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
                >
                  <Download className={`h-3 w-3 text-gold ${downloadingId === info.row.original.id ? "animate-bounce" : ""}`} />
                  {downloadingId === info.row.original.id ? "..." : "PDF"}
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
