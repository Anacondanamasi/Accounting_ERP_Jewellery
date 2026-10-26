import { prisma } from "../../lib/prisma";
import { calculateTaxBlockDepreciation, isPutToUseLessThan180Days } from "./taxDepreciationEngine";
import { ensureFixedAssetSeedData } from "./fixedAssetSeedService";

export class FixedAssetReportService {
  /**
   * Schedule III Property, Plant and Equipment (PPE) Movement Schedule
   */
  public static async getScheduleIIPpeReport(companyId: number, financialYear?: string) {
    await ensureFixedAssetSeedData(companyId);

    const categories = await prisma.assetCategory.findMany({
      where: { companyId },
      include: {
        assets: {
          include: {
            depreciationLines: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const categoryRows = categories.map((cat) => {
      let grossOpening = 0;
      let grossAdditions = 0;
      let grossDeductions = 0;
      let grossClosing = 0;

      let depOpening = 0;
      let depForYear = 0;
      let depOnDeductions = 0;
      let depClosing = 0;

      for (const asset of cat.assets) {
        if (asset.isDisposed) {
          grossDeductions += asset.originalCost;
          depOnDeductions += asset.accumulatedDep;
        } else {
          grossClosing += asset.originalCost;
          depClosing += asset.accumulatedDep;
        }
      }

      grossOpening = grossClosing + grossDeductions - grossAdditions;
      depForYear = depClosing + depOnDeductions - depOpening;

      const netOpening = grossOpening - depOpening;
      const netClosing = grossClosing - depClosing;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        code: cat.code,
        usefulLifeYears: cat.usefulLifeYears,
        method: cat.defaultMethod,
        grossBlock: {
          opening: Math.round(grossOpening * 100) / 100,
          additions: Math.round(grossAdditions * 100) / 100,
          deductions: Math.round(grossDeductions * 100) / 100,
          closing: Math.round(grossClosing * 100) / 100,
        },
        depreciation: {
          opening: Math.round(depOpening * 100) / 100,
          forTheYear: Math.round(depForYear * 100) / 100,
          onDeductions: Math.round(depOnDeductions * 100) / 100,
          closing: Math.round(depClosing * 100) / 100,
        },
        netBlock: {
          opening: Math.round(netOpening * 100) / 100,
          closing: Math.round(netClosing * 100) / 100,
        },
        assetCount: cat.assets.filter((a) => !a.isDisposed).length,
      };
    });

    const grandTotal = categoryRows.reduce(
      (acc, r) => ({
        grossClosing: acc.grossClosing + r.grossBlock.closing,
        grossDeductions: acc.grossDeductions + r.grossBlock.deductions,
        depClosing: acc.depClosing + r.depreciation.closing,
        netClosing: acc.netClosing + r.netBlock.closing,
        assetCount: acc.assetCount + r.assetCount,
      }),
      { grossClosing: 0, grossDeductions: 0, depClosing: 0, netClosing: 0, assetCount: 0 }
    );

    return {
      financialYear: financialYear || "Current FY",
      complianceStandard: "Companies Act 2013 (Schedule II & Schedule III Part I)",
      categories: categoryRows,
      grandTotal: {
        grossClosing: Math.round(grandTotal.grossClosing * 100) / 100,
        grossDeductions: Math.round(grandTotal.grossDeductions * 100) / 100,
        depClosing: Math.round(grandTotal.depClosing * 100) / 100,
        netClosing: Math.round(grandTotal.netClosing * 100) / 100,
        assetCount: grandTotal.assetCount,
      },
    };
  }

  /**
   * Statutory Income-tax Act Section 32 Block of Assets Schedule (Form 3CD Annexure)
   */
  public static async getTaxBlockReport(companyId: number, financialYearEndYear = new Date().getFullYear()) {
    await ensureFixedAssetSeedData(companyId);

    const blocks = await prisma.taxBlock.findMany({
      where: { companyId },
      include: {
        assets: true,
      },
      orderBy: { name: "asc" },
    });

    const blockRows = blocks.map((b) => {
      let addMore180 = 0;
      let addLess180 = 0;
      let deductions = 0;
      let activeAssetsCount = 0;

      for (const asset of b.assets) {
        if (asset.isDisposed) {
          deductions += asset.disposalAmount ?? 0;
        } else {
          activeAssetsCount++;
          // Check if put to use was less than 180 days in the year
          const isHalfRate = isPutToUseLessThan180Days(asset.datePutToUse, financialYearEndYear);
          if (isHalfRate) {
            addLess180 += asset.originalCost;
          } else {
            addMore180 += asset.originalCost;
          }
        }
      }

      // Compute statutory tax block calculation
      const calc = calculateTaxBlockDepreciation({
        blockName: b.name,
        statutoryRatePercent: b.depreciationRate,
        openingWdv: 0, // In fresh year / or carried from balance
        additionsMoreThan180Days: addMore180,
        additionsLessThan180Days: addLess180,
        deductionsOrRealizations: deductions,
        hasAssetsRemainingInBlock: activeAssetsCount > 0,
      });

      return {
        blockId: b.id,
        blockName: b.name,
        assetClass: b.assetClass,
        statutoryRate: b.depreciationRate,
        verifyWithCa: b.verifyWithCa,
        openingWdv: calc.openingWdv,
        additionsMoreThan180Days: calc.additionsMoreThan180Days,
        additionsLessThan180Days: calc.additionsLessThan180Days,
        totalAdditions: calc.totalAdditions,
        deductions: calc.deductionsOrRealizations,
        adjustedBase: calc.adjustedBaseForDepreciation,
        depreciationAllowed: calc.depreciationAllowed,
        depreciationOnBase: calc.depreciationOnBase,
        depreciationOnAdditionsLessThan180: calc.depreciationOnAdditionsLessThan180,
        closingWdv: calc.closingWdv,
        capitalGainOrLoss: calc.capitalGainOrLoss,
        isExtinguished: calc.isExtinguished,
        remarks: calc.remarks,
        activeAssetsCount,
      };
    });

    const grandTotal = blockRows.reduce(
      (acc, r) => ({
        totalAdditions: acc.totalAdditions + r.totalAdditions,
        deductions: acc.deductions + r.deductions,
        depreciationAllowed: acc.depreciationAllowed + r.depreciationAllowed,
        closingWdv: acc.closingWdv + r.closingWdv,
        capitalGainOrLoss: acc.capitalGainOrLoss + r.capitalGainOrLoss,
      }),
      { totalAdditions: 0, deductions: 0, depreciationAllowed: 0, closingWdv: 0, capitalGainOrLoss: 0 }
    );

    return {
      financialYear: `${financialYearEndYear - 1}-${financialYearEndYear}`,
      statutoryAct: "Income Tax Act 1961, Section 32 & Appendix I",
      blocks: blockRows,
      grandTotal: {
        totalAdditions: Math.round(grandTotal.totalAdditions * 100) / 100,
        deductions: Math.round(grandTotal.deductions * 100) / 100,
        depreciationAllowed: Math.round(grandTotal.depreciationAllowed * 100) / 100,
        closingWdv: Math.round(grandTotal.closingWdv * 100) / 100,
        capitalGainOrLoss: Math.round(grandTotal.capitalGainOrLoss * 100) / 100,
      },
    };
  }

  /**
   * Side-by-side reconciliation of Books Depreciation vs Tax Depreciation
   */
  public static async getBooksVsTaxComparison(companyId: number) {
    const [ppeReport, taxReport] = await Promise.all([
      this.getScheduleIIPpeReport(companyId),
      this.getTaxBlockReport(companyId),
    ]);

    const booksDepreciationTotal = ppeReport.grandTotal.depClosing;
    const taxDepreciationTotal = taxReport.grandTotal.depreciationAllowed;
    const timingDifference = Math.round((booksDepreciationTotal - taxDepreciationTotal) * 100) / 100;

    return {
      financialYear: taxReport.financialYear,
      booksDepreciationTotal,
      taxDepreciationTotal,
      timingDifference,
      timingDifferenceNature:
        timingDifference > 0
          ? "Deferred Tax Asset (DTA) Timing Impact (Books depr higher than Tax depr)"
          : timingDifference < 0
          ? "Deferred Tax Liability (DTL) Timing Impact (Tax depr higher than Books depr)"
          : "Nil Difference",
      ppeReport,
      taxReport,
    };
  }
}
