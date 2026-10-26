import { Calendar, RotateCcw, X } from "lucide-react";
import { useMemo } from "react";
import { PERIOD_PRESETS, getDatesForPeriod } from "@/lib/periodUtils";

export interface FilterConfig {
  key: string;
  type: "search" | "select" | "date" | "date_preset";
  label: string;
  options?: Array<{ label: string; value: string }>;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
  onBatchChange?: (updates: Record<string, string>) => void;
  showDatePresets?: boolean;
}

const findMatchingPreset = (from?: string, to?: string): string => {
  if (!from && !to) return "all_time";
  for (const preset of PERIOD_PRESETS) {
    if (preset.value === "custom" || preset.value === "all_time") continue;
    const dates = preset.getFromTo();
    if (dates.from === from && dates.to === to) {
      return preset.value;
    }
  }
  return "custom";
};

const DEFAULT_QUICK_PILLS = [
  { value: "all_time", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "this_month", label: "This Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_fy", label: "This FY" },
];

export const FilterBar = ({
  filters,
  values,
  onChange,
  onReset,
  onBatchChange,
  showDatePresets,
}: FilterBarProps) => {
  const hasDateFilters = useMemo(
    () =>
      showDatePresets ||
      filters.some((f) => f.key === "from" || f.key === "to" || f.type === "date"),
    [filters, showDatePresets]
  );

  const currentPreset = useMemo(
    () => findMatchingPreset(values.from, values.to),
    [values.from, values.to]
  );

  const handleSelectPreset = (presetKey: string) => {
    const dates = getDatesForPeriod(presetKey);
    if (onBatchChange) {
      onBatchChange({ from: dates.from, to: dates.to });
    } else {
      onChange("from", dates.from);
      onChange("to", dates.to);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return Object.values(values).some((v) => Boolean(v && v.trim()));
  }, [values]);

  return (
    <div className="mb-4 rounded-card border border-border bg-card p-4 shadow-xs space-y-3">
      {/* Quick Date Period Presets Bar (if date filters present) */}
      {hasDateFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Calendar className="h-3.5 w-3.5 text-gold" />
            <span>Date Range:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {DEFAULT_QUICK_PILLS.map((pill) => {
              const isActive = currentPreset === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => handleSelectPreset(pill.value)}
                  className={`rounded-btn px-2.5 py-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-gold text-white shadow-xs font-bold"
                      : "border border-border/80 bg-white text-muted hover:bg-canvas hover:text-charcoal"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Filter Inputs Grid */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Date Period Dropdown */}
        {hasDateFilters && (
          <label className="flex min-w-[200px] flex-col gap-1 text-xs font-semibold text-muted">
            <span>Date Period</span>
            <select
              className="h-10 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal outline-none focus:border-gold"
              value={currentPreset}
              onChange={(e) => handleSelectPreset(e.target.value)}
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Dynamic Filters */}
        {filters.map((filter) => (
          <label
            key={filter.key}
            className="flex min-w-[170px] flex-1 flex-col gap-1 text-xs font-semibold text-muted sm:min-w-[180px]"
          >
            <span>{filter.label}</span>
            {filter.type === "select" ? (
              <select
                className="h-10 rounded-btn border border-border bg-white px-3 text-xs text-charcoal outline-none focus:border-gold"
                onChange={(event) => onChange(filter.key, event.target.value)}
                value={values[filter.key] ?? ""}
              >
                <option value="">All</option>
                {filter.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <input
                  className="h-10 w-full rounded-btn border border-border bg-white px-3 text-xs text-charcoal outline-none focus:border-gold"
                  onChange={(event) => onChange(filter.key, event.target.value)}
                  type={filter.type === "date" ? "date" : "text"}
                  value={values[filter.key] ?? ""}
                  placeholder={filter.type === "search" ? "Type to search..." : ""}
                />
                {values[filter.key] && filter.type === "search" && (
                  <button
                    type="button"
                    onClick={() => onChange(filter.key, "")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-charcoal"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </label>
        ))}

        {/* Reset Button */}
        <button
          className={`h-10 inline-flex items-center gap-1.5 rounded-btn border px-4 text-xs font-semibold transition-colors ${
            hasActiveFilters
              ? "border-ruby/30 bg-ruby/5 text-ruby hover:bg-ruby/10"
              : "border-border bg-white text-muted hover:bg-canvas"
          }`}
          onClick={onReset}
          type="button"
          title="Reset all filters"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
};
