import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { useExport } from "@/hooks/useExport";
import { formatCurrency } from "@/lib/formatters";
import { reportsService, type TrialBalanceAccountRow } from "@/services/reportsService";
import { PERIOD_PRESETS, getDatesForPeriod } from "@/lib/periodUtils";

export const TrialBalancePage = () => {
  const navigate = useNavigate();
  const initialDates = getDatesForPeriod("all_time");
  const [searchTable, setSearchTable] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({
    period: "all_time",
    from: initialDates.from,
    to: initialDates.to,
    date: initialDates.to,
    compare: "prior_year",
    onlyWithBalance: "true",
    view: "account",
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
          date: dates.to,
        }));
      }
    } else if (key === "from" || key === "to") {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        period: "custom",
        date: key === "to" ? value : prev.to,
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
      date: dates.to,
      compare: "prior_year",
      onlyWithBalance: "true",
      view: "account",
    });
    setSearchTable("");
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["trial-balance", filters.from, filters.to, filters.compare],
    queryFn: () =>
      reportsService.getTrialBalance({
        from: filters.from,
        to: filters.to,
        date: filters.to,
        compare: filters.compare,
      }),
  });

  const rows = useMemo(() => {
    const source = data?.accounts ?? [];
    return filters.onlyWithBalance === "true"
      ? source.filter((row) => Math.abs(row.debit - row.credit) > 0)
      : source;
  }, [data?.accounts, filters.onlyWithBalance]);

  const displayRows = useMemo(() => {
    if (!searchTable.trim()) return rows;
    const q = searchTable.toLowerCase();
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q),
    );
  }, [rows, searchTable]);

  const handleDrilldown = (row: TrialBalanceAccountRow) => {
    const target = row.id || row.code;
    const from = filters.from || "";
    const to = filters.to || filters.date || "";
    navigate(`/ledger/${target}?from=${from}&to=${to}`);
  };

  const totalDebit = data?.totalDr ?? rows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = data?.totalCr ?? rows.reduce((sum, r) => sum + r.credit, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trial Balance"
        subtitle="As-of view with debit-credit validation"
        actions={
          <ExportButton
            onExportCSV={() => void exportReport("trial-balance", filters, "csv")}
            onExportExcel={() => void exportReport("trial-balance", filters, "excel")}
            onExportPDF={() => void exportReport("trial-balance", filters, "pdf")}
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
            key: "onlyWithBalance",
            type: "select",
            label: "Rows",
            options: [
              { label: "Only accounts with balance", value: "true" },
              { label: "Show all accounts", value: "false" },
            ],
          },
          {
            key: "view",
            type: "select",
            label: "View",
            options: [
              { label: "Account wise detail", value: "account" },
              { label: "Group-wise total", value: "group" },
            ],
          },
        ]}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
      />
      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Trial Balance failed to load.
          <button className="ml-3 underline" onClick={() => void refetch()} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {/* Continuous table with all lines and integrated accounting footer */}
      <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
        <div className="border-b border-border p-3">
          <input
            className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none"
            onChange={(e) => setSearchTable(e.target.value)}
            placeholder="Search code, account name or type..."
            value={searchTable}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gold-tint text-charcoal">
              <tr>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Code
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Account
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Type
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">
                  Debit
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">
                  Credit
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">
                  Prev Year
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    Loading Trial Balance...
                  </td>
                </tr>
              )}
              {!isLoading && displayRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    No accounts found for this period.
                  </td>
                </tr>
              )}
              {!isLoading &&
                displayRows.map((row) => (
                  <tr key={row.code} className="hover:bg-gold-tint/20 transition-colors group">
                    <td className="px-4 py-2.5 font-bold font-mono text-charcoal">
                      <button
                        onClick={() => handleDrilldown(row)}
                        className="text-left font-mono font-bold text-charcoal hover:text-gold hover:underline cursor-pointer"
                        title={`View ${row.name} Ledger`}
                        type="button"
                      >
                        {row.code}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-charcoal">
                      <button
                        onClick={() => handleDrilldown(row)}
                        className="text-left font-medium text-charcoal hover:text-gold hover:underline cursor-pointer"
                        title={`View ${row.name} Ledger for ${filters.from} to ${filters.to}`}
                        type="button"
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-charcoal">
                      {row.debit > 0 ? (
                        <button
                          onClick={() => handleDrilldown(row)}
                          className="font-mono font-semibold text-charcoal hover:text-gold hover:underline cursor-pointer transition-colors"
                          title={`View ${row.name} Ledger (${filters.from} to ${filters.to})`}
                          type="button"
                        >
                          {formatCurrency(row.debit)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-charcoal">
                      {row.credit > 0 ? (
                        <button
                          onClick={() => handleDrilldown(row)}
                          className="font-mono font-semibold text-charcoal hover:text-gold hover:underline cursor-pointer transition-colors"
                          title={`View ${row.name} Ledger (${filters.from} to ${filters.to})`}
                          type="button"
                        >
                          {formatCurrency(row.credit)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted">
                      {row.previousYear > 0 ? formatCurrency(row.previousYear) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
            {/* Integrated Accounting Footer */}
            <tfoot className="border-t-2 border-b-2 border-border bg-gold-tint/40 font-bold text-sm">
              <tr>
                <td className="px-4 py-3 font-bold uppercase tracking-wider text-charcoal" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono text-base font-bold text-charcoal">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-base font-bold text-charcoal">
                  {formatCurrency(totalCredit)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
