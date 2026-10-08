import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrintableWrapper } from "@/components/shared/PrintableWrapper";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService, type DayBookResponse } from "@/services/reportsService";

const col = createColumnHelper<DayBookResponse["sales"][number]>();

const pad2 = (value: number) => String(value).padStart(2, "0");
const localDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const LedgerSection = ({
  title,
  rows,
}: {
  title: string;
  rows: DayBookResponse["sales"];
}) => (
  <div className="rounded-card border border-border bg-card p-4 shadow-card">
    <h3 className="mb-2 font-display text-xl font-semibold">{title}</h3>
    <DataTable
      columns={[
        col.accessor("refNo", { header: "Ref No" }),
        col.accessor("party", { header: "Party", cell: (info) => info.getValue() ?? "-" }),
        col.accessor("narration", { header: "Narration", cell: (info) => info.getValue() ?? "-" }),
        col.accessor("mode", { header: "Mode", cell: (info) => info.getValue() ?? "-" }),
        col.accessor("amount", {
          header: "Amount",
          cell: (info) => <span className="font-mono">{formatCurrency(info.getValue() ?? 0)}</span>,
        }),
      ]}
      data={rows}
    />
  </div>
);

export const DayBookPage = () => {
  const [date, setDate] = useState(localDateInputValue(new Date()));
  const { exportReport } = useExport();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["day-book", date],
    queryFn: () => reportsService.getDayBook({ date }),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Day Book"
        subtitle="All transactions grouped by type for selected date"
        actions={
          <div className="flex items-center gap-2">
            <input
              className="h-10 rounded border border-border px-3 text-sm"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <ExportButton
              onExportCSV={() => void exportReport("day-book", { date }, "csv")}
              onExportExcel={() => void exportReport("day-book", { date }, "excel")}
              onExportPDF={() => void exportReport("day-book", { date }, "pdf")}
            />
          </div>
        }
      />
      {isLoading ? (
        <div className="rounded-card bg-card p-6 shadow-card">Loading day book...</div>
      ) : isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Day Book failed to load.
          <button className="ml-3 underline" onClick={() => void refetch()} type="button">
            Retry
          </button>
        </div>
      ) : (
        <PrintableWrapper>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-card border border-border bg-card p-4 shadow-card">
              <div className="text-xs text-muted">Total Sales</div>
              <div className="font-mono text-lg text-emerald">{formatCurrency(data?.totals.totalSales ?? 0)}</div>
            </div>
            <div className="rounded-card border border-border bg-card p-4 shadow-card">
              <div className="text-xs text-muted">Total Purchases</div>
              <div className="font-mono text-lg text-ruby">{formatCurrency(data?.totals.totalPurchases ?? 0)}</div>
            </div>
            <div className="rounded-card border border-border bg-card p-4 shadow-card">
              <div className="text-xs text-muted">Total Receipts</div>
              <div className="font-mono text-lg text-emerald">{formatCurrency(data?.totals.totalReceipts ?? 0)}</div>
            </div>
            <div className="rounded-card border border-border bg-card p-4 shadow-card">
              <div className="text-xs text-muted">Total Payments</div>
              <div className="font-mono text-lg text-ruby">{formatCurrency(data?.totals.totalPayments ?? 0)}</div>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <LedgerSection title="Sales" rows={data?.sales ?? []} />
            <LedgerSection title="Purchases" rows={data?.purchases ?? []} />
            <LedgerSection title="Receipts" rows={data?.receipts ?? []} />
            <LedgerSection title="Payments" rows={data?.payments ?? []} />
          </div>
          <LedgerSection title="Journals" rows={data?.journals ?? []} />
        </PrintableWrapper>
      )}
    </div>
  );
};
