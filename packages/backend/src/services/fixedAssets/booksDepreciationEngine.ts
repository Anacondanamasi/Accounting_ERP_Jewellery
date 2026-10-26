/**
 * Books Depreciation Engine (Companies Act 2013, Schedule II & Ind AS 16 / AS 10)
 * Pure, deterministic mathematical calculations for financial statements.
 */

export interface BooksDepreciationInput {
  cost: number;
  salvageValue?: number;
  residualPercentage?: number; // default 5.0%
  usefulLifeYears: number;
  depreciationMethod: "SLM" | "WDV";
  datePutToUse: Date | string;
  disposalDate?: Date | string | null;
  openingBookValue: number;
  periodStartDate: Date | string;
  periodEndDate: Date | string;
}

export interface BooksDepreciationResult {
  openingBookValue: number;
  depreciationAmount: number;
  closingBookValue: number;
  salvageValue: number;
  daysInPeriod: number;
  activeDaysInPeriod: number;
  isFullyDepreciated: boolean;
  effectiveRatePercent: number;
}

/**
 * Determine if a given year is a leap year (366 days).
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get days in year for pro-rata calculation (365 or 366).
 */
export function getDaysInYear(date: Date): number {
  return isLeapYear(date.getFullYear()) ? 366 : 365;
}

/**
 * Difference in calendar days between two dates (inclusive).
 */
export function countDaysInclusive(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utc1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utc2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  if (utc2 < utc1) return 0;
  return Math.floor((utc2 - utc1) / msPerDay) + 1;
}

/**
 * Derive Schedule II WDV rate from useful life and salvage value.
 * Formula: R = 1 - (s / c)^(1 / n)
 */
export function calculateWdvRate(cost: number, salvageValue: number, usefulLifeYears: number): number {
  if (cost <= 0 || usefulLifeYears <= 0) return 0;
  const s = Math.max(0.01, salvageValue);
  const c = Math.max(s, cost);
  const rate = 1 - Math.pow(s / c, 1 / usefulLifeYears);
  return Math.min(0.9999, Math.max(0, rate));
}

/**
 * Calculate Books depreciation for a period (e.g. Month, Quarter, or FY).
 */
export function calculateBooksDepreciation(input: BooksDepreciationInput): BooksDepreciationResult {
  const cost = Math.max(0, input.cost);
  const salvageValue =
    input.salvageValue !== undefined
      ? input.salvageValue
      : Math.round(((cost * (input.residualPercentage ?? 5.0)) / 100) * 100) / 100;

  const openingBookValue = Math.max(0, input.openingBookValue);

  // If already at or below salvage value, zero depreciation
  if (openingBookValue <= salvageValue || cost <= 0 || input.usefulLifeYears <= 0) {
    return {
      openingBookValue,
      depreciationAmount: 0,
      closingBookValue: openingBookValue,
      salvageValue,
      daysInPeriod: 0,
      activeDaysInPeriod: 0,
      isFullyDepreciated: true,
      effectiveRatePercent: 0,
    };
  }

  const periodStart = new Date(input.periodStartDate);
  const periodEnd = new Date(input.periodEndDate);
  const putToUse = new Date(input.datePutToUse);
  const disposal = input.disposalDate ? new Date(input.disposalDate) : null;

  const totalPeriodDays = countDaysInclusive(periodStart, periodEnd);

  // Active window in this period
  const activeStart = putToUse > periodStart ? putToUse : periodStart;
  const activeEnd = disposal && disposal < periodEnd ? disposal : periodEnd;

  if (activeEnd < activeStart) {
    return {
      openingBookValue,
      depreciationAmount: 0,
      closingBookValue: openingBookValue,
      salvageValue,
      daysInPeriod: totalPeriodDays,
      activeDaysInPeriod: 0,
      isFullyDepreciated: false,
      effectiveRatePercent: 0,
    };
  }

  const activeDays = countDaysInclusive(activeStart, activeEnd);
  const daysInYear = getDaysInYear(activeStart);

  let rawDepreciation = 0;
  let effectiveRate = 0;

  if (input.depreciationMethod === "SLM") {
    // Schedule II SLM: (Cost - Salvage) / UsefulLifeYears
    const depreciableBase = Math.max(0, cost - salvageValue);
    const annualDepreciation = depreciableBase / input.usefulLifeYears;
    const dailyDepreciation = annualDepreciation / daysInYear;
    rawDepreciation = dailyDepreciation * activeDays;
    effectiveRate = (annualDepreciation / cost) * 100;
  } else {
    // Schedule II WDV
    const wdvRate = calculateWdvRate(cost, salvageValue, input.usefulLifeYears);
    effectiveRate = wdvRate * 100;
    // Periodic compound continuous or standard pro-rata days
    rawDepreciation = openingBookValue * wdvRate * (activeDays / daysInYear);
  }

  // Max allowable depreciation so that book value doesn't breach salvage value floor
  const maxAllowable = Math.max(0, openingBookValue - salvageValue);
  let finalDepreciation = Math.min(rawDepreciation, maxAllowable);

  // Round to 2 decimal places (paise)
  finalDepreciation = Math.round(finalDepreciation * 100) / 100;

  // Final period trim: if remaining book value is within 50 paise of salvage value, write down to salvage
  let closingBookValue = Math.round((openingBookValue - finalDepreciation) * 100) / 100;
  if (Math.abs(closingBookValue - salvageValue) <= 0.5) {
    finalDepreciation = Math.round((openingBookValue - salvageValue) * 100) / 100;
    closingBookValue = salvageValue;
  }

  const isFullyDepreciated = closingBookValue <= salvageValue + 0.001;

  return {
    openingBookValue,
    depreciationAmount: finalDepreciation,
    closingBookValue,
    salvageValue,
    daysInPeriod: totalPeriodDays,
    activeDaysInPeriod: activeDays,
    isFullyDepreciated,
    effectiveRatePercent: Math.round(effectiveRate * 100) / 100,
  };
}
