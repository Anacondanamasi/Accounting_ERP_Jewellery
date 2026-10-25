import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService, type BalanceSheetResponse } from "@/services/reportsService";
import { PERIOD_PRESETS, getDatesForPeriod, formatIsoDate } from "@/lib/periodUtils";

const sectionTotal = (items: Array<{ amount: number }>) =>
  items.reduce((sum, row) => sum + row.amount, 0);

const LedgerSection = ({
  title,
  items,
  onDrilldown,
}: {
  title: string;
  items: Array<{ id?: number; code?: string; name: string; amount: number }>;
  onDrilldown: (item: { id?: number; code?: string; name: string }) => void;
}) => (
  <details open>
    <summary className="cursor-pointer font-medium">{title}</summary>
    {items.map((row) => {
      const isCalculatedEarnings = row.name === "Current Period Earnings";
      return (
        <div key={row.name} className="mt-1 flex justify-between py-1 px-2 rounded hover:bg-gold-tint/20 transition-colors group">
          {isCalculatedEarnings ? (
            <span className="font-medium text-charcoal">{row.name}</span>
          ) : (
            <button
              type="button"
              onClick={() => onDrilldown(row)}
              className="text-left font-medium text-charcoal hover:text-gold hover:underline cursor-pointer"
            >
              {row.name}
            </button>
          )}
          {isCalculatedEarnings ? (
            <span className="font-mono">{formatCurrency(row.amount)}</span>
          ) : (
            <button
              type="button"
              onClick={() => onDrilldown(row)}
              className="font-mono font-semibold text-charcoal hover:text-gold hover:underline cursor-pointer"
              title={`View ${row.name} Ledger as of date`}
            >
              {formatCurrency(row.amount)}
            </button>
          )}
        </div>
      );
    })}
    <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold px-2"><span>Total {title}</span><span className="font-mono">{formatCurrency(sectionTotal(items))}</span></div>
  </details>
);

export const BalanceSheetPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({
    period: "all_time",
    date: formatIsoDate(new Date()),
  });
  const { exportReport } = useExport();

  const handleDrilldown = (item: { id?: number; code?: string; name: string }) => {
    const target = item.id || item.code || item.name.split(" - ")[0];
    navigate(`/ledger/${target}?to=${filters.date}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === "period") {
      if (value === "custom") {
        setFilters((prev) => ({ ...prev, period: value }));
      } else {
        const dates = getDatesForPeriod(value);
        setFilters((prev) => ({
          ...prev,
          period: value,
          date: dates.to,
        }));
      }
    } else if (key === "date") {
      setFilters((prev) => ({
        ...prev,
        date: value,
        period: "custom",
      }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleReset = () => {
    setFilters({
      period: "all_time",
      date: formatIsoDate(new Date()),
    });
  };

  const { data, isLoading, isError, refetch } = useQuery<BalanceSheetResponse>({
    queryKey: ["balance-sheet", filters.date],
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
        filters={[
          {
            key: "period",
            type: "select",
            label: "Select Period",
            options: PERIOD_PRESETS.map((p) => ({ label: p.label, value: p.value })),
          },
          { key: "date", type: "date", label: "As of Date" },
        ]}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
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
              <LedgerSection title="Current Assets" items={data?.assets.current ?? []} onDrilldown={handleDrilldown} />
              <LedgerSection title="Non-current Assets" items={data?.assets.nonCurrent ?? []} onDrilldown={handleDrilldown} />
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
              <LedgerSection title="Current Liabilities" items={data?.liabilities.current ?? []} onDrilldown={handleDrilldown} />
              <LedgerSection title="Non-current Liabilities" items={data?.liabilities.nonCurrent ?? []} onDrilldown={handleDrilldown} />
              <LedgerSection title="Equity" items={data?.equity ?? []} onDrilldown={handleDrilldown} />
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
