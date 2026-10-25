import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService } from "@/services/reportsService";
import { PERIOD_PRESETS, getDatesForPeriod } from "@/lib/periodUtils";

export const ProfitLossPage = () => {
  const navigate = useNavigate();
  const initialDates = getDatesForPeriod("all_time");
  const [filters, setFilters] = useState<Record<string, string>>({
    period: "all_time",
    from: initialDates.from,
    to: initialDates.to,
    compare: "prior_year",
  });
  const { exportReport } = useExport();

  const handleFilterChange = (key: string, value: string) => {
    if (key === "period") {
      if (value === "custom") {
        setFilters((prev) => ({ ...prev, period: value }));
      } else {
        const dates = getDatesForPeriod(value);
        setFilters((prev) => ({
          ...prev,
          period: value,
          from: dates.from,
          to: dates.to,
        }));
      }
    } else if (key === "from" || key === "to") {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        period: "custom",
      }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleReset = () => {
    const dates = getDatesForPeriod("all_time");
    setFilters({
      period: "all_time",
      from: dates.from,
      to: dates.to,
      compare: "prior_year",
    });
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["profit-loss", filters.from, filters.to, filters.compare],
    queryFn: () => reportsService.getProfitLoss(filters),
  });

  const chartData = [
    { label: "Revenue", amount: data?.revenue?.total ?? 0 },
    { label: "COGS", amount: data?.cogs?.total ?? 0 },
    { label: "Expenses", amount: data?.expenses?.total ?? 0 },
    { label: "Net Profit", amount: data?.netProfit ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profit & Loss Statement"
        subtitle="Revenue -> COGS -> Gross Profit -> Expenses -> Net Profit"
        actions={
          <ExportButton
            onExportCSV={() => void exportReport("profit-loss", filters, "csv")}
            onExportExcel={() => void exportReport("profit-loss", filters, "excel")}
            onExportPDF={() => void exportReport("profit-loss", filters, "pdf")}
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
          { key: "from", type: "date", label: "From Date" },
          { key: "to", type: "date", label: "To Date" },
          {
            key: "compare",
            type: "select",
            label: "Comparison",
            options: [
              { label: "Prior Year", value: "prior_year" },
              { label: "Prior Period", value: "prior_period" },
            ],
          },
        ]}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
      />
      <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
        {isLoading ? (
          <div>Loading report...</div>
        ) : isError ? (
          <div className="rounded border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
            P&L report failed to load.
            <button className="ml-3 underline" onClick={() => void refetch()} type="button">
              Retry
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <details open>
                <summary className="cursor-pointer font-display text-lg font-semibold">Revenue</summary>
                {(data?.revenue?.accounts ?? []).map((row) => (
                  <div key={row.code} className="flex justify-between py-1 hover:bg-gold-tint/20 px-2 rounded transition-colors group">
                    <button
                      type="button"
                      onClick={() => navigate(`/ledger/${row.id || row.code}?from=${filters.from}&to=${filters.to}`)}
                      className="text-left font-medium text-charcoal hover:text-gold hover:underline cursor-pointer"
                    >
                      {row.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/ledger/${row.id || row.code}?from=${filters.from}&to=${filters.to}`)}
                      className="font-mono text-emerald hover:text-gold hover:underline cursor-pointer font-semibold"
                      title={`View ${row.name} Ledger (${filters.from} to ${filters.to})`}
                    >
                      {formatCurrency(row.amount)}
                    </button>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold px-2"><span>Total Revenue</span><span className="font-mono text-emerald">{formatCurrency(data?.revenue?.total ?? 0)}</span></div>
              </details>
              <details open>
                <summary className="cursor-pointer font-display text-lg font-semibold">Cost of Goods</summary>
                {(data?.cogs?.accounts ?? []).map((row) => (
                  <div key={row.code} className="flex justify-between py-1 hover:bg-gold-tint/20 px-2 rounded transition-colors group">
                    <button
                      type="button"
                      onClick={() => navigate(`/ledger/${row.id || row.code}?from=${filters.from}&to=${filters.to}`)}
                      className="text-left font-medium text-charcoal hover:text-gold hover:underline cursor-pointer"
                    >
                      {row.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/ledger/${row.id || row.code}?from=${filters.from}&to=${filters.to}`)}
                      className="font-mono text-ruby hover:text-gold hover:underline cursor-pointer font-semibold"
                      title={`View ${row.name} Ledger (${filters.from} to ${filters.to})`}
                    >
                      {formatCurrency(row.amount)}
                    </button>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold px-2"><span>Total COGS</span><span className="font-mono text-ruby">{formatCurrency(data?.cogs?.total ?? 0)}</span></div>
              </details>
              <div className="flex justify-between rounded bg-gold-tint px-3 py-2 font-medium"><span>Gross Profit</span><span className="font-mono text-gold">{formatCurrency(data?.grossProfit ?? 0)}</span></div>
              <details open>
                <summary className="cursor-pointer font-display text-lg font-semibold">Expenses</summary>
                {(data?.expenses?.accounts ?? []).map((row) => (
                  <div key={row.code} className="flex justify-between py-1 hover:bg-gold-tint/20 px-2 rounded transition-colors group">
                    <button
                      type="button"
                      onClick={() => navigate(`/ledger/${row.id || row.code}?from=${filters.from}&to=${filters.to}`)}
                      className="text-left font-medium text-charcoal hover:text-gold hover:underline cursor-pointer"
                    >
                      {row.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/ledger/${row.id || row.code}?from=${filters.from}&to=${filters.to}`)}
                      className="font-mono text-ruby hover:text-gold hover:underline cursor-pointer font-semibold"
                      title={`View ${row.name} Ledger (${filters.from} to ${filters.to})`}
                    >
                      {formatCurrency(row.amount)}
                    </button>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold px-2"><span>Total Expenses</span><span className="font-mono text-ruby">{formatCurrency(data?.expenses?.total ?? 0)}</span></div>
              </details>
              <div className="flex justify-between rounded bg-charcoal px-3 py-2 font-semibold text-white"><span>Net Profit</span><span className="font-mono text-gold-light">{formatCurrency(data?.netProfit ?? 0)}</span></div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#C9922A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
