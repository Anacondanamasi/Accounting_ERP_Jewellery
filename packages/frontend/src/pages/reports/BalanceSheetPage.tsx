import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService, type BalanceSheetResponse } from "@/services/reportsService";

const pad2 = (value: number) => String(value).padStart(2, "0");
const localDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const sectionTotal = (items: Array<{ amount: number }>) =>
  items.reduce((sum, row) => sum + row.amount, 0);

const LedgerSection = ({
  title,
  items,
}: {
  title: string;
  items: Array<{ name: string; amount: number }>;
}) => (
  <details open>
    <summary className="cursor-pointer font-medium">{title}</summary>
    {items.map((row) => (
      <div key={row.name} className="mt-1 flex justify-between"><span>{row.name}</span><span className="font-mono">{formatCurrency(row.amount)}</span></div>
    ))}
    <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold"><span>Total {title}</span><span className="font-mono">{formatCurrency(sectionTotal(items))}</span></div>
  </details>
);

export const BalanceSheetPage = () => {
  const [filters, setFilters] = useState<Record<string, string>>({
    date: localDateInputValue(new Date()),
  });
  const { exportReport } = useExport();

  const { data, isLoading, isError, refetch } = useQuery<BalanceSheetResponse>({
    queryKey: ["balance-sheet", filters],
    queryFn: () => reportsService.getBalanceSheet(filters),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Balance Sheet"
        subtitle="Assets = Liabilities + Equity check"
        actions={
          <ExportButton
            onExportCSV={() => void exportReport("balance-sheet", filters, "csv")}
            onExportExcel={() => void exportReport("balance-sheet", filters, "excel")}
            onExportPDF={() => void exportReport("balance-sheet", filters, "pdf")}
          />
        }
      />
      <FilterBar
        filters={[{ key: "date", type: "date", label: "As of Date" }]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ date: localDateInputValue(new Date()) })}
      />
      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Balance Sheet failed to load.
          <button className="ml-3 underline" onClick={() => void refetch()} type="button">
            Retry
          </button>
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="mb-2 font-display text-2xl font-semibold">Assets</h3>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-3 text-sm">
              <LedgerSection title="Current Assets" items={data?.assets.current ?? []} />
              <LedgerSection title="Non-current Assets" items={data?.assets.nonCurrent ?? []} />
              <div className="flex justify-between rounded bg-gold-tint px-3 py-2 font-semibold"><span>Total Assets</span><span className="font-mono text-gold">{formatCurrency(data?.totalAssets ?? 0)}</span></div>
            </div>
          )}
        </div>
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="mb-2 font-display text-2xl font-semibold">Liabilities & Equity</h3>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-3 text-sm">
              <LedgerSection title="Current Liabilities" items={data?.liabilities.current ?? []} />
              <LedgerSection title="Non-current Liabilities" items={data?.liabilities.nonCurrent ?? []} />
              <LedgerSection title="Equity" items={data?.equity ?? []} />
              <div className="flex justify-between rounded bg-charcoal px-3 py-2 font-semibold text-white"><span>Total Liabilities + Equity</span><span className="font-mono text-gold-light">{formatCurrency((data?.totalLiabilities ?? 0) + (data?.totalEquity ?? 0))}</span></div>
            </div>
          )}
        </div>
      </div>
      {!isLoading && (
        <div className={`rounded-card border p-4 text-sm ${data?.isBalanced ? "border-emerald/30 bg-emerald/5 text-emerald" : "border-ruby/30 bg-ruby/5 text-ruby"}`}>
          {data?.isBalanced
            ? "Balance check passed: Assets match Liabilities + Equity."
            : "Balance check failed: Please review account mappings."}
        </div>
      )}
    </div>
  );
};
