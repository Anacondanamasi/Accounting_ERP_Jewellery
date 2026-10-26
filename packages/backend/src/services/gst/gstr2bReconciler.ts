export interface BookPurchaseDoc {
  id: number;
  billNo: string;
  date: Date | string;
  supplierGstin: string;
  supplierName: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
}

export interface Gstr2bRecord {
  gstinSupplier: string;
  tradeNameSupplier: string;
  invoiceNumber: string;
  invoiceType: "R" | "DE" | "SEWP" | "SEWOP" | "CBW";
  invoiceDate: string; // YYYY-MM-DD
  invoiceValue: number;
  placeOfSupply: string;
  reverseCharge: "Y" | "N";
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  itcAvailable: "Y" | "N";
  reasonForIneligibility?: string;
}

export type MatchStatus =
  | "EXACT_MATCH"
  | "AMOUNT_MISMATCH"
  | "MISSING_IN_BOOKS"
  | "MISSING_IN_2B";

export interface ReconciliationItem {
  id: string;
  status: MatchStatus;
  supplierGstin: string;
  supplierName: string;
  invoiceNo: string;
  bookBillId?: number;
  bookDate?: string;
  portalDate?: string;
  bookTaxable: number;
  portalTaxable: number;
  diffTaxable: number;
  bookTax: number;
  portalTax: number;
  diffTax: number;
  bookTotal: number;
  portalTotal: number;
  diffTotal: number;
  itcStatus: "CLAIMABLE" | "AT_RISK_RULE_36_4" | "INELIGIBLE_PORTAL";
  actionRequired: string;
}

const normalizeInvoiceNo = (s: string) =>
  String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export const reconcile2BWithBooks = (
  bookBills: BookPurchaseDoc[],
  portal2bRows: Gstr2bRecord[],
  tolerance = 1.0 // ₹1.00 tolerance for rounding differences
): {
  items: ReconciliationItem[];
  summary: {
    totalBooks: number;
    totalPortal: number;
    matchedCount: number;
    amountMismatchCount: number;
    missingInBooksCount: number;
    missingIn2bCount: number;
    totalEligibleItc: number;
    totalAtRiskItc: number;
  };
} => {
  const items: ReconciliationItem[] = [];
  const matchedPortalIndices = new Set<number>();

  for (const book of bookBills) {
    const bookNormNo = normalizeInvoiceNo(book.billNo);
    const bookGstin = String(book.supplierGstin ?? "").trim().toUpperCase();

    // Find best match in 2B
    let foundIndex = -1;
    for (let i = 0; i < portal2bRows.length; i++) {
      if (matchedPortalIndices.has(i)) continue;
      const portal = portal2bRows[i];
      const portalGstin = String(portal.gstinSupplier ?? "").trim().toUpperCase();
      const portalNormNo = normalizeInvoiceNo(portal.invoiceNumber);

      if (bookGstin === portalGstin && bookNormNo === portalNormNo) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      matchedPortalIndices.add(foundIndex);
      const portal = portal2bRows[foundIndex];

      const diffTaxable = Math.abs(book.taxableAmount - portal.taxableValue);
      const portalTax = portal.igst + portal.cgst + portal.sgst + portal.cess;
      const diffTax = Math.abs(book.totalTax - portalTax);
      const diffTotal = Math.abs(book.grandTotal - portal.invoiceValue);

      const isExact = diffTaxable <= tolerance && diffTax <= tolerance && diffTotal <= tolerance;
      const status: MatchStatus = isExact ? "EXACT_MATCH" : "AMOUNT_MISMATCH";

      items.push({
        id: `MATCH-${book.id}-${foundIndex}`,
        status,
        supplierGstin: book.supplierGstin,
        supplierName: portal.tradeNameSupplier || book.supplierName,
        invoiceNo: book.billNo,
        bookBillId: book.id,
        bookDate: String(book.date).slice(0, 10),
        portalDate: portal.invoiceDate,
        bookTaxable: book.taxableAmount,
        portalTaxable: portal.taxableValue,
        diffTaxable,
        bookTax: book.totalTax,
        portalTax,
        diffTax,
        bookTotal: book.grandTotal,
        portalTotal: portal.invoiceValue,
        diffTotal,
        itcStatus: portal.itcAvailable === "Y" ? "CLAIMABLE" : "INELIGIBLE_PORTAL",
        actionRequired: isExact ? "Ready to Claim ITC" : "Verify tax differences with vendor",
      });
    } else {
      // In books, but missing in GSTR-2B
      items.push({
        id: `BOOK-ONLY-${book.id}`,
        status: "MISSING_IN_2B",
        supplierGstin: book.supplierGstin,
        supplierName: book.supplierName,
        invoiceNo: book.billNo,
        bookBillId: book.id,
        bookDate: String(book.date).slice(0, 10),
        bookTaxable: book.taxableAmount,
        portalTaxable: 0,
        diffTaxable: book.taxableAmount,
        bookTax: book.totalTax,
        portalTax: 0,
        diffTax: book.totalTax,
        bookTotal: book.grandTotal,
        portalTotal: 0,
        diffTotal: book.grandTotal,
        itcStatus: "AT_RISK_RULE_36_4",
        actionRequired: "Vendor has not filed GSTR-1. Do not claim until reflected in GSTR-2B.",
      });
    }
  }

  // 2B rows not matched in books
  for (let i = 0; i < portal2bRows.length; i++) {
    if (matchedPortalIndices.has(i)) continue;
    const portal = portal2bRows[i];
    const portalTax = portal.igst + portal.cgst + portal.sgst + portal.cess;

    items.push({
      id: `PORTAL-ONLY-${i}`,
      status: "MISSING_IN_BOOKS",
      supplierGstin: portal.gstinSupplier,
      supplierName: portal.tradeNameSupplier || "Supplier in GSTR-2B",
      invoiceNo: portal.invoiceNumber,
      portalDate: portal.invoiceDate,
      bookTaxable: 0,
      portalTaxable: portal.taxableValue,
      diffTaxable: portal.taxableValue,
      bookTax: 0,
      portalTax,
      diffTax: portalTax,
      bookTotal: 0,
      portalTotal: portal.invoiceValue,
      diffTotal: portal.invoiceValue,
      itcStatus: portal.itcAvailable === "Y" ? "CLAIMABLE" : "INELIGIBLE_PORTAL",
      actionRequired: "Create Purchase Bill in accounting to claim eligible ITC.",
    });
  }

  const summary = {
    totalBooks: bookBills.length,
    totalPortal: portal2bRows.length,
    matchedCount: items.filter((i) => i.status === "EXACT_MATCH").length,
    amountMismatchCount: items.filter((i) => i.status === "AMOUNT_MISMATCH").length,
    missingInBooksCount: items.filter((i) => i.status === "MISSING_IN_BOOKS").length,
    missingIn2bCount: items.filter((i) => i.status === "MISSING_IN_2B").length,
    totalEligibleItc: items
      .filter((i) => i.status === "EXACT_MATCH" && i.itcStatus === "CLAIMABLE")
      .reduce((sum, i) => sum + i.bookTax, 0),
    totalAtRiskItc: items
      .filter((i) => i.status === "MISSING_IN_2B")
      .reduce((sum, i) => sum + i.bookTax, 0),
  };

  return { items, summary };
};
