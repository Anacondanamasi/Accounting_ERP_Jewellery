import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { invoiceService } from "@/services/invoiceService";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LinkedSettlementsPanel } from "@/components/shared/LinkedSettlementsPanel";
import { format } from "date-fns";

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const InvoiceViewPage = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const openInvoicePdf = async (invoiceId: number, print = false) => {
    const blob = await invoiceService.getPdf(invoiceId);
    const url = URL.createObjectURL(blob);
    if (!print) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${data?.invoiceNo ?? `invoice-${invoiceId}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }
    const opened = window.open(url, "_blank");
    if (opened) {
      opened.addEventListener("load", () => {
        opened.print();
      });
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      URL.revokeObjectURL(url);
      throw new Error("Popup blocked");
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoiceService.getById(id),
  });

  const postMutation = useMutation({
    mutationFn: () => invoiceService.post(id),
    onSuccess: () => {
      toast.success("Invoice posted");
      void refetch();
    },
    onError: () => toast.error("Unable to post invoice"),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => invoiceService.duplicate(id),
    onSuccess: (record) => {
      toast.success("Invoice duplicated");
      navigate(`/invoices/${record.id}/edit`);
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => invoiceService.void(id),
    onSuccess: () => {
      toast.success("Invoice voided");
      void refetch();
    },
  });

  if (isLoading || !data) {
    return <div className="rounded-card bg-card p-6 shadow-card">Loading invoice...</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={data.invoiceNo}
        subtitle={`Customer: ${data.customerName}`}
        actions={
          <>
            <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => navigate(`/invoices/${id}/edit`)} type="button">
              Edit
            </button>
            <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => duplicateMutation.mutate()} type="button">
              Duplicate
            </button>
            <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => postMutation.mutate()} type="button">
              Post
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm"
              onClick={async () => {
                try {
                  await openInvoicePdf(id);
                } catch {
                  toast.error("Unable to download PDF");
                }
              }}
              type="button"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm"
              onClick={async () => {
                try {
                  await openInvoicePdf(id, true);
                } catch {
                  toast.error("Unable to print PDF");
                }
              }}
              type="button"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => setPaymentOpen(true)} type="button">
              Record Payment
            </button>
            <button className="h-10 rounded-btn bg-ruby px-4 text-sm text-white" onClick={() => voidMutation.mutate()} type="button">
              Void
            </button>
          </>
        }
      />

      <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <StatusBadge status={data.status} />
          <span className="text-sm text-muted">Due {data.dueDate ? format(new Date(data.dueDate), "dd-MMM-yyyy") : ""}</span>
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
                <td className="px-2 py-2 text-right font-mono">{toNumber(line.gstPct).toFixed(2)}</td>
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
        </div>
      </div>

      {/* ── Linked Settlements ──────────────────────────────────────── */}
      <LinkedSettlementsPanel
        targetType="invoice"
        targetId={data.id}
        grandTotal={data.grandTotal}
        partyId={data.customerId}
        partyName={data.customerName ?? data.customer?.name ?? "Customer"}
        status={data.status}
        onSettled={() => void refetch()}
      />

      <RecordPaymentModal
        balanceDue={data.balanceDue}
        invoiceId={data.id}
        invoiceNo={data.invoiceNo}
        onClose={() => setPaymentOpen(false)}
        onSaved={() => void refetch()}
        open={paymentOpen}
      />
    </div>
  );
};
