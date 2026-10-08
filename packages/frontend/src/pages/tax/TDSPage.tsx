import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { taxService } from "@/services/taxService";

const col = createColumnHelper<{
  id: number;
  vendorName: string;
  section: string;
  thresholdCrossed: boolean;
  purchaseAmount: number;
  tdsRate: number;
  tdsAmount: number;
  deductedAt: string;
  filedAt?: string;
}>();

export const TDSPage = () => {
  const [filters, setFilters] = useState<Record<string, string>>({
    from: "2025-04-01",
    to: "2025-04-30",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tax-tds", filters],
    queryFn: () => taxService.getTdsSummary(filters),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="TDS Management"
        subtitle="Section 194Q monitoring and vendor-wise TDS summary"
        actions={
          <ExportButton
            onExportCSV={() => toast.info("TDS CSV export queued")}
            onExportExcel={() => toast.info("TDS Excel export queued")}
            onExportPDF={() => toast.info("Form 16A-style PDF export queued")}
          />
        }
      />

      <FilterBar
        filters={[
          { key: "from", type: "date", label: "From" },
          { key: "to", type: "date", label: "To" },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ from: "2025-04-01", to: "2025-04-30" })}
      />

      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load TDS summary.
          <button className="ml-3 underline" onClick={() => void refetch()} type="button">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-card border border-border bg-card p-4 shadow-card text-sm">
          <div className="text-muted">Vendors Tracked</div>
          <div className="font-mono text-lg">{data?.totals.vendors ?? 0}</div>
        </div>
        <div className="rounded-card border border-border bg-card p-4 shadow-card text-sm">
          <div className="text-muted">Purchase Value</div>
          <div className="font-mono text-lg">{formatCurrency(data?.totals.totalPurchases ?? 0)}</div>
        </div>
        <div className="rounded-card border border-border bg-card p-4 shadow-card text-sm">
          <div className="text-muted">TDS Deducted</div>
          <div className="font-mono text-lg text-gold">{formatCurrency(data?.totals.totalTds ?? 0)}</div>
        </div>
      </div>

      <DataTable
        columns={[
          col.accessor("vendorName", { header: "Vendor" }),
          col.accessor("section", { header: "Section" }),
          col.accessor("thresholdCrossed", {
            header: "Threshold",
            cell: (info) => (
              <span className={`rounded-full px-3 py-1 text-xs ${info.getValue() ? "bg-ruby/10 text-ruby" : "bg-emerald/10 text-emerald"}`}>
                {info.getValue() ? "Crossed" : "Within Limit"}
              </span>
            ),
          }),
          col.accessor("purchaseAmount", {
            header: "Purchase Amount",
            cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
          }),
          col.accessor("tdsRate", { header: "TDS %" }),
          col.accessor("tdsAmount", {
            header: "TDS Amount",
            cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
          }),
          col.accessor("deductedAt", { header: "Deducted At" }),
          col.accessor("filedAt", { header: "Filed At", cell: (info) => info.getValue() ?? "Pending" }),
          col.display({
            id: "actions",
            header: "Action",
            cell: (info) => (
              <button
                className="rounded border border-border px-2 py-1 text-xs"
                onClick={() => toast.success(`TDS certificate generated for ${info.row.original.vendorName}`)}
                type="button"
              >
                Generate 16A
              </button>
            ),
          }),
        ]}
        data={data?.rows ?? []}
        loading={isLoading}
      />
    </div>
  );
};
