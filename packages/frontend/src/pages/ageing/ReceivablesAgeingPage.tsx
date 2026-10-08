import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Download, RefreshCw, LayoutList, LayoutGrid, SlidersHorizontal, Search, ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { reportsService, type AgeingParams, type AgeingCustomerRow, type AgeingInvoiceRow } from "@/services/reportsService";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

const heatClass = (value: number, total: number): string => {
  if (!value || total <= 0) return "";
  const ratio = value / total;
  if (ratio >= 0.5)  return "bg-ruby/10 text-ruby font-semibold";
  if (ratio >= 0.25) return "bg-orange-100 text-orange-700";
  if (ratio >= 0.1)  return "bg-yellow-100 text-yellow-700";
  return "bg-emerald/10 text-emerald";
};

const DEFAULT_BUCKET_INPUT = "30,60,90,120";

const parsePreviewBuckets = (input: string): string[] => {
  const thresholds = input.split(",").map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
  if (!thresholds.length) return ["Current", "1-30", "31-60", "61-90", "91-120", "120+"];
  const out = ["Current"];
  for (let i = 0; i < thresholds.length; i++) {
    const from = i === 0 ? 1 : thresholds[i - 1] + 1;
    const to = thresholds[i];
    out.push(`${from}-${to}`);
  }
  out.push(`${thresholds[thresholds.length - 1] + 1}+`);
  return out;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const InvoiceDetailRow = ({ inv, navigate }: { inv: AgeingInvoiceRow; navigate: ReturnType<typeof useNavigate> }) => (
  <tr className="border-b border-border/40 bg-slate-50/50 text-xs hover:bg-slate-100/60 transition-colors">
    <td className="py-1.5 pl-10 pr-3">
      <button
        className="font-mono text-sapphire hover:underline"
        onClick={() => navigate(`/invoices/${inv.id}`)}
      >
        {inv.invoiceNo}
      </button>
    </td>
    <td className="px-3 py-1.5 text-muted">{formatDate(inv.date)}</td>
    <td className="px-3 py-1.5 text-muted">{formatDate(inv.dueDate)}</td>
    <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(inv.originalAmount)}</td>
    <td className="px-3 py-1.5 text-right font-mono text-emerald">{formatCurrency(inv.paidAmount)}</td>
    <td className="px-3 py-1.5 text-right font-mono font-bold">{formatCurrency(inv.balanceDue)}</td>
    <td className="px-3 py-1.5 text-center">
      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">
        {inv.bucket}
      </span>
    </td>
    <td className="px-3 py-1.5 text-center text-muted">{inv.ageDays}d</td>
  </tr>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export const ReceivablesAgeingPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useState<AgeingParams>({ asOf: today(), view: "summary" });
  const [search, setSearch]       = useState("");
  const [bucketInput, setBucketInput] = useState(DEFAULT_BUCKET_INPUT);
  const [showBucketEditor, setShowBucketEditor] = useState(false);
  const [expandedRows, setExpandedRows]         = useState<Set<number>>(new Set());
  const [exporting, setExporting]               = useState(false);

  const queryParams: AgeingParams = { ...params, search: search || undefined };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["receivables-ageing", queryParams],
    queryFn: () => reportsService.getReceivablesAgeing(queryParams),
  });

  const bucketLabels = data?.buckets ?? parsePreviewBuckets(bucketInput);

  const applyBuckets = useCallback(() => {
    setParams((prev) => ({ ...prev, buckets: bucketInput }));
    setShowBucketEditor(false);
  }, [bucketInput]);

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await reportsService.exportReceivablesAgeing(queryParams);
      toast.success("CSV exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const rows      = data?.rows ?? [];
  const totals    = data?.grandTotals ?? {};
  const reconcile = data?.reconciliation;

  return (
    <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <PageHeader
        title="Receivables Ageing"
        subtitle={`As of ${params.asOf ?? today()} · Customer outstanding by overdue buckets`}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-btn border border-border px-3 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              onClick={handleExportCsv}
              disabled={exporting}
              type="button"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-btn border border-border px-3 text-sm hover:bg-slate-50 transition-colors"
              onClick={() => refetch()}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        }
      />


      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-card p-4 shadow-sm">
        {/* As-of Date */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">As of Date</label>
          <input
            type="date"
            className="h-9 rounded border border-border px-3 text-sm focus:border-gold outline-none"
            value={params.asOf ?? today()}
            onChange={(e) => setParams((p) => ({ ...p, asOf: e.target.value }))}
          />
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Search Customer</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              className="h-9 w-full rounded border border-border pl-8 pr-3 text-sm focus:border-gold outline-none"
              placeholder="Name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Category</label>
          <select
            className="h-9 rounded border border-border px-3 text-sm focus:border-gold outline-none"
            value={params.category ?? ""}
            onChange={(e) => setParams((p) => ({ ...p, category: e.target.value || undefined }))}
          >
            <option value="">All</option>
            <option value="B2B">B2B</option>
            <option value="RETAIL">Retail</option>
          </select>
        </div>

        {/* View toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">View</label>
          <div className="flex h-9 overflow-hidden rounded border border-border text-sm">
            <button
              className={`flex items-center gap-1.5 px-3 transition-colors ${params.view === "summary" ? "bg-gold text-white" : "hover:bg-slate-50"}`}
              onClick={() => setParams((p) => ({ ...p, view: "summary" }))}
              type="button"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Summary
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 transition-colors ${params.view === "detail" ? "bg-gold text-white" : "hover:bg-slate-50"}`}
              onClick={() => setParams((p) => ({ ...p, view: "detail" }))}
              type="button"
            >
              <LayoutList className="h-3.5 w-3.5" /> Detail
            </button>
          </div>
        </div>

        {/* Bucket config */}
        <div className="flex flex-col gap-1 relative">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Ageing Buckets</label>
          <button
            className="flex h-9 items-center gap-2 rounded border border-border px-3 text-sm hover:bg-slate-50 transition-colors"
            onClick={() => setShowBucketEditor((v) => !v)}
            type="button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
            Customize
          </button>
          {showBucketEditor && (
            <div className="absolute top-14 left-0 z-30 w-72 rounded-card border border-border bg-white p-4 shadow-xl">
              <p className="mb-1 text-xs font-bold text-charcoal">Bucket Thresholds (days)</p>
              <p className="mb-2 text-[10px] text-muted">Enter comma-separated day thresholds. E.g. <code>30,60,90,120</code></p>
              <input
                className="h-9 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none"
                value={bucketInput}
                onChange={(e) => setBucketInput(e.target.value)}
                placeholder="30,60,90,120"
              />
              <p className="mt-2 text-[10px] text-muted">Preview: <span className="font-semibold">{parsePreviewBuckets(bucketInput).join(" · ")}</span></p>
              <div className="mt-3 flex gap-2">
                <button className="flex-1 h-8 rounded bg-gold text-xs font-bold text-white hover:bg-gold-dark transition-colors" onClick={applyBuckets} type="button">Apply</button>
                <button className="flex-1 h-8 rounded border border-border text-xs hover:bg-slate-50 transition-colors" onClick={() => setShowBucketEditor(false)} type="button">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Reset */}
        <button
          className="mt-auto h-9 rounded border border-border px-3 text-sm hover:bg-slate-50 transition-colors"
          onClick={() => { setParams({ asOf: today(), view: "summary" }); setSearch(""); setBucketInput(DEFAULT_BUCKET_INPUT); }}
          type="button"
        >
          Reset
        </button>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent mr-3" />
          Calculating ageing…
        </div>
      )}

      {/* ── Table ── */}
      {!isLoading && (
        <div className="overflow-hidden rounded-card border-t-2 border-t-gold bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gold-tint">
                  {params.view === "detail" && <th className="w-8" />}
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-charcoal">Code</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-charcoal">Customer</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-charcoal">Total O/S</th>
                  {bucketLabels.map((label) => (
                    <th key={label} className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-charcoal whitespace-nowrap">{label}</th>
                  ))}
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-charcoal">Ledger</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={bucketLabels.length + 5} className="px-4 py-12 text-center text-muted">
                      No outstanding receivables found for the selected filters.
                    </td>
                  </tr>
                )}

                {rows.map((row: AgeingCustomerRow) => (
                  <>
                    <tr
                      key={row.customerId}
                      className="border-b border-border/60 hover:bg-slate-50/60 transition-colors"
                    >
                      {params.view === "detail" && (
                        <td className="w-8 pl-3">
                          <button
                            className="text-muted hover:text-gold transition-colors"
                            onClick={() => toggleRow(row.customerId)}
                            type="button"
                          >
                            {expandedRows.has(row.customerId) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono text-xs text-muted">{row.customerCode}</td>
                      <td className="px-4 py-3">
                        <button
                          className="font-semibold text-charcoal hover:text-gold transition-colors text-left"
                          onClick={() => navigate(`/customers/${row.customerId}`)}
                          type="button"
                        >
                          {row.customerName}
                        </button>
                        {row.category && <span className="ml-2 text-[10px] text-muted">{row.category}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-charcoal">
                        {formatCurrency(row.totalOutstanding)}
                      </td>
                      {bucketLabels.map((label) => {
                        const val = (row as any)[label] ?? 0;
                        return (
                          <td key={label} className="px-4 py-3 text-right">
                            {val > 0 ? (
                              <span className={`inline-block rounded px-2 py-0.5 font-mono text-xs ${heatClass(val, row.totalOutstanding)}`}>
                                {formatCurrency(val)}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <button
                          className="text-xs font-semibold text-sapphire hover:underline"
                          onClick={() => navigate(`/customer-ledger?customerId=${row.customerId}`)}
                          type="button"
                        >
                          Ledger
                        </button>
                      </td>
                    </tr>

                    {/* Detail rows */}
                    {params.view === "detail" && expandedRows.has(row.customerId) && (row.invoices ?? []).map((inv: AgeingInvoiceRow) => (
                      <InvoiceDetailRow key={inv.id} inv={inv} navigate={navigate} />
                    ))}
                  </>
                ))}
              </tbody>

              {/* Grand Totals */}
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-t-gold bg-gold-tint font-bold">
                    {params.view === "detail" && <td />}
                    <td colSpan={2} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-charcoal">
                      Grand Total ({rows.length} customers)
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-charcoal">
                      {formatCurrency(totals.totalOutstanding ?? 0)}
                    </td>
                    {bucketLabels.map((label) => (
                      <td key={label} className="px-4 py-3 text-right font-mono">
                        {formatCurrency((totals as any)[label] ?? 0)}
                      </td>
                    ))}
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
