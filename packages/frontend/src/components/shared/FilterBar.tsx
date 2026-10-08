interface FilterConfig {
  key: string;
  type: "search" | "select" | "date";
  label: string;
  options?: Array<{ label: string; value: string }>;
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}

export const FilterBar = ({ filters, values, onChange, onReset }: FilterBarProps) => (
  <div className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-border bg-card p-4">
    {filters.map((filter) => (
      <label key={filter.key} className="flex min-w-[180px] flex-col gap-1 text-xs text-muted">
        {filter.label}
        {filter.type === "select" ? (
          <select
            className="h-10 rounded border border-border bg-white px-3 text-sm text-charcoal"
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
          <input
            className="h-10 rounded border border-border bg-white px-3 text-sm text-charcoal"
            onChange={(event) => onChange(filter.key, event.target.value)}
            type={filter.type === "date" ? "date" : "text"}
            value={values[filter.key] ?? ""}
          />
        )}
      </label>
    ))}
    <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={onReset} type="button">
      Reset
    </button>
  </div>
);
