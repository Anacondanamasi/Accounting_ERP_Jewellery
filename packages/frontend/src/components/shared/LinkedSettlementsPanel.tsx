/**
 * LinkedSettlementsPanel
 *
 * Renders the Xero-style "Linked Settlements" card on any Invoice or Bill view.
 * Shows: original amount, all credit notes / payments applied, total settled,
 * outstanding balance. Supports applying a credit note and reversing a settlement.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trash2, Link, PlusCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { settlementService } from "@/services/settlementService";
import { StatusBadge } from "./StatusBadge";
import { ApplyNoteModal } from "./ApplyNoteModal";
import { ApplyToTargetModal } from "./ApplyToTargetModal";

interface Props {
  targetType: "invoice" | "bill" | "note";
  targetId: number;
  grandTotal: number;
  partyId: number;
  partyName: string;
  status: string;
  onSettled?: () => void;
}

const fmtDate = (v: unknown) => {
  if (!v) return "—";
  try { return format(new Date(String(v)), "dd-MMM-yyyy"); } catch { return "—"; }
};

const sourceLabel: Record<string, string> = {
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE:  "Debit Note",
  PAYMENT:     "Payment",
};

const sourceColor: Record<string, string> = {
  CREDIT_NOTE: "text-ruby",
  DEBIT_NOTE:  "text-ruby",
  PAYMENT:     "text-emerald-600",
};

export const LinkedSettlementsPanel = ({
  targetType,
  targetId,
  grandTotal,
  partyId,
  partyName,
  status,
  onSettled,
}: Props) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [applyNoteOpen, setApplyNoteOpen] = useState(false);

  const summaryKey = ["settlement-summary", targetType, targetId];

  const { data: summary, isLoading } = useQuery({
    queryKey: summaryKey,
    queryFn: () => settlementService.getSummary(targetType, targetId),
  });

  const reverseMutation = useMutation({
    mutationFn: (settlementId: number) => settlementService.reverse(settlementId),
    onSuccess: () => {
      toast.success("Settlement reversed");
      void qc.invalidateQueries({ queryKey: summaryKey });
      onSettled?.();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? "Could not reverse settlement"),
  });

  if (isLoading) {
    return (
      <div className="rounded-card border border-border bg-card p-6 shadow-card animate-pulse">
        <div className="h-4 w-48 rounded bg-slate-200" />
      </div>
    );
  }

  const linked = summary?.linkedSettlements ?? [];
  const totalSettled = linked.reduce((s: number, l: any) => s + l.amount, 0);
  const outstanding = Number(grandTotal) - totalSettled;
  const computedStatus =
    outstanding <= 0        ? "PAID"
    : totalSettled > 0      ? "PARTIAL"
    : "OPEN";

  return (
    <>
      <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-sapphire" />
            <h3 className="font-display font-bold text-charcoal">Linked Settlements</h3>
          </div>
          {/* Only show Apply if there is still an outstanding balance */}
          {outstanding > 0.005 && (
            <button
              className="inline-flex items-center gap-1.5 rounded-btn bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20 transition-colors"
              onClick={() => setApplyNoteOpen(true)}
              type="button"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              {targetType === "note"
                ? (window.location.pathname.includes("debit") ? "Apply to Bill" : "Apply to Invoice")
                : "Apply Credit Note"}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                {["Type","Ref No.","Date","Amount Applied",""].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linked.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                    No settlements linked yet.
                  </td>
                </tr>
              )}
              {linked.map((item: any, i: number) => (
                <tr key={i} className="border-t border-border/50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold ${sourceColor[item.sourceType] ?? "text-charcoal"}`}>
                      {sourceLabel[item.sourceType] ?? item.type}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      let path = "";
                      if (targetType === "note") {
                        if (item.type === "INVOICE") path = `/invoices/${item.targetId}`;
                        else if (item.type === "BILL") path = `/bills/${item.targetId}`;
                      } else {
                        // Original behavior for invoices/bills targeting notes/payments
                        // Assuming payments don't have a distinct view page right now except ledger
                        if (item.sourceType === "CREDIT_NOTE") path = `/credit-notes/${item.sourceId}`;
                        else if (item.sourceType === "DEBIT_NOTE") path = `/debit-notes/${item.sourceId}`;
                        else if (item.sourceType === "PAYMENT") path = `/advance-receipts`;
                      }
                      
                      if (path) {
                        return (
                          <button
                            className="font-mono text-xs font-semibold text-sapphire underline underline-offset-2 hover:text-sapphire/70"
                            onClick={() => navigate(path)}
                            type="button"
                          >
                            {item.refNo}
                          </button>
                        );
                      }
                      return <span className="font-mono text-xs text-charcoal">{item.refNo}</span>;
                    })()}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-xs text-muted">{fmtDate(item.date)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-mono text-xs font-bold ${sourceColor[item.sourceType] ?? ""}`}>
                      −{formatCurrency(item.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {item.id && (
                      <button
                        className="rounded p-1 text-muted hover:bg-ruby/10 hover:text-ruby transition-colors"
                        onClick={() => {
                          if (confirm(`Reverse this settlement of ${formatCurrency(item.amount)}? The outstanding balance will be restored.`)) {
                            reverseMutation.mutate(item.id);
                          }
                        }}
                        title="Reverse settlement"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Footer summary */}
            <tfoot className="bg-gold/5 border-t-2 border-border font-semibold text-sm">
              <tr>
                <td colSpan={3} className="px-5 py-3 text-right text-xs uppercase tracking-wider text-muted">
                  Total Settled
                </td>
                <td className="px-5 py-3 text-right font-mono text-emerald-600">
                  {totalSettled > 0 ? `−${formatCurrency(totalSettled)}` : formatCurrency(0)}
                </td>
                <td />
              </tr>
              <tr className="border-t border-border/60">
                <td colSpan={3} className="px-5 py-3 text-right text-xs uppercase tracking-wider text-charcoal">
                  Original Amount
                </td>
                <td className="px-5 py-3 text-right font-mono font-bold text-charcoal">
                  {formatCurrency(grandTotal)}
                </td>
                <td />
              </tr>
              <tr className="border-t border-border">
                <td colSpan={3} className="px-5 py-3 text-right text-sm font-bold text-charcoal">
                  Outstanding Balance
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`font-mono text-base font-extrabold ${outstanding <= 0 ? "text-emerald-600" : "text-ruby"}`}>
                    {formatCurrency(Math.max(0, outstanding))}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={computedStatus} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Overpaid alert */}
        {outstanding < -0.005 && (
          <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>This document is <strong>overpaid</strong> by {formatCurrency(Math.abs(outstanding))}. Please review.</span>
          </div>
        )}
      </div>

      {/* Apply Note Modal */}
      {targetType !== "note" && (
        <ApplyNoteModal
          open={applyNoteOpen}
          onClose={() => setApplyNoteOpen(false)}
          targetType={targetType as "invoice" | "bill"}
          targetId={targetId}
          partyId={partyId}
          partyName={partyName}
          outstanding={outstanding}
          onApplied={() => {
            void qc.invalidateQueries({ queryKey: summaryKey });
            setApplyNoteOpen(false);
            onSettled?.();
          }}
        />
      )}
      {targetType === "note" && (
        <ApplyToTargetModal
          open={applyNoteOpen}
          onClose={() => setApplyNoteOpen(false)}
          sourceNoteId={targetId}
          noteType={(window.location.pathname.includes("debit") ? "DEBIT_NOTE" : "CREDIT_NOTE")}
          partyId={partyId}
          partyName={partyName}
          outstandingNoteAmount={outstanding}
          onApplied={() => {
            void qc.invalidateQueries({ queryKey: summaryKey });
            setApplyNoteOpen(false);
            onSettled?.();
          }}
        />
      )}
    </>
  );
};
