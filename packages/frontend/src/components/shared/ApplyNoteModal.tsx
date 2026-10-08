/**
 * ApplyNoteModal
 *
 * Step 1: Search and select an open credit/debit note for this party
 * Step 2: Enter allocation amount (pre-filled with min of note remaining vs invoice outstanding)
 * Step 3: Preview + Confirm → calls applyNote
 */
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/formatters";
import { settlementService } from "@/services/settlementService";
import { noteService } from "@/services/noteService";

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: "invoice" | "bill";
  targetId: number;
  partyId: number;
  partyName: string;
  outstanding: number;
  onApplied: () => void;
}

const fmtDate = (v: unknown) => {
  if (!v) return "—";
  try { return format(new Date(String(v)), "dd-MMM-yyyy"); } catch { return "—"; }
};

export const ApplyNoteModal = ({ open, onClose, targetType, targetId, partyId, partyName, outstanding, onApplied }: Props) => {
  const noteType = targetType === "invoice" ? "credit" : "debit";
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [amount, setAmount] = useState<string>("");

  // Reset on open
  useEffect(() => {
    if (open) { setSelectedNote(null); setAmount(""); }
  }, [open]);

  // Fetch available credit/debit notes for this party
  const { data: notes = [], isLoading } = useQuery({
    queryKey: [`open-${noteType}-notes`, partyId],
    queryFn: () =>
      noteType === "credit"
        ? noteService.credit.list().then((rows: any[]) =>
            rows.filter((n: any) => n.customerId === partyId && Number(n.grandTotal) - Number(n.usedAmount ?? 0) > 0.005)
          )
        : noteService.debit.list().then((rows: any[]) =>
            rows.filter((n: any) => n.supplierId === partyId && Number(n.grandTotal) - Number(n.usedAmount ?? 0) > 0.005)
          ),
    enabled: open,
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      settlementService.applyNote({
        sourceNoteId: selectedNote.id,
        allocations: [{ targetId, amount: Number(amount) }],
        settledAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      toast.success(`${noteType === "credit" ? "Credit" : "Debit"} note applied successfully`);
      onApplied();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? "Failed to apply note"),
  });

  if (!open) return null;

  const remainingOnNote = selectedNote
    ? Number(selectedNote.grandTotal) - Number(selectedNote.usedAmount ?? 0)
    : 0;

  const maxApply = Math.min(remainingOnNote, outstanding);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-card bg-card shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-bold text-charcoal">
            Apply {noteType === "credit" ? "Credit" : "Debit"} Note
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100" type="button">
            <X className="h-4 w-4 text-muted" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Party info */}
          <div className="rounded-lg bg-gold/5 border border-gold/20 px-4 py-3 text-sm">
            <span className="text-muted">Applying to:</span>{" "}
            <span className="font-semibold text-charcoal">{partyName}</span>
            <span className="ml-4 text-muted">Outstanding:</span>{" "}
            <span className="font-mono font-bold text-ruby">{formatCurrency(outstanding)}</span>
          </div>

          {/* Step 1: Select note */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
              Available {noteType === "credit" ? "Credit" : "Debit"} Notes
            </label>
            {isLoading && <p className="text-sm text-muted">Loading…</p>}
            {!isLoading && notes.length === 0 && (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted">
                No open {noteType} notes for {partyName}
              </p>
            )}
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {notes.map((note: any) => {
                const remaining = Number(note.grandTotal) - Number(note.usedAmount ?? 0);
                const isSelected = selectedNote?.id === note.id;
                return (
                  <button
                    key={note.id}
                    className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                      isSelected
                        ? "border-gold bg-gold/10 shadow-sm"
                        : "border-border hover:border-gold/40 hover:bg-slate-50"
                    }`}
                    onClick={() => { setSelectedNote(note); setAmount(String(Math.min(remaining, outstanding))); }}
                    type="button"
                  >
                    <div>
                      <span className="font-mono font-semibold text-charcoal">{note.noteNo}</span>
                      <span className="ml-3 text-xs text-muted">{fmtDate(note.date)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs text-muted line-through">{formatCurrency(note.grandTotal)}</div>
                      <div className="font-mono font-bold text-emerald">{formatCurrency(remaining)} available</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedNote && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
                Amount to Apply
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
                  <input
                    className="h-10 w-full rounded-lg border border-border bg-canvas pl-7 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gold/40"
                    type="number"
                    min="0.01"
                    max={maxApply}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <button
                  className="text-xs text-sapphire underline"
                  onClick={() => setAmount(String(maxApply))}
                  type="button"
                >
                  Max {formatCurrency(maxApply)}
                </button>
              </div>
              {Number(amount) > maxApply && (
                <p className="mt-1 text-xs text-ruby">Exceeds available amount</p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            className="h-9 rounded-btn border border-border px-4 text-sm"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>

          <button
            className="inline-flex h-9 items-center gap-2 rounded-btn bg-emerald px-5 text-sm font-bold text-white disabled:opacity-50"
            disabled={!selectedNote || !amount || Number(amount) <= 0 || Number(amount) > maxApply || applyMutation.isPending}
            onClick={() => applyMutation.mutate()}
            type="button"
          >
            <CheckCircle className="h-4 w-4" />
            {applyMutation.isPending ? "Applying…" : "Apply Note"}
          </button>
        </div>
      </div>
    </div>
  );
};
