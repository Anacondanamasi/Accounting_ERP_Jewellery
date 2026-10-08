import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Printer, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LinkedSettlementsPanel } from "@/components/shared/LinkedSettlementsPanel";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { noteService } from "@/services/noteService";

export const CreditNoteViewPage = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["credit-note", id],
    queryFn: () => noteService.credit.getById(id as any),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3 text-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <span className="text-sm">Loading Credit Note…</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 rounded-card bg-card p-12 shadow-card">
        <FileText className="h-12 w-12 text-muted/40" />
        <p className="text-lg font-semibold text-muted">Credit Note not found.</p>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-btn bg-gold px-5 text-sm font-bold text-white hover:bg-gold-dark transition-all"
          onClick={() => navigate("/credit-notes")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to List
        </button>
      </div>
    );
  }

  const subTotal = Number(data.subTotal ?? 0);
  const taxTotal = Number(data.taxTotal ?? 0);
  const grandTotal = Number(data.grandTotal ?? 0);

  return (
    <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title={data.noteNo ?? `Credit Note #${id}`}
        subtitle={`Issued: ${formatDate(data.date)}${data.referenceNo ? ` · Ref: ${data.referenceNo}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm font-medium hover:bg-slate-50 transition-colors"
              onClick={() => navigate("/credit-notes")}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm font-medium hover:bg-slate-50 transition-colors"
              onClick={() => window.print()}
              type="button"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all"
              onClick={() => navigate(`/credit-notes/${id}/edit`)}
              type="button"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
          </div>
        }
      />

      {/* ── Header Card ───────────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Status & Party */}
        <div className="md:col-span-2 rounded-card border-t-2 border-t-gold bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={data.status ?? "POSTED"} />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              {data.type === "CREDIT_NOTE" ? "Credit Note" : data.type}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Customer</p>
              <p className="mt-1 font-semibold text-charcoal">
                {data.customer?.name ?? (data.customerId ? `Customer #${data.customerId}` : "Walking Customer")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Note Date</p>
              <p className="mt-1 font-semibold text-charcoal">{formatDate(data.date)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Reference Invoice</p>
              <p className="mt-1 font-mono text-sm text-charcoal">{data.referenceNo || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Note No</p>
              <p className="mt-1 font-mono text-sm font-bold text-gold">{data.noteNo}</p>
            </div>
          </div>

          {data.reason && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Reason for Credit</p>
              <p className="mt-1 text-sm text-amber-800">{data.reason}</p>
            </div>
          )}
        </div>

        {/* Totals Summary */}
        <div className="rounded-card border-t-4 border-t-gold bg-card p-6 shadow-card flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Amount Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Sub Total</span>
                <span className="font-mono font-semibold">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tax (GST)</span>
                <span className="font-mono font-semibold">{formatCurrency(taxTotal)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-end justify-between">
              <span className="text-sm font-bold text-charcoal">Total Credit</span>
              <span className="font-display text-2xl font-extrabold text-gold">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <LinkedSettlementsPanel
        targetType="note"
        targetId={Number(id)}
        grandTotal={grandTotal}
        partyId={data.customerId ?? 0}
        partyName={data.customer?.name ?? "Customer"}
        status={data.status ?? "POSTED"}
      />

      {/* ── Line Items ────────────────────────────────────────────── */}
      <div className="rounded-card border-t-2 border-t-gold bg-card shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-display text-lg font-bold text-charcoal">Line Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gold-tint text-charcoal">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">GST %</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Tax Amt</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data.lines ?? []).map((line: any, idx: number) => (
                <tr
                  key={line.id ?? idx}
                  className="border-b border-border/60 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-4 py-3 text-muted">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-charcoal">{line.description}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(line.quantity).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(Number(line.rate))}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(Number(line.amount))}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(line.gstPct).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(Number(line.taxAmount))}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-charcoal">
                    {formatCurrency(Number(line.total))}
                  </td>
                </tr>
              ))}
              {(!data.lines || data.lines.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                    No line items found.
                  </td>
                </tr>
              )}
            </tbody>
            {(data.lines ?? []).length > 0 && (
              <tfoot>
                <tr className="bg-gold-tint font-bold">
                  <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-charcoal">
                    Totals
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(subTotal)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(taxTotal)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gold">{formatCurrency(grandTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
