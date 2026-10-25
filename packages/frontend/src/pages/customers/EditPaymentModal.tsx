import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { paymentService, PaymentUpdateInput } from "@/services/paymentService";
import { AlertCircle, Calendar, CreditCard, DollarSign, FileText, Hash, Trash2, X } from "lucide-react";

interface EditPaymentModalProps {
  open: boolean;
  payment: any | null;
  onClose: () => void;
  onSaved: () => void;
}

export const EditPaymentModal = ({
  open,
  payment,
  onClose,
  onSaved,
}: EditPaymentModalProps) => {
  const [date, setDate] = useState("");
  const [mode, setMode] = useState("UPI");
  const [amount, setAmount] = useState<number | string>("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!payment) return;
    const rawDate = payment.date;
    const formattedDate = rawDate
      ? new Date(rawDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    setDate(formattedDate);
    setMode(payment.mode || "UPI");
    setAmount(payment.amount ?? "");
    setReference(payment.reference || "");
    setNotes(payment.notes || "");
    setConfirmDelete(false);
  }, [payment]);

  const updateMutation = useMutation({
    mutationFn: (data: PaymentUpdateInput) => paymentService.update(Number(payment.id), data),
    onSuccess: () => {
      toast.success("Payment receipt updated successfully");
      onSaved();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update payment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => paymentService.delete(Number(payment.id)),
    onSuccess: () => {
      toast.success("Payment deleted and balance restored");
      onSaved();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete payment");
    },
  });

  if (!open || !payment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    updateMutation.mutate({
      date,
      mode,
      amount: numAmount,
      reference: reference || null,
      notes: notes || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg rounded-xl border border-gold/30 bg-card p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-charcoal">Edit Payment Receipt</h3>
            <p className="text-xs text-muted">
              {payment.number || payment.reference || `Payment #${payment.id}`}
              {payment.invoiceNo && (
                <span className="ml-2 font-mono text-sapphire">
                  · Invoice: {payment.invoiceNo}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded p-1 text-muted hover:bg-slate-100 hover:text-charcoal transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Informative banner */}
        <div className="mb-4 flex items-center justify-between rounded-lg bg-gold/10 p-3 text-xs text-charcoal">
          <span>Customer: <strong>{payment.customerName || "Customer"}</strong></span>
          <span className="font-mono font-bold text-emerald-600">
            Current: {formatCurrency(Number(payment.amount || 0))}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Payment Date */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-charcoal mb-1">
                <Calendar className="h-3.5 w-3.5 text-gold" />
                Payment Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-charcoal mb-1">
                <CreditCard className="h-3.5 w-3.5 text-gold" />
                Payment Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                <option value="UPI">UPI / QR</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="CASH">Cash Counter</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-charcoal mb-1">
              <DollarSign className="h-3.5 w-3.5 text-gold" />
              Amount Received (₹)
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-canvas px-3 font-mono text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/40"
              placeholder="0.00"
            />
          </div>

          {/* Reference / Txn No */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-charcoal mb-1">
              <Hash className="h-3.5 w-3.5 text-gold" />
              Reference / Txn ID
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              placeholder="e.g. IMPS-HDFC-991122, UPI reference, Cheque number"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-charcoal mb-1">
              <FileText className="h-3.5 w-3.5 text-gold" />
              Narration / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-border bg-canvas p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              placeholder="Optional payment notes or comments"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-lg border border-ruby/30 bg-ruby/10 px-3 py-2 text-xs font-semibold text-ruby hover:bg-ruby hover:text-white transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ruby font-semibold">Confirm delete?</span>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="rounded bg-ruby px-2.5 py-1 text-xs text-white hover:bg-ruby/90"
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded border border-border px-2 py-1 text-xs text-muted"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-charcoal hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-lg bg-gold px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
