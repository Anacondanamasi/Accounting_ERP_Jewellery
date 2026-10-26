import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Printer, X, Download } from "lucide-react";
import { invoiceService } from "@/services/invoiceService";
import { GstTaxInvoicePaper } from "@/components/invoices/GstTaxInvoicePaper";

export const InvoicePrintPage = () => {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const autoprint = searchParams.get("autoprint") === "1" || searchParams.get("autoprint") === "true";

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-print", id],
    queryFn: () => invoiceService.getById(Number(id)),
  });

  useEffect(() => {
    if (data?.invoiceNo) {
      document.title = `${data.invoiceNo}`;
    }
  }, [data]);

  useEffect(() => {
    if (autoprint && data) {
      const timer = window.setTimeout(() => {
        window.print();
      }, 350);
      return () => window.clearTimeout(timer);
    }
  }, [autoprint, data]);

  if (isLoading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-white font-mono text-xs text-neutral-600">
        Loading GST invoice…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-0 sm:p-4 print:p-0 print:bg-white print:min-h-0">
      {/* ── Screen-only Action Toolbar (Hidden in Print / PDF) ── */}
      <div className="print:hidden mx-auto mb-4 flex max-w-[210mm] items-center justify-between rounded-lg border border-neutral-300 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-neutral-800">{data.invoiceNo}</span>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs text-neutral-600">{data.customer?.name || data.customerName || "Customer"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded bg-amber-600 hover:bg-amber-700 px-3.5 text-xs font-bold text-white shadow-sm transition-all"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex h-8 items-center gap-1 rounded border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-neutral-500" />
            Close
          </button>
        </div>
      </div>

      {/* ── Indian GST Tax Invoice Paper ── */}
      <div className="mx-auto max-w-[210mm] bg-white shadow-md print:shadow-none print:max-w-none print:w-full">
        <GstTaxInvoicePaper invoice={data} printId="gst-tax-invoice" />
      </div>
    </div>
  );
};
