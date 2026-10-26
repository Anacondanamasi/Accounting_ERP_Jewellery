export interface TaxCalculationLineInput {
  rate: number;          // Total GST rate percentage (e.g. 3, 5, 12, 18, 28)
  cessRate?: number;      // Cess percentage (e.g. 12)
  cessAmount?: number;    // Specific cess fixed amount
  amount: number;         // Base amount before discount
  discountPct?: number;   // Discount percentage
  discountAmount?: number;// Or fixed discount
  isTaxInclusive?: boolean;
  isRcm?: boolean;
  itcEligibility?: "ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5";
}

export interface ComputedTaxLine {
  baseAmount: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  taxAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalTax: number;
  lineTotal: number;
  isRcm: boolean;
  itcEligibility: "ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5";
}

export interface DocumentTaxSummary {
  lines: ComputedTaxLine[];
  subTotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  rateBreakup: Array<{
    rate: number;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    taxTotal: number;
  }>;
}

export const round2 = (val: number): number => {
  const n = Number.isFinite(val) ? val : 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export const computeLineTax = (
  line: TaxCalculationLineInput,
  isInterstate: boolean,
  isZeroRated = false
): ComputedTaxLine => {
  const baseAmount = round2(line.amount);
  const discountPct = Number(line.discountPct ?? 0);
  let discount = round2(line.discountAmount ?? (baseAmount * discountPct) / 100);
  if (discount > baseAmount) discount = baseAmount;

  const netBeforeTax = round2(baseAmount - discount);
  const totalRate = isZeroRated ? 0 : Number(line.rate ?? 0);
  const cessRate = isZeroRated ? 0 : Number(line.cessRate ?? 0);

  let taxableAmount = 0;
  let taxAmount = 0;
  let cessAmount = round2(Number(line.cessAmount ?? 0));

  if (line.isTaxInclusive) {
    // Net amount already includes GST: taxable = net / (1 + totalRate/100)
    const factor = 1 + (totalRate + cessRate) / 100;
    taxableAmount = round2(netBeforeTax / factor);
    taxAmount = round2(taxableAmount * (totalRate / 100));
    if (cessRate > 0) {
      cessAmount = round2(taxableAmount * (cessRate / 100));
    }
  } else {
    taxableAmount = netBeforeTax;
    taxAmount = round2(taxableAmount * (totalRate / 100));
    if (cessRate > 0) {
      cessAmount = round2(taxableAmount * (cessRate / 100));
    }
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterstate || isZeroRated) {
    igstRate = totalRate;
    igstAmount = taxAmount;
  } else {
    cgstRate = round2(totalRate / 2);
    sgstRate = round2(totalRate / 2);
    cgstAmount = round2(taxAmount / 2);
    // SGST absorbs any odd half-cent rounding
    sgstAmount = round2(taxAmount - cgstAmount);
  }

  const totalTax = round2(taxAmount + cessAmount);
  const lineTotal = round2(taxableAmount + totalTax);

  return {
    baseAmount,
    discount,
    taxableAmount,
    gstRate: totalRate,
    taxAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    cessRate,
    cessAmount,
    totalTax,
    lineTotal,
    isRcm: Boolean(line.isRcm),
    itcEligibility: line.itcEligibility ?? "ELIGIBLE",
  };
};

export const computeDocumentTax = (
  lines: TaxCalculationLineInput[],
  isInterstate: boolean,
  isZeroRated = false
): DocumentTaxSummary => {
  const computedLines = lines.map((l) => computeLineTax(l, isInterstate, isZeroRated));

  const subTotal = round2(computedLines.reduce((sum, l) => sum + l.baseAmount, 0));
  const totalDiscount = round2(computedLines.reduce((sum, l) => sum + l.discount, 0));
  const taxableAmount = round2(computedLines.reduce((sum, l) => sum + l.taxableAmount, 0));
  const cgst = round2(computedLines.reduce((sum, l) => sum + l.cgstAmount, 0));
  const sgst = round2(computedLines.reduce((sum, l) => sum + l.sgstAmount, 0));
  const igst = round2(computedLines.reduce((sum, l) => sum + l.igstAmount, 0));
  const cess = round2(computedLines.reduce((sum, l) => sum + l.cessAmount, 0));
  const taxTotal = round2(cgst + sgst + igst + cess);

  const rawGrandTotal = round2(taxableAmount + taxTotal);
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = round2(roundedGrandTotal - rawGrandTotal);
  const grandTotal = roundedGrandTotal;

  // Rate-wise breakup
  const rateMap = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number; cess: number; taxTotal: number }>();
  for (const l of computedLines) {
    const existing = rateMap.get(l.gstRate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, taxTotal: 0 };
    existing.taxable = round2(existing.taxable + l.taxableAmount);
    existing.cgst = round2(existing.cgst + l.cgstAmount);
    existing.sgst = round2(existing.sgst + l.sgstAmount);
    existing.igst = round2(existing.igst + l.igstAmount);
    existing.cess = round2(existing.cess + l.cessAmount);
    existing.taxTotal = round2(existing.taxTotal + l.totalTax);
    rateMap.set(l.gstRate, existing);
  }

  const rateBreakup = Array.from(rateMap.entries())
    .map(([rate, vals]) => ({ rate, ...vals }))
    .sort((a, b) => a.rate - b.rate);

  return {
    lines: computedLines,
    subTotal,
    totalDiscount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    cess,
    taxTotal,
    roundOff,
    grandTotal,
    rateBreakup,
  };
};
