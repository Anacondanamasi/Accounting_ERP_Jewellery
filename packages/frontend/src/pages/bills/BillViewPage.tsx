import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { FileText, History } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { billService } from "@/services/billService";
import { LinkedSettlementsPanel } from "@/components/shared/LinkedSettlementsPanel";
import { TransactionJournalModal } from "@/components/shared/TransactionJournalModal";
import { EntityHistoryDrawer } from "@/components/shared/EntityHistoryDrawer";

export const BillViewPage = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [journalOpen, setJournalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => billService.getById(id),
  });

  // Keyboard shortcuts: Ctrl/Cmd+J (Journal), Alt+H (History)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setJournalOpen((prev) => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setHistoryOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const postMutation = useMutation({
    mutationFn: () => billService.post(id),
    onSuccess: () => {
      toast.success("Bill posted");
      void refetch();
    },
  });
  const duplicateMutation = useMutation({
    mutationFn: () => billService.duplicate(id),
    onSuccess: (record) => {
      toast.success("Bill duplicated");
      navigate(`/bills/${record.id}/edit`);
    },
  });
  const voidMutation = useMutation({
    mutationFn: () => billService.void(id),
    onSuccess: () => {
      toast.success("Bill voided");
      void refetch();
    },
  });
  const paymentMutation = useMutation({
    mutationFn: () =>
      billService.recordPayment(id, {
        date: new Date().toISOString().slice(0, 10),
        mode: "BANK_TRANSFER",
        amount: paymentAmount,
      }),
    onSuccess: () => {
      toast.success("Supplier payment recorded");
      setShowPayment(false);
      void refetch();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error?.message ?? "Unable to record payment"),
  });

  if (isLoading || !data) {
    return <div className="rounded-card bg-card p-6 shadow-card">Loading bill...</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={data.billNo}
        subtitle={`Supplier: ${data.supplierName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setJournalOpen(true)}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-sapphire/30 bg-sapphire/5 px-3 text-xs font-semibold text-sapphire hover:bg-sapphire/15 transition-colors"
              title="View double-entry ledger lines (Ctrl+J)"
            >
              <FileText className="h-3.5 w-3.5" />
              Journal (Ctrl+J)
            </button>

            <button
              onClick={() => setHistoryOpen(true)}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-colors"
              title="View audit history (Alt+H)"
            >
              <History className="h-3.5 w-3.5" />
              History
            </button>

            <button className="h-9 rounded-btn border border-border px-3 text-xs" onClick={() => navigate(`/bills/${id}/edit`)} type="button">Edit</button>
            <button className="h-9 rounded-btn border border-border px-3 text-xs" onClick={() => duplicateMutation.mutate()} type="button">Duplicate</button>
            <button className="h-9 rounded-btn border border-border px-3 text-xs" onClick={() => setShowPayment((prev) => !prev)} type="button">Record Payment</button>
            {data.status !== "VOID" && (
              <button className="h-9 rounded-btn bg-ruby px-3 text-xs text-white" onClick={() => voidMutation.mutate()} type="button">Void</button>
            )}
          </div>
        }
      />

      <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <StatusBadge status={data.status} />
          <span className="text-sm text-muted">Due {data.dueDate}</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gold-tint text-charcoal">
            <tr>
              <th className="px-2 py-2 text-left">SKU</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-left">Karat</th>
              <th className="px-2 py-2 text-right">Net Wt</th>
              <th className="px-2 py-2 text-right">Rate/g</th>
              <th className="px-2 py-2 text-right">GST%</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line: any, idx: number) => (
              <tr key={`${line.sku}-${idx}`} className="border-b border-border">
                <td className="px-2 py-2 font-mono">{line.sku}</td>
                <td className="px-2 py-2">{line.description}</td>
                <td className="px-2 py-2">{line.karat}</td>
                <td className="px-2 py-2 text-right font-mono">{formatWeight(line.netWt, "g")}</td>
                <td className="px-2 py-2 text-right font-mono">{formatCurrency(line.ratePerGram)}</td>
                <td className="px-2 py-2 text-right font-mono">{line.gstPct.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="mb-2 font-display text-xl font-semibold">Payment History</h3>
          {data.payments.length === 0 ? (
            <p className="text-sm text-muted">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.payments.map((payment: any) => (
                <li key={payment.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                  <span>{payment.date} · {payment.mode}</span>
                  <span className="font-mono">{formatCurrency(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="mb-2 font-display text-xl font-semibold">Totals</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Sub Total</span><span className="font-mono">{formatCurrency(data.subTotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span className="font-mono">{formatCurrency(data.discount)}</span></div>
            <div className="flex justify-between"><span>Taxable</span><span className="font-mono">{formatCurrency(data.taxableAmount)}</span></div>
            <div className="flex justify-between"><span>GST</span><span className="font-mono">{formatCurrency(data.taxTotal)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Grand Total</span><span className="font-mono">{formatCurrency(data.grandTotal)}</span></div>
            <div className="flex justify-between"><span>Paid</span><span className="font-mono text-emerald">{formatCurrency(data.paidAmount)}</span></div>
            <div className="flex justify-between"><span>Balance Due</span><span className="font-mono text-ruby">{formatCurrency(data.balanceDue)}</span></div>
          </div>
          {showPayment && (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              <label className="block text-xs text-muted">
                Payment Amount
                <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" step="0.01" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.target.value))} />
              </label>
              <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => paymentMutation.mutate()} type="button">Save Payment</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Linked Settlements ──────────────────────────────────────── */}
      <LinkedSettlementsPanel
        targetType="bill"
        targetId={data.id}
        grandTotal={data.grandTotal}
        partyId={data.supplierId}
        partyName={data.supplierName ?? data.supplier?.name ?? "Supplier"}
        status={data.status}
        onSettled={() => void refetch()}
      />

      {/* Transaction Journal Modal (Ctrl+J) */}
      <TransactionJournalModal
        isOpen={journalOpen}
        onClose={() => setJournalOpen(false)}
        type="BILL"
        id={data.id}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {/* Entity History Drawer (Alt+H) */}
      <EntityHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entityType="Bill"
        entityId={data.id}
        entityNumber={data.billNo}
        onOpenJournalAtRevision={(rev) => setJournalOpen(true)}
      />
    </div>
  );
};
