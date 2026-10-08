import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { settlementService } from "@/services/settlementService";
import { SearchableSelect } from "./SearchableSelect";

interface Props {
  open: boolean;
  onClose: () => void;
  sourceNoteId: number;
  noteType: "CREDIT_NOTE" | "DEBIT_NOTE";
  partyId: number;
  partyName: string;
  outstandingNoteAmount: number;
  onApplied: () => void;
}

export const ApplyToTargetModal = ({
  open,
  onClose,
  sourceNoteId,
  noteType,
  partyId,
  partyName,
  outstandingNoteAmount,
  onApplied,
}: Props) => {
  const targetDocType = noteType === "CREDIT_NOTE" ? "invoice" : "bill";
  const [selectedTargetId, setSelectedTargetId] = useState<any | null>(null);
  const [amount, setAmount] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSelectedTargetId(null);
      setAmount("");
    }
  }, [open]);

  const { data: openDocs = [], isLoading } = useQuery({
    queryKey: ["open-documents", partyId, targetDocType],
    queryFn: () => settlementService.getOpenDocuments({ partyType: noteType === "CREDIT_NOTE" ? "customer" : "supplier", partyId, docType: targetDocType }),
    enabled: open,
  });

  const selectedDoc = selectedTargetId
    ? openDocs.find((d: any) => d.id === selectedTargetId)
    : null;

  const handleSelectDoc = (id: any) => {
    setSelectedTargetId(id);
    const doc = openDocs.find((d: any) => d.id === id);
    if (doc) {
      const remainingTarget = Number(doc.balanceDue);
      setAmount(Math.min(outstandingNoteAmount, remainingTarget).toFixed(2));
    } else {
      setAmount("");
    }
  };

  const applyMutation = useMutation({
    mutationFn: () =>
      settlementService.applyNote({
        sourceNoteId,
        allocations: [{ targetId: selectedTargetId, amount: Number(amount) }],
        settledAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      toast.success(`${noteType === "CREDIT_NOTE" ? "Credit" : "Debit"} note applied successfully`);
      onApplied();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? "Failed to apply note"),
  });

  if (!open) return null;

  const maxApply = Math.min(
    outstandingNoteAmount,
    selectedDoc ? Number(selectedDoc.balanceDue) : 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-card bg-card shadow-2xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-bold text-charcoal">
            Apply to {targetDocType === "invoice" ? "Invoice" : "Bill"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100" type="button">
            <X className="h-4 w-4 text-muted" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-lg bg-gold/5 border border-gold/20 px-4 py-3 text-sm">
            <span className="text-muted">Party:</span>{" "}
            <span className="font-semibold text-charcoal">{partyName}</span>
            <span className="ml-4 text-muted">Available Credit:</span>{" "}
            <span className="font-mono font-bold text-ruby">{formatCurrency(outstandingNoteAmount)}</span>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              Select {targetDocType === "invoice" ? "Invoice" : "Bill"}
            </p>
            <SearchableSelect
              value={selectedTargetId ?? ""}
              onChange={handleSelectDoc}
              options={openDocs.map((doc: any) => ({
                value: doc.id,
                label: `${doc.invoiceNo ?? doc.billNo} — ${formatCurrency(doc.balanceDue)} due`,
                meta: doc.status,
              }))}
            />
            {isLoading && <p className="mt-2 text-xs text-muted">Loading open {targetDocType}s...</p>}
            {openDocs.length === 0 && !isLoading && (
              <p className="mt-2 text-xs text-amber-600">No open {targetDocType}s found for this party.</p>
            )}
          </div>

          {selectedDoc && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                Amount to Apply
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono">₹</span>
                <input
                  type="number"
                  className="h-11 w-full rounded border border-border pl-8 pr-4 font-mono text-charcoal outline-none transition-all focus:border-gold focus:ring-1 focus:ring-gold"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0.01"
                  max={maxApply}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Max available: <span className="font-mono font-bold">{formatCurrency(maxApply)}</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-slate-50 px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="rounded-btn px-4 py-2 text-sm font-semibold text-muted hover:bg-slate-200 transition-colors"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={() => applyMutation.mutate()}
            disabled={!selectedTargetId || !amount || Number(amount) <= 0 || applyMutation.isPending || Number(amount) > maxApply}
            className="inline-flex items-center gap-2 rounded-btn bg-gold px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:bg-gold-dark disabled:opacity-50"
            type="button"
          >
            {applyMutation.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Apply {formatCurrency(Number(amount))}
          </button>
        </div>
      </div>
    </div>
  );
};
