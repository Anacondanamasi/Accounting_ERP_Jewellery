import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Download,
  Printer,
  ArrowLeft,
  Copy,
  CreditCard,
  FileEdit,
  ShieldAlert,
  CheckCircle2,
  FileText,
  History,
} from "lucide-react";
import { invoiceService } from "@/services/invoiceService";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LinkedSettlementsPanel } from "@/components/shared/LinkedSettlementsPanel";
import { GstTaxInvoicePaper } from "@/components/invoices/GstTaxInvoicePaper";
import { downloadElementAsPdf } from "@/lib/pdfExport";
import { TransactionJournalModal } from "@/components/shared/TransactionJournalModal";
import { EntityHistoryDrawer } from "@/components/shared/EntityHistoryDrawer";

export const InvoiceViewPage = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoiceService.getById(Number(id)),
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
    mutationFn: () => invoiceService.post(Number(id)),
    onSuccess: () => {
      toast.success("Invoice posted successfully");
      void refetch();
    },
    onError: () => toast.error("Unable to post invoice"),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => invoiceService.duplicate(Number(id)),
    onSuccess: (record) => {
      toast.success("Invoice duplicated successfully");
      navigate(`/invoices/${record.id}/edit`);
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => invoiceService.void(Number(id)),
    onSuccess: () => {
      toast.success("Invoice voided");
      void refetch();
    },
  });

  const handlePrint = () => {
    window.open(`/invoices/${id}/print?autoprint=1`, "_blank", "noopener,noreferrer");
  };

  const handleDownloadPdf = () => {
    window.open(`/invoices/${id}/print?autoprint=1`, "_blank", "noopener,noreferrer");
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-card bg-card p-6 shadow-card">
        <div className="text-center font-mono text-xs text-muted">Loading invoice...</div>
      </div>
    );
  }

  const customer = data.customer || {};

  return (
    <div className="space-y-4 pb-16">
      {/* ── Single Toolbar (Hidden during Print) ───────────────── */}
      <div className="print:hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-card border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/invoices")}
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Invoices
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold font-display text-charcoal">{data.invoiceNo}</h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="text-xs text-muted">
              Customer: <span className="font-semibold text-charcoal">{customer.name || data.customerName || "Customer"}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Transaction Journal (Ctrl+J) */}
          <button
            onClick={() => setJournalOpen(true)}
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-sapphire/30 bg-sapphire/5 px-3 text-xs font-semibold text-sapphire hover:bg-sapphire/15 transition-colors"
            title="View double-entry ledger lines (Ctrl+J)"
          >
            <FileText className="h-3.5 w-3.5" />
            Journal (Ctrl+J)
          </button>

          {/* Audit History (Alt+H) */}
          <button
            onClick={() => setHistoryOpen(true)}
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-colors"
            title="View revision timeline & field diffs (Alt+H)"
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>

          <button
            onClick={handlePrint}
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-gold px-4 text-xs font-bold text-white shadow hover:bg-gold-dark transition-all"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>

          <button
            onClick={handleDownloadPdf}
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-3.5 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-all"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>

          <button
            onClick={() => setPaymentOpen(true)}
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Record Payment
          </button>

          <button
            onClick={() => navigate(`/invoices/${id}/edit`)}
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-colors"
          >
            <FileEdit className="h-3.5 w-3.5" />
            Edit
          </button>

          <button
            onClick={() => duplicateMutation.mutate()}
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>

          {data.status !== "VOID" && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to void this invoice? This will reverse accounting entries.")) {
                  voidMutation.mutate();
                }
              }}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-ruby/30 bg-ruby/5 px-3 text-xs font-semibold text-ruby hover:bg-ruby hover:text-white transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Void
            </button>
          )}
        </div>
      </div>

      {/* ── GST TAX INVOICE PAPER (Output from reference repo) ──── */}
      <div ref={paperRef} className="rounded-card border border-border bg-card p-4 shadow-card print:border-none print:shadow-none print:p-0">
        <GstTaxInvoicePaper invoice={data} />
      </div>

      {/* ── Linked Settlements History (Print Hidden) ───────────── */}
      <div className="print:hidden space-y-6">
        <LinkedSettlementsPanel
          targetType="invoice"
          targetId={data.id}
          grandTotal={data.grandTotal}
          partyId={data.customerId}
          partyName={data.customerName ?? data.customer?.name ?? "Customer"}
          status={data.status}
          onSettled={() => void refetch()}
        />
      </div>

      {/* Modal for recording cash/bank payment */}
      <RecordPaymentModal
        balanceDue={data.balanceDue}
        invoiceId={data.id}
        invoiceNo={data.invoiceNo}
        onClose={() => setPaymentOpen(false)}
        onSaved={() => void refetch()}
        open={paymentOpen}
      />

      {/* Transaction Journal Modal (Ctrl+J) */}
      <TransactionJournalModal
        isOpen={journalOpen}
        onClose={() => setJournalOpen(false)}
        type="INVOICE"
        id={data.id}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {/* Entity History Drawer (Alt+H) */}
      <EntityHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entityType="Invoice"
        entityId={data.id}
        entityNumber={data.invoiceNo}
        onOpenJournalAtRevision={(rev) => {
          setJournalOpen(true);
        }}
      />
    </div>
  );
};
