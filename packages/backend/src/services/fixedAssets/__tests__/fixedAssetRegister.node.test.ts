import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FixedAssetRegisterService } from "../fixedAssetRegisterService";

describe("Fixed Asset Dynamic Register Engine", () => {
  describe("Period Boundary Resolver", () => {
    it("correctly resolves Full Financial Year boundaries (1 Apr to 31 Mar)", () => {
      const res = FixedAssetRegisterService.resolvePeriod({
        financialYear: "2025-2026",
        periodType: "FY",
      });

      assert.equal(res.financialYear, "2025-2026");
      assert.equal(res.startDate.toISOString().slice(0, 10), "2025-04-01");
      assert.equal(res.endDate.toISOString().slice(0, 10), "2026-03-31");
    });

    it("correctly resolves Indian financial quarters (Q1, Q2, Q3, Q4)", () => {
      const q1 = FixedAssetRegisterService.resolvePeriod({
        financialYear: "2025-2026",
        periodType: "Q1",
      });
      assert.equal(q1.startDate.toISOString().slice(0, 10), "2025-04-01");
      assert.equal(q1.endDate.toISOString().slice(0, 10), "2025-06-30");

      const q3 = FixedAssetRegisterService.resolvePeriod({
        financialYear: "2025-2026",
        periodType: "Q3",
      });
      assert.equal(q3.startDate.toISOString().slice(0, 10), "2025-10-01");
      assert.equal(q3.endDate.toISOString().slice(0, 10), "2025-12-31");

      const q4 = FixedAssetRegisterService.resolvePeriod({
        financialYear: "2025-2026",
        periodType: "Q4",
      });
      assert.equal(q4.startDate.toISOString().slice(0, 10), "2026-01-01");
      assert.equal(q4.endDate.toISOString().slice(0, 10), "2026-03-31");
    });

    it("correctly resolves specific month boundaries (e.g. May in FY 2025-26)", () => {
      const may = FixedAssetRegisterService.resolvePeriod({
        financialYear: "2025-2026",
        periodType: "MONTH",
        month: 5,
      });
      assert.equal(may.startDate.toISOString().slice(0, 10), "2025-05-01");
      assert.equal(may.endDate.toISOString().slice(0, 10), "2025-05-31");

      const feb = FixedAssetRegisterService.resolvePeriod({
        financialYear: "2025-2026",
        periodType: "MONTH",
        month: 2,
      });
      assert.equal(feb.startDate.toISOString().slice(0, 10), "2026-02-01");
      assert.equal(feb.endDate.toISOString().slice(0, 10), "2026-02-28");
    });

    it("resolves custom date range precisely", () => {
      const custom = FixedAssetRegisterService.resolvePeriod({
        financialYear: "2025-2026",
        periodType: "CUSTOM",
        startDate: "2025-06-15",
        endDate: "2025-11-20",
      });
      assert.equal(custom.startDate.toISOString().slice(0, 10), "2025-06-15");
      assert.equal(custom.endDate.toISOString().slice(0, 10), "2025-11-20");
    });
  });

  describe("Accrued Depreciation Calculation Up To Cutoff", () => {
    it("returns 0 if cutoff date is before date put to use", () => {
      const depr = FixedAssetRegisterService.computeDepreciationUpTo(
        {
          originalCost: 500000,
          salvageValue: 25000,
          usefulLifeYears: 10,
          depreciationMethod: "SLM",
          datePutToUse: new Date("2025-04-01"),
        },
        new Date("2025-03-31")
      );
      assert.equal(depr, 0);
    });

    it("calculates accurate SLM pro-rata depreciation for 1 year", () => {
      // Cost: ₹10,00,000, Salvage: ₹50,000 (5%), Life: 10 Years
      // Depreciable: ₹9,50,000, Annual: ₹95,000
      const depr = FixedAssetRegisterService.computeDepreciationUpTo(
        {
          originalCost: 1000000,
          salvageValue: 50000,
          usefulLifeYears: 10,
          depreciationMethod: "SLM",
          datePutToUse: new Date("2024-04-01"),
        },
        new Date("2025-04-01")
      );
      // ~95,000 (allowing 365 vs 365.25 day margin)
      assert.ok(depr >= 94000 && depr <= 96000, `Expected ~95,000, got ${depr}`);
    });
  });
});
