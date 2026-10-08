import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";

interface CustomRow {
  metric: string;
  value: number;
}

const sampleRows: CustomRow[] = [
  { metric: "Total Sales", value: 1245000 },
  { metric: "Total Purchase", value: 832400 },
  { metric: "Gross Margin", value: 412600 },
];

export const ReportViewerPage = () => {
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-4">
      <PageHeader title="Custom Reports" subtitle="Configure a range and review summary metrics" />
      <div className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4">
        <label className="text-xs text-muted">From<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="text-xs text-muted">To<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      <div className="rounded-card border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gold-tint text-charcoal">
            <tr>
              <th className="border-b border-border px-3 py-2 text-left font-semibold">Metric</th>
              <th className="border-b border-border px-3 py-2 text-left font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {sampleRows.map((row) => (
              <tr key={row.metric} className="border-b border-border/60">
                <td className="px-3 py-2">{row.metric}</td>
                <td className="px-3 py-2 font-mono">{formatCurrency(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
