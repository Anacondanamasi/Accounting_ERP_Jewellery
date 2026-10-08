import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { invoiceService } from "@/services/invoiceService";

const paymentSchema = z.object({
  date: z.string().min(1),
  mode: z.string().min(1),
  amount: z.coerce.number().positive(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentInput = z.infer<typeof paymentSchema>;

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

interface RecordPaymentModalProps {
  open: boolean;
  invoiceId: number;
  invoiceNo: string;
  balanceDue: number;
  onClose: () => void;
  onSaved: () => void;
}

export const RecordPaymentModal = ({
  open,
  invoiceId,
  invoiceNo,
  balanceDue,
  onClose,
  onSaved,
}: RecordPaymentModalProps) => {
  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      mode: "UPI",
      amount: Number(toNumber(balanceDue).toFixed(2)),
      reference: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: PaymentInput) => invoiceService.recordPayment(invoiceId, payload),
    onSuccess: () => {
      toast.success("Payment recorded");
      onSaved();
      onClose();
    },
    onError: () => toast.error("Failed to record payment"),
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4" onClick={(e) => e.currentTarget === e.target && onClose()}>
      <form
        className="w-full max-w-md rounded-card bg-card p-6 shadow-modal"
        onSubmit={form.handleSubmit(async (values) => mutation.mutate(values))}
      >
        <h3 className="font-display text-2xl font-semibold text-charcoal">Record Payment</h3>
        <p className="mb-4 text-sm text-muted">
          {invoiceNo} · Amount Due: <span className="font-mono">{formatCurrency(balanceDue)}</span>
        </p>
        <div className="space-y-3">
          <label className="text-xs text-muted">
            Payment Date
            <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" {...form.register("date")} />
          </label>
          <label className="text-xs text-muted">
            Mode
            <select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("mode")}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Amount
            <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" step="0.01" type="number" {...form.register("amount", { valueAsNumber: true })} />
            <p className="mt-1 text-xs text-ruby">{form.formState.errors.amount?.message}</p>
          </label>
          <label className="text-xs text-muted">
            Reference
            <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("reference")} />
          </label>
          <label className="text-xs text-muted">
            Notes
            <textarea className="mt-1 min-h-20 w-full rounded border border-border px-3 py-2 text-sm" {...form.register("notes")} />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={mutation.isPending} type="submit">
            Save Payment
          </button>
        </div>
      </form>
    </div>
  );
};
