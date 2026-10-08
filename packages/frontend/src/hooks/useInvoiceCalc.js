import { useMemo } from "react";
const toNumber = (value) => {
    if (value === null || value === undefined || value === "")
        return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};
export const useInvoiceCalc = (lines) => useMemo(() => {
    const safeLines = Array.isArray(lines) ? lines : [];
    const lineTotals = safeLines.map((line) => {
        const netWt = toNumber(line.netWt);
        const ratePerGram = toNumber(line.ratePerGram);
        const makingRate = toNumber(line.makingRate);
        const discountPct = toNumber(line.discountPct);
        const gstPct = toNumber(line.gstPct);
        const metalAmount = netWt * ratePerGram;
        const makingAmount = line.makingType === "PER_GRAM"
            ? netWt * makingRate
            : line.makingType === "PERCENT"
                ? (metalAmount * makingRate) / 100
                : makingRate;
        const amount = metalAmount + makingAmount;
        const discountAmount = (amount * discountPct) / 100;
        const taxable = amount - discountAmount;
        const tax = (taxable * gstPct) / 100;
        const total = taxable + tax;
        return {
            amount,
            discountAmount,
            taxable,
            tax,
            total,
        };
    });
    const subTotal = lineTotals.reduce((sum, line) => sum + line.amount, 0);
    const discount = lineTotals.reduce((sum, line) => sum + line.discountAmount, 0);
    const taxableAmount = lineTotals.reduce((sum, line) => sum + line.taxable, 0);
    const taxTotal = lineTotals.reduce((sum, line) => sum + line.tax, 0);
    const grandTotal = taxableAmount + taxTotal;
    return { subTotal, discount, taxableAmount, taxTotal, grandTotal, lineTotals };
}, [lines]);
