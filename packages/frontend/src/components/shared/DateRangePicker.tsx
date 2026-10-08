interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

export const DateRangePicker = ({ value, onChange }: DateRangePickerProps) => (
  <div className="flex items-center gap-2">
    <input
      className="h-10 rounded border border-border px-3 text-sm"
      onChange={(event) => onChange({ ...value, from: event.target.value })}
      type="date"
      value={value.from}
    />
    <span className="text-muted">to</span>
    <input
      className="h-10 rounded border border-border px-3 text-sm"
      onChange={(event) => onChange({ ...value, to: event.target.value })}
      type="date"
      value={value.to}
    />
  </div>
);
