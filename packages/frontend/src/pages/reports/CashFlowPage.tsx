import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService, type CashFlowResponse } from "@/services/reportsService";

const pad2 = (value: number) => String(value).padStart(2, "0");
const localDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const CashFlowPage = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [filters, setFilters] = useState<Record<string, string>>({
    from: localDateInputValue(firstDayOfMonth(today)),
    to: localDateInputValue(today),
  });
  const { exportReport } = useExport();

  const handleDrilldown = (label: string) => {
    const code = label.split(" - ")[0].trim();
    if (code) {
      navigate(`/ledger/${code}?from=${filters.from}&to=${filters.to}`);
    }
  };

  const { data, isLoading, isError, refetch } = useQuery<CashFlowResponse>({
    queryKey: ["cash-flow", filters],
    queryFn: () => reportsService.getCashFlow(filters),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cash Flow Statement"
        subtitle="Operating / Investing / Financing (Indirect Method)"
        actions={
          <ExportButton
            onExportCSV={() => void exportReport("cash-flow", filters, "csv")}
            onExportExcel={() => void exportReport("cash-flow", filters, "excel")}
            onExportPDF={() => void exportReport("cash-flow", filters, "pdf")}
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
        onReset={() =>
          setFilters({
            from: localDateInputValue(firstDayOfMonth(new Date())),
            to: localDateInputValue(new Date()),
          })
        }
      />
      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Cash Flow report failed to load.
          <button className="ml-3 underline" onClick={() => void refetch()} type="button">
            Retry
          </button>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="mb-2 font-display text-xl font-semibold">Operating</h3>
          {isLoading ? <div>Loading...</div> : (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between py-1 px-2"><span>Net Profit</span><span className="font-mono font-semibold">{formatCurrency(data?.operating.netProfit ?? 0)}</span></div>
              {(data?.operating.adjustments ?? []).map((item) => (
                <div key={item.label} className="flex justify-between py-1 px-2 rounded hover:bg-gold-tint/20 transition-colors group">
                  <button
                    type="button"
                    onClick={() => handleDrilldown(item.label)}
                    className="text-left font-medium text-charcoal hover:text-gold hover:underline cursor-pointer"
                  >
                    {item.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDrilldown(item.label)}
                    className={`font-mono font-semibold hover:text-gold hover:underline cursor-pointer ${item.amount >= 0 ? "text-emerald" : "text-ruby"}`}
                    title={`View ${item.label} Ledger`}
                  >
                    {formatCurrency(item.amount)}
                  </button>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-1 font-semibold px-2"><span>Net Operating</span><span className="font-mono">{formatCurrency(data?.operating.net ?? 0)}</span></div>
            </div>
          )}
        </div>
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="mb-2 font-display text-xl font-semibold">Investing</h3>
          {isLoading ? <div>Loading...</div> : (
            <div className="space-y-1 text-sm">
              {(data?.investing.items ?? []).map((item) => (
                <div key={item.label} className="flex justify-between py-1 px-2 rounded hover:bg-gold-tint/20 transition-colors group">
                  <button
                    type="button"
                    onClick={() => handleDrilldown(item.label)}
                    className="text-left font-medium text-charcoal hover:text-gold hover:underline cursor-pointer"
                  >
                    {item.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDrilldown(item.label)}
                    className={`font-mono font-semibold hover:text-gold hover:underline cursor-pointer ${item.amount >= 0 ? "text-emerald" : "text-ruby"}`}
                    title={`View ${item.label} Ledger`}
                  >
                    {formatCurrency(item.amount)}
                  </button>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-1 font-semibold px-2"><span>Net Investing</span><span className="font-mono">{formatCurrency(data?.investing.net ?? 0)}</span></div>
            </div>
          )}
        </div>
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="mb-2 font-display text-xl font-semibold">Financing</h3>
          {isLoading ? <div>Loading...</div> : (
            <div className="space-y-1 text-sm">
              {(data?.financing.items ?? []).map((item) => (
                <div key={item.label} className="flex justify-between py-1 px-2 rounded hover:bg-gold-tint/20 transition-colors group">
                  <button
                    type="button"
                    onClick={() => handleDrilldown(item.label)}
                    className="text-left font-medium text-charcoal hover:text-gold hover:underline cursor-pointer"
                  >
                    {item.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDrilldown(item.label)}
                    className={`font-mono font-semibold hover:text-gold hover:underline cursor-pointer ${item.amount >= 0 ? "text-emerald" : "text-ruby"}`}
                    title={`View ${item.label} Ledger`}
                  >
                    {formatCurrency(item.amount)}
                  </button>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-1 font-semibold px-2"><span>Net Financing</span><span className="font-mono">{formatCurrency(data?.financing.net ?? 0)}</span></div>
            </div>
          )}
        </div>
      </div>
      {!isLoading && (
        <div className="rounded-card border border-border bg-card p-4">
          <div className="grid gap-2 text-sm md:grid-cols-4">
            <div className="flex justify-between md:block"><span className="text-muted">Opening Cash</span><div className="font-mono">{formatCurrency(data?.openingCash ?? 0)}</div></div>
            <div className="flex justify-between md:block"><span className="text-muted">Net Change</span><div className={`font-mono ${(data?.netChange ?? 0) >= 0 ? "text-emerald" : "text-ruby"}`}>{formatCurrency(data?.netChange ?? 0)}</div></div>
            <div className="flex justify-between md:block"><span className="text-muted">Closing Cash</span><div className="font-mono text-gold">{formatCurrency(data?.closingCash ?? 0)}</div></div>
            <div className="flex justify-between md:block"><span className="text-muted">Check</span><div className="font-mono">{formatCurrency((data?.openingCash ?? 0) + (data?.netChange ?? 0))}</div></div>
          </div>
        </div>
      )}
    </div>
  );
};
