import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { billService } from "@/services/billService";

const paymentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  mode: z.string().min(1, "Mode is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  reference: z.string().optional(),
});

type PaymentInput = z.infer<typeof paymentSchema>;

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

interface RecordBillPaymentModalProps {
  open: boolean;
  billId: number;
  billNo: string;
  balanceDue: number;
  onClose: () => void;
  onSaved: () => void;
}

export const RecordBillPaymentModal = ({
  open,
  billId,
  billNo,
  balanceDue,
  onClose,
  onSaved,
}: RecordBillPaymentModalProps) => {
  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      mode: "BANK_TRANSFER",
      amount: Number(toNumber(balanceDue).toFixed(2)),
      reference: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: PaymentInput) => billService.recordPayment(billId, payload),
    onSuccess: () => {
      toast.success("Supplier payment recorded");
      onSaved();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.userMessage || "Failed to record payment");
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <h3 className="font-display text-lg font-bold text-charcoal">Record Supplier Payment</h3>
        <p className="mt-1 text-xs text-muted">
          Bill: <span className="font-semibold text-charcoal">{billNo}</span> · Outstanding:{" "}
          <span className="font-mono font-semibold text-ruby">{formatCurrency(balanceDue)}</span>
        </p>

        <form
          className="mt-4 space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Payment Date</label>
            <input
              className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none"
              type="date"
              {...form.register("date")}
            />
            {form.formState.errors.date && (
              <p className="mt-1 text-xs text-ruby">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Payment Mode</label>
            <select
              className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none"
              {...form.register("mode")}
            >
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Amount (₹)</label>
            <input
              className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none"
              step="0.01"
              type="number"
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="mt-1 text-xs text-ruby">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Reference / Transaction ID</label>
            <input
              className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none"
              placeholder="UTR / Cheque No / Trans ID"
              {...form.register("reference")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="h-10 rounded-btn border border-border px-4 text-sm font-medium hover:bg-slate-50 transition-colors"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow hover:bg-gold-dark transition-all disabled:opacity-50"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? "Recording…" : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
