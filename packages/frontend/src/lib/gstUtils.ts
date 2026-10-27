import type { PurchaseBillFor2B } from "@/services/taxService";

export const MONTHS = [
  { id: 1, label: "January" },
  { id: 2, label: "February" },
  { id: 3, label: "March" },
  { id: 4, label: "April" },
  { id: 5, label: "May" },
  { id: 6, label: "June" },
  { id: 7, label: "July" },
  { id: 8, label: "August" },
  { id: 9, label: "September" },
  { id: 10, label: "October" },
  { id: 11, label: "November" },
  { id: 12, label: "December" },
];

export const QUARTERS = [
  { id: "Q1", label: "Q1 (Apr–Jun)", months: [4, 5, 6] },
  { id: "Q2", label: "Q2 (Jul–Sep)", months: [7, 8, 9] },
  { id: "Q3", label: "Q3 (Oct–Dec)", months: [10, 11, 12] },
  { id: "Q4", label: "Q4 (Jan–Mar)", months: [1, 2, 3] },
];

export const FINANCIAL_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
  "2023-24",
];

export const normInv = (s: string | null | undefined): string => {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
};

export const toCsvLine = (fields: (string | number | boolean | null | undefined)[]): string => {
  return fields
    .map((v) => {
      if (v === null || v === undefined) return '""';
      let str = String(v).replace(/"/g, '""');
      // Prevent formula injection
      if (/^[=+@-]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    })
    .join(",");
};

export const downloadCSV = (filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) => {
  const lines = [toCsvLine(headers)];
  rows.forEach((row) => lines.push(toCsvLine(row)));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadJSON = (filename: string, data: any) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export interface ReconciliationRow {
  status: "matched" | "amount_mismatch" | "book_only" | "twob_only";
  supplier: string;
  ctin: string;
  invoiceNumber: string;
  date: string;
  twoBVal: number;
  twoBTaxable: number;
  twoBIgst: number;
  twoBCgst: number;
  twoBSgst: number;
  bookVal: number;
  bookTaxable: number;
  bookIgst: number;
  bookCgst: number;
  bookSgst: number;
  itcAvailable: boolean;
  valDiff: number;
  taxableDiff: number;
}

export const buildGstr2bReconciliation = (
  twoBData: any,
  purchases: PurchaseBillFor2B[],
  periodPurchases: PurchaseBillFor2B[] = purchases
): ReconciliationRow[] => {
  if (!twoBData) return [];
  const twoBSuppliers: any[] = twoBData.docdata?.b2b || twoBData.b2b || [];
  const rows: ReconciliationRow[] = [];

  const bookByKey = new Map<string, PurchaseBillFor2B>();
  (purchases || []).forEach((p) => {
    const key = `${(p.supplierGstin || "").toUpperCase()}::${normInv(p.billNo)}`;
    bookByKey.set(key, p);
  });

  const matchedBookKeys = new Set<string>();

  twoBSuppliers.forEach((sup) => {
    const ctin = (sup.ctin || "").toUpperCase();
    const supName = sup.trdnm || sup.cname || "";
    (sup.inv || []).forEach((inv: any) => {
      const key = `${ctin}::${normInv(inv.inum)}`;
      const book = bookByKey.get(key);
      const twoBVal = Number(inv.val || 0);
      const twoBTaxable = (inv.items || []).reduce((s: number, it: any) => s + Number(it.txval || 0), 0);
      const twoBIgst = (inv.items || []).reduce((s: number, it: any) => s + Number(it.igst || 0), 0);
      const twoBCgst = (inv.items || []).reduce((s: number, it: any) => s + Number(it.cgst || 0), 0);
      const twoBSgst = (inv.items || []).reduce((s: number, it: any) => s + Number(it.sgst || 0), 0);

      if (!book) {
        rows.push({
          status: "twob_only",
          supplier: supName,
          ctin,
          invoiceNumber: inv.inum,
          date: inv.dt || "",
          twoBVal,
          twoBTaxable,
          twoBIgst,
          twoBCgst,
          twoBSgst,
          bookVal: 0,
          bookTaxable: 0,
          bookIgst: 0,
          bookCgst: 0,
          bookSgst: 0,
          itcAvailable: inv.itcavl !== "N",
          valDiff: twoBVal,
          taxableDiff: twoBTaxable,
        });
        return;
      }

      matchedBookKeys.add(key);

      const valDiff = Math.abs(twoBVal - book.grandTotal);
      const taxableDiff = Math.abs(twoBTaxable - book.taxableAmount);
      const status: "matched" | "amount_mismatch" =
        valDiff <= 1.05 && taxableDiff <= 1.05 ? "matched" : "amount_mismatch";

      rows.push({
        status,
        supplier: supName || book.supplierName,
        ctin,
        invoiceNumber: inv.inum,
        date: inv.dt || book.date,
        twoBVal,
        twoBTaxable,
        twoBIgst,
        twoBCgst,
        twoBSgst,
        bookVal: book.grandTotal,
        bookTaxable: book.taxableAmount,
        bookIgst: book.igst,
        bookCgst: book.cgst,
        bookSgst: book.sgst,
        itcAvailable: inv.itcavl !== "N",
        valDiff: Math.round(valDiff * 100) / 100,
        taxableDiff: Math.round(taxableDiff * 100) / 100,
      });
    });
  });

  // Purchases recorded in books but not present in GSTR-2B
  (periodPurchases || []).forEach((p) => {
    const key = `${(p.supplierGstin || "").toUpperCase()}::${normInv(p.billNo)}`;
    if (matchedBookKeys.has(key)) return;
    rows.push({
      status: "book_only",
      supplier: p.supplierName,
      ctin: (p.supplierGstin || "").toUpperCase(),
      invoiceNumber: p.billNo,
      date: p.date,
      twoBVal: 0,
      twoBTaxable: 0,
      twoBIgst: 0,
      twoBCgst: 0,
      twoBSgst: 0,
      bookVal: p.grandTotal,
      bookTaxable: p.taxableAmount,
      bookIgst: p.igst,
      bookCgst: p.cgst,
      bookSgst: p.sgst,
      itcAvailable: false,
      valDiff: p.grandTotal,
      taxableDiff: p.taxableAmount,
    });
  });

  return rows;
};

export interface FilingRecord {
  gstr1Filed?: boolean;
  gstr1Arn?: string;
  gstr1Date?: string;
  gstr3bFiled?: boolean;
  gstr3bArn?: string;
  gstr3bDate?: string;
}

const getGstStorageKey = (companyId?: string | null) => `jewel_gst_filings:${companyId || "default"}`;

export const readFilingStatus = (periodKey: string, companyId?: string | null): FilingRecord => {
  try {
    const all = JSON.parse(localStorage.getItem(getGstStorageKey(companyId)) || "{}");
    return all[periodKey] || {};
  } catch {
    return {};
  }
};

export const saveFilingStatus = (periodKey: string, update: Partial<FilingRecord>, companyId?: string | null) => {
  try {
    const all = JSON.parse(localStorage.getItem(getGstStorageKey(companyId)) || "{}");
    all[periodKey] = { ...all[periodKey], ...update };
    localStorage.setItem(getGstStorageKey(companyId), JSON.stringify(all));
  } catch {}
};

export const GSTR1_STEPS = [
  {
    step: 1,
    title: "Login to GST Portal",
    details: "Open gst.gov.in in your browser. Click 'Login' at top-right → Enter Username & Password → Enter Captcha / 2FA OTP. Go to Returns → Returns Dashboard.",
  },
  {
    step: 2,
    title: "Select Financial Year & Return Period",
    details: "Select the Financial Year and the Month/Quarter corresponding to this period. Click 'SEARCH'. On the GSTR-1 tile, choose 'PREPARE OFFLINE' to upload the JSON exported from this software, or 'PREPARE ONLINE' for manual entry.",
  },
  {
    step: 3,
    title: "Table 4A — B2B Invoices",
    details: "Click Table 4A (B2B Invoices). For each B2B invoice, enter receiver GSTIN, invoice number, invoice date, place of supply, taxable value, and tax rate. Or simply upload our generated GSTR-1 JSON file to fill all invoices automatically.",
  },
  {
    step: 4,
    title: "Table 5 & Table 7 — B2C Large & Small Supplies",
    details: "Table 5 covers inter-state supplies to unregistered customers exceeding ₹1,00,000. Table 7 covers all remaining intra-state and small inter-state B2C sales aggregated by state code and GST rate.",
  },
  {
    step: 5,
    title: "Table 9B & Table 12 — Credit/Debit Notes & HSN Summary",
    details: "Enter Credit/Debit Notes in Table 9B. In Table 12, enter the HSN-wise summary (HSN 7113 for jewellery, 7108 for gold, 7106 for silver, 9988 for job work) with total grams, taxable value, and GST amounts.",
  },
  {
    step: 6,
    title: "Table 13 — Documents Issued",
    details: "Enter the serial number range for invoices (From serial to To serial, total count, cancelled count) and credit/debit notes.",
  },
  {
    step: 7,
    title: "Generate Summary, Submit & File",
    details: "Click 'GENERATE SUMMARY', wait 1-2 minutes and refresh. Preview the draft summary. Click 'SUBMIT' and then proceed to FILE with DSC (Digital Signature Certificate) or EVC (Aadhaar OTP). Note down the ARN (Acknowledgement Reference Number).",
  },
];

export const GSTR3B_STEPS = [
  {
    step: 1,
    title: "Navigate to GSTR-3B",
    details: "Login to gst.gov.in → Returns Dashboard → Select FY and Month/Quarter → Click SEARCH → Select 'PREPARE ONLINE' on GSTR-3B tile.",
  },
  {
    step: 2,
    title: "Table 3.1 — Details of Outward Supplies",
    details: "In Table 3.1(a), enter total taxable value and tax liability (IGST, CGST, SGST) as computed in our GSTR-3B tab. In Table 3.1(d), enter inward supplies liable to reverse charge (if applicable).",
  },
  {
    step: 3,
    title: "Table 4 — Eligible ITC (Input Tax Credit)",
    details: "Check auto-populated ITC from GSTR-2B. In Table 4(A)(5) 'All other ITC', ensure the amount matches your verified purchase bills (reconciled using our GSTR-2B Reconciliation tool). Enter any ITC reversals in 4(B) if applicable.",
  },
  {
    step: 4,
    title: "Table 6.1 — Payment of Tax (ITC Set-Off & Cash)",
    details: "Click 'PROCEED TO PAYMENT'. The GST portal automatically sets off ITC according to Section 49 / Rule 88A. Verify that the cash payment amounts (CGST, SGST, IGST) match our computation. If electronic cash ledger balance is insufficient, click 'CREATE CHALLAN' to pay via Net Banking/NEFT/RTGS.",
  },
  {
    step: 5,
    title: "Offset Liability & File Return",
    details: "After challan payment, click 'MAKE PAYMENT / POST CREDIT TO LEDGER'. Once liability is zeroed out, click 'PROCEED TO FILE'. Authenticate via EVC OTP or DSC. Save the generated ARN.",
  },
];
