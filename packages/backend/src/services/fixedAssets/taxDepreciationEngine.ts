/**
 * Income-tax Depreciation Engine (Income Tax Act 1961, Section 32 & Appendix I)
 * Block of Assets WDV Schedule, Half-Rate rule (<180 days), STCG / STCL u/s 50.
 *
 * NOTE: Tax depreciation is strictly a memo schedule for ITR & Tax Audit (Form 3CD).
 * It is NEVER posted to the General Ledger.
 */

export interface TaxBlockCalculationInput {
  blockName: string;
  statutoryRatePercent: number; // e.g. 15.0 for Plant & Machinery, 40.0 for Computers
  openingWdv: number;
  additionsMoreThan180Days: number; // Put to use >= 180 days in the FY (eligible for 100% of rate)
  additionsLessThan180Days: number; // Put to use < 180 days in the FY (eligible for 50% of rate)
  deductionsOrRealizations: number; // Monies payable / realization on sale/discard of assets
  hasAssetsRemainingInBlock: boolean; // Whether at least 1 asset remains in the block at year-end
}

export interface TaxBlockCalculationResult {
  openingWdv: number;
  totalAdditions: number;
  additionsMoreThan180Days: number;
  additionsLessThan180Days: number;
  deductionsOrRealizations: number;
  adjustedBaseForDepreciation: number;
  depreciationAllowed: number;
  depreciationOnBase: number;
  depreciationOnAdditionsLessThan180: number;
  closingWdv: number;
  capitalGainOrLoss: number; // Positive = STCG u/s 50, Negative = STCL u/s 50, 0 = Normal
  isExtinguished: boolean;
  remarks: string[];
}

/**
 * Determine if an asset put to use date is eligible for full rate (>= 180 days)
 * or half rate (< 180 days) in an Indian Financial Year (April 1 to March 31).
 * Specifically: For FY ending March 31, if put to use on or after October 3 (or Oct 4 in leap year),
 * days until March 31 is < 180 days.
 */
export function isPutToUseLessThan180Days(datePutToUse: Date | string, fyEndYear: number): boolean {
  const pDate = new Date(datePutToUse);
  const fyEnd = new Date(fyEndYear, 2, 31); // March 31 of fyEndYear
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUsedInFy = Math.floor((fyEnd.getTime() - pDate.getTime()) / msPerDay) + 1;
  return daysUsedInFy < 180;
}

/**
 * Compute Tax Block Depreciation as per Section 32 & Section 50 of Income-tax Act.
 */
export function calculateTaxBlockDepreciation(input: TaxBlockCalculationInput): TaxBlockCalculationResult {
  const rate = input.statutoryRatePercent / 100;
  const openingWdv = Math.max(0, input.openingWdv);
  const addMore180 = Math.max(0, input.additionsMoreThan180Days);
  const addLess180 = Math.max(0, input.additionsLessThan180Days);
  const deductions = Math.max(0, input.deductionsOrRealizations);
  const totalAdditions = addMore180 + addLess180;

  const remarks: string[] = [];

  // Step 1: Base for normal rate = Opening WDV + Additions (>=180 days) - Deductions
  const preliminaryBase = openingWdv + addMore180 - deductions;

  // Case A: Realizations exceed (Opening WDV + Additions >= 180 days)
  if (preliminaryBase < 0) {
    const excess = Math.abs(preliminaryBase);
    // If excess covers additions < 180 days too
    if (excess >= addLess180) {
      const stcg = excess - addLess180;
      remarks.push("Block value reduced to zero; realization exceeds total block. STCG u/s 50(1) applies.");
      return {
        openingWdv,
        totalAdditions,
        additionsMoreThan180Days: addMore180,
        additionsLessThan180Days: addLess180,
        deductionsOrRealizations: deductions,
        adjustedBaseForDepreciation: 0,
        depreciationAllowed: 0,
        depreciationOnBase: 0,
        depreciationOnAdditionsLessThan180: 0,
        closingWdv: 0,
        capitalGainOrLoss: Math.round(stcg * 100) / 100, // Positive indicates STCG
        isExtinguished: !input.hasAssetsRemainingInBlock,
        remarks,
      };
    } else {
      // Net base for additions < 180 days is reduced by remainder
      const netAddLess180 = addLess180 - excess;
      const depLess180 = Math.round(netAddLess180 * (rate / 2) * 100) / 100;
      const closingWdv = Math.round((netAddLess180 - depLess180) * 100) / 100;
      remarks.push("Additions < 180 days partially absorbed excess realizations.");
      return {
        openingWdv,
        totalAdditions,
        additionsMoreThan180Days: addMore180,
        additionsLessThan180Days: addLess180,
        deductionsOrRealizations: deductions,
        adjustedBaseForDepreciation: netAddLess180,
        depreciationAllowed: depLess180,
        depreciationOnBase: 0,
        depreciationOnAdditionsLessThan180: depLess180,
        closingWdv,
        capitalGainOrLoss: 0,
        isExtinguished: !input.hasAssetsRemainingInBlock,
        remarks,
      };
    }
  }

  // Case B: Block is completely empty (no assets physically exist at year end)
  if (!input.hasAssetsRemainingInBlock) {
    const remainingWdv = preliminaryBase + addLess180;
    if (remainingWdv > 0) {
      remarks.push("All assets in block ceased/sold. Short-Term Capital Loss u/s 50(2) allowed. No depreciation.");
      return {
        openingWdv,
        totalAdditions,
        additionsMoreThan180Days: addMore180,
        additionsLessThan180Days: addLess180,
        deductionsOrRealizations: deductions,
        adjustedBaseForDepreciation: 0,
        depreciationAllowed: 0,
        depreciationOnBase: 0,
        depreciationOnAdditionsLessThan180: 0,
        closingWdv: 0,
        capitalGainOrLoss: -Math.round(remainingWdv * 100) / 100, // Negative indicates STCL
        isExtinguished: true,
        remarks,
      };
    }
  }

  // Case C: Standard Normal Operation
  const depOnBase = Math.round(preliminaryBase * rate * 100) / 100;
  const depOnAddLess180 = Math.round(addLess180 * (rate / 2) * 100) / 100;
  const totalDepreciation = Math.round((depOnBase + depOnAddLess180) * 100) / 100;

  const totalAdjustedBase = preliminaryBase + addLess180;
  const closingWdv = Math.max(0, Math.round((totalAdjustedBase - totalDepreciation) * 100) / 100);

  if (addLess180 > 0) {
    remarks.push(`Half-rate (50% of ${input.statutoryRatePercent}%) applied on additions put to use < 180 days.`);
  }

  return {
    openingWdv,
    totalAdditions,
    additionsMoreThan180Days: addMore180,
    additionsLessThan180Days: addLess180,
    deductionsOrRealizations: deductions,
    adjustedBaseForDepreciation: totalAdjustedBase,
    depreciationAllowed: totalDepreciation,
    depreciationOnBase: depOnBase,
    depreciationOnAdditionsLessThan180: depOnAddLess180,
    closingWdv,
    capitalGainOrLoss: 0,
    isExtinguished: false,
    remarks,
  };
}
