import { invoiceService } from "@/services/invoiceService";
import { toast } from "sonner";

/**
 * Directly downloads the official GST Tax Invoice PDF from backend
 * without opening a print dialog or new tab.
 */
export const downloadInvoicePdf = async (id: number, invoiceNo?: string): Promise<boolean> => {
  const toastId = `pdf-dl-${id}`;
  try {
    toast.loading("Generating and downloading PDF...", { id: toastId });
    const blob = await invoiceService.getPdf(id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceNo || `invoice-${id}`}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("PDF downloaded successfully", { id: toastId });
    return true;
  } catch (err: any) {
    console.error("PDF download failed:", err);
    toast.error("Failed to download PDF. Please try again.", { id: toastId });
    return false;
  }
};
