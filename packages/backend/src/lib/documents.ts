type JewelleryLine = {
  netWt: number;
  makingType: string;
  makingRate: number;
  ratePerGram: number;
  discountPct: number;
  gstPct: number;
};

export type ComputedLine<T extends JewelleryLine> = T & {
  amount: number;
  makingAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
};

export const roundMoney = (value: number) => Number((Number.isFinite(value) ? value : 0).toFixed(2));
export const roundWeight = (value: number) => Number((Number.isFinite(value) ? value : 0).toFixed(3));

export const computeJewelleryLine = <T extends JewelleryLine>(line: T): ComputedLine<T> => {
  const metalAmount = line.netWt * line.ratePerGram;
  const makingAmount =
    line.makingType === "PER_GRAM"
      ? line.netWt * line.makingRate
      : line.makingType === "PERCENT"
        ? (metalAmount * line.makingRate) / 100
        : line.makingRate;
  const amount = metalAmount + makingAmount;
  const discountAmount = (amount * line.discountPct) / 100;
  const taxableAmount = amount - discountAmount;
  const taxAmount = (taxableAmount * line.gstPct) / 100;
  return {
    ...line,
    amount: roundMoney(amount),
    makingAmount: roundMoney(makingAmount),
    taxableAmount: roundMoney(taxableAmount),
    taxAmount: roundMoney(taxAmount),
    total: roundMoney(taxableAmount + taxAmount),
  };
};

export const computeJewelleryTotals = <T extends JewelleryLine>(lines: T[]) => {
  const computedLines = lines.map(computeJewelleryLine);
  const subTotal = roundMoney(computedLines.reduce((sum, line) => sum + line.amount, 0));
  const discount = roundMoney(
    computedLines.reduce((sum, line) => sum + (line.amount - line.taxableAmount), 0),
  );
  const taxableAmount = roundMoney(computedLines.reduce((sum, line) => sum + line.taxableAmount, 0));
  const taxTotal = roundMoney(computedLines.reduce((sum, line) => sum + line.taxAmount, 0));
  const grandTotal = roundMoney(taxableAmount + taxTotal);
  return { computedLines, subTotal, discount, taxableAmount, taxTotal, grandTotal };
};

export const splitGst = (taxTotal: number, isInterstate = false) => ({
  cgst: isInterstate ? 0 : roundMoney(taxTotal / 2),
  sgst: isInterstate ? 0 : roundMoney(taxTotal / 2),
  igst: isInterstate ? roundMoney(taxTotal) : 0,
});

export const makeDocumentNumber = (prefix: string) => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}-${String(now.getTime()).slice(-5)}`;
};
