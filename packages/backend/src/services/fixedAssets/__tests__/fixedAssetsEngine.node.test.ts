import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBooksDepreciation,
  calculateWdvRate,
  countDaysInclusive,
  isLeapYear,
} from "../booksDepreciationEngine";
import {
  calculateTaxBlockDepreciation,
  isPutToUseLessThan180Days,
} from "../taxDepreciationEngine";

describe("Fixed Assets Depreciation Engines", () => {
  describe("Books Depreciation Engine (Schedule II)", () => {
    it("correctly identifies leap years", () => {
      assert.equal(isLeapYear(2024), true);
      assert.equal(isLeapYear(2025), false);
      assert.equal(isLeapYear(2000), true);
      assert.equal(isLeapYear(1900), false);
    });

    it("calculates inclusive days correctly", () => {
      const d1 = new Date("2024-04-01");
      const d2 = new Date("2024-04-30");
      assert.equal(countDaysInclusive(d1, d2), 30);
    });

    it("derives WDV rate from useful life and 5% salvage", () => {
      // Cost: 100,000, Salvage: 5,000, Life: 10 years
      // R = 1 - (5000 / 100000)^(1/10) = 1 - (0.05)^0.1 ≈ 1 - 0.74113 = 0.25887 (approx 25.89%)
      const rate = calculateWdvRate(100000, 5000, 10);
      assert.ok(rate > 0.258 && rate < 0.26, `Expected ~25.89%, got ${rate}`);
    });

    it("calculates SLM monthly depreciation with 5% residual floor", () => {
      // Asset cost: 120,000, Salvage: 6,000 (5%), Life: 5 years
      // Annual Dep = (120,000 - 6,000) / 5 = 22,800 / year
      // For 30 days in April 2025 (non-leap year, 365 days):
      // Daily = 22,800 / 365 = 62.4657
      // 30 days = 1,873.97
      const result = calculateBooksDepreciation({
        cost: 120000,
        residualPercentage: 5,
        usefulLifeYears: 5,
        depreciationMethod: "SLM",
        datePutToUse: "2025-04-01",
        openingBookValue: 120000,
        periodStartDate: "2025-04-01",
        periodEndDate: "2025-04-30",
      });

      assert.equal(result.salvageValue, 6000);
      assert.equal(result.daysInPeriod, 30);
      assert.equal(result.activeDaysInPeriod, 30);
      assert.equal(result.depreciationAmount, 1873.97);
      assert.equal(result.closingBookValue, 118126.03);
      assert.equal(result.isFullyDepreciated, false);
    });

    it("respects salvage value floor and stops depreciating below salvage", () => {
      // Opening book value is 6,100, Salvage is 6,000.
      // Even if annual dep is 22,800, max dep allowed is 100.
      const result = calculateBooksDepreciation({
        cost: 120000,
        salvageValue: 6000,
        usefulLifeYears: 5,
        depreciationMethod: "SLM",
        datePutToUse: "2020-04-01",
        openingBookValue: 6100,
        periodStartDate: "2025-04-01",
        periodEndDate: "2025-04-30",
      });

      assert.equal(result.depreciationAmount, 100);
      assert.equal(result.closingBookValue, 6000);
      assert.equal(result.isFullyDepreciated, true);
    });

    it("returns zero depreciation if already at or below salvage value", () => {
      const result = calculateBooksDepreciation({
        cost: 120000,
        salvageValue: 6000,
        usefulLifeYears: 5,
        depreciationMethod: "SLM",
        datePutToUse: "2020-04-01",
        openingBookValue: 6000,
        periodStartDate: "2025-04-01",
        periodEndDate: "2025-04-30",
      });

      assert.equal(result.depreciationAmount, 0);
      assert.equal(result.closingBookValue, 6000);
      assert.equal(result.isFullyDepreciated, true);
    });

    it("pro-ratas depreciation if asset put to use mid-period", () => {
      // Asset put to use on April 16 (15 active days: 16 to 30)
      const result = calculateBooksDepreciation({
        cost: 120000,
        residualPercentage: 5,
        usefulLifeYears: 5,
        depreciationMethod: "SLM",
        datePutToUse: "2025-04-16",
        openingBookValue: 120000,
        periodStartDate: "2025-04-01",
        periodEndDate: "2025-04-30",
      });

      assert.equal(result.daysInPeriod, 30);
      assert.equal(result.activeDaysInPeriod, 15);
      // 15 days * (22,800 / 365) = 936.99
      assert.equal(result.depreciationAmount, 936.99);
    });
  });

  describe("Income-tax Depreciation Engine (Section 32)", () => {
    it("detects additions put to use < 180 days in financial year", () => {
      // FY 2024-25 ends on 2025-03-31
      // Asset put to use on 2024-06-01 is >= 180 days (Full rate)
      assert.equal(isPutToUseLessThan180Days("2024-06-01", 2025), false);

      // Asset put to use on 2024-11-15 is < 180 days (Half rate)
      assert.equal(isPutToUseLessThan180Days("2024-11-15", 2025), true);
    });

    it("calculates standard tax block depreciation with half-rate addition", () => {
      // Plant & Machinery (15% rate)
      // Opening WDV: 500,000
      // Additions >= 180 days: 100,000 (15% = 15,000)
      // Additions < 180 days: 200,000 (7.5% = 15,000)
      // Deductions: 50,000
      // Base = 500k + 100k - 50k = 550,000 * 15% = 82,500
      // Additions < 180 = 200,000 * 7.5% = 15,000
      // Total Dep = 82,500 + 15,000 = 97,500
      // Closing WDV = 550k + 200k - 97,500 = 652,500
      const result = calculateTaxBlockDepreciation({
        blockName: "Plant & Machinery (General)",
        statutoryRatePercent: 15,
        openingWdv: 500000,
        additionsMoreThan180Days: 100000,
        additionsLessThan180Days: 200000,
        deductionsOrRealizations: 50000,
        hasAssetsRemainingInBlock: true,
      });

      assert.equal(result.adjustedBaseForDepreciation, 750000);
      assert.equal(result.depreciationOnBase, 82500);
      assert.equal(result.depreciationOnAdditionsLessThan180, 15000);
      assert.equal(result.depreciationAllowed, 97500);
      assert.equal(result.closingWdv, 652500);
      assert.equal(result.capitalGainOrLoss, 0);
    });

    it("triggers Short-Term Capital Gain (STCG) u/s 50 when deductions exceed block", () => {
      // Opening: 100,000, Additions: 0, Sale realizations: 150,000
      // Base = 100k - 150k = -50,000
      // Excess is 50,000 STCG, Depreciation = 0, Closing WDV = 0
      const result = calculateTaxBlockDepreciation({
        blockName: "Motor Cars",
        statutoryRatePercent: 15,
        openingWdv: 100000,
        additionsMoreThan180Days: 0,
        additionsLessThan180Days: 0,
        deductionsOrRealizations: 150000,
        hasAssetsRemainingInBlock: true,
      });

      assert.equal(result.depreciationAllowed, 0);
      assert.equal(result.closingWdv, 0);
      assert.equal(result.capitalGainOrLoss, 50000);
    });

    it("triggers Short-Term Capital Loss (STCL) u/s 50 when block is extinguished", () => {
      // Opening: 100,000, Additions: 0, Deductions: 40,000, but NO assets left in block
      // Remaining 60,000 is written off as STCL u/s 50(2)
      const result = calculateTaxBlockDepreciation({
        blockName: "Servers",
        statutoryRatePercent: 40,
        openingWdv: 100000,
        additionsMoreThan180Days: 0,
        additionsLessThan180Days: 0,
        deductionsOrRealizations: 40000,
        hasAssetsRemainingInBlock: false,
      });

      assert.equal(result.depreciationAllowed, 0);
      assert.equal(result.closingWdv, 0);
      assert.equal(result.capitalGainOrLoss, -60000); // Negative indicates STCL
      assert.equal(result.isExtinguished, true);
    });
  });
});
