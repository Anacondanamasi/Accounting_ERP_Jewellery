import { prisma } from "../../lib/prisma";
import {
  calculateBooksDepreciation,
  calculateWdvRate,
  countDaysInclusive,
} from "./booksDepreciationEngine";
import { calculateTaxBlockDepreciation, isPutToUseLessThan180Days } from "./taxDepreciationEngine";
import { ensureFixedAssetSeedData } from "./fixedAssetSeedService";

export interface DynamicRegisterQuery {
  financialYear?: string; // e.g. "2025-2026", "2024-2025"
  periodType?: "FY" | "H1" | "H2" | "Q1" | "Q2" | "Q3" | "Q4" | "MONTH" | "CUSTOM";
  month?: number; // 1 to 12 (calendar month or FY month index)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  categoryId?: number;
  taxBlockId?: number;
  status?: string; // "ALL" | "ACTIVE" | "CWIP" | "DISPOSED"
  depreciationMethod?: string; // "ALL" | "SLM" | "WDV"
  location?: string;
  department?: string;
  search?: string;
}

export interface RegisterItemRow {
  assetId: number;
  assetCode: string;
  name: string;
  categoryName: string;
  categoryCode: string;
  taxBlockName?: string;
  taxBlockRate?: number;
  location?: string;
  department?: string;
  custodian?: string;
  serialNo?: string;
  datePutToUse: string;
  disposalDate?: string;
  status: string;
  depreciationMethod: "SLM" | "WDV";
  usefulLifeYears: number;
  salvageValue: number;
  isAdditionInPeriod: boolean;
  isDisposalInPeriod: boolean;
  isLessThan180DaysAddition: boolean;

  // Gross Block
  grossOpening: number;
  additions: number;
  deductions: number;
  grossClosing: number;

  // Depreciation
  depreciationOpening: number;
  depreciationForPeriod: number;
  depreciationOnDeductions: number;
  depreciationClosing: number;

  // Net Book Value
  netOpening: number;
  netClosing: number;
}

export interface RegisterCategoryRow {
  categoryId: number;
  categoryName: string;
  categoryCode: string;
  usefulLifeYears: number;
  defaultMethod: string;
  assetCount: number;

  grossOpening: number;
  additions: number;
  deductions: number;
  grossClosing: number;

  depreciationOpening: number;
  depreciationForPeriod: number;
  depreciationOnDeductions: number;
  depreciationClosing: number;

  netOpening: number;
  netClosing: number;
}

export class FixedAssetRegisterService {
  /**
   * Parse arbitrary period query into exact [startDate, endDate] and metadata
   */
  public static resolvePeriod(query: DynamicRegisterQuery): {
    startDate: Date;
    endDate: Date;
    financialYear: string;
    periodLabel: string;
    financialYearEndYear: number;
  } {
    const now = new Date();
    // Default FY calculation (Indian FY starts April 1)
    const currentFyEndYear = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();

    let fyEndYear = currentFyEndYear;
    if (query.financialYear) {
      const parts = query.financialYear.split("-");
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        const p2 = Number(parts[1]);
        fyEndYear = p2 < 100 ? 2000 + p2 : p2;
      }
    }

    const fyStartYear = fyEndYear - 1;
    const fyStartDate = new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0)); // 1-Apr
    const fyEndDate = new Date(Date.UTC(fyEndYear, 2, 31, 23, 59, 59)); // 31-Mar

    const financialYearString = `${fyStartYear}-${fyEndYear}`;

    // Custom date range takes priority if both dates provided
    if (query.periodType === "CUSTOM" && query.startDate && query.endDate) {
      const s = new Date(query.startDate + "T00:00:00.000Z");
      const e = new Date(query.endDate + "T23:59:59.999Z");
      return {
        startDate: s,
        endDate: e,
        financialYear: financialYearString,
        periodLabel: `Custom (${query.startDate} to ${query.endDate})`,
        financialYearEndYear: fyEndYear,
      };
    }

    const periodType = query.periodType || "FY";

    switch (periodType) {
      case "Q1": // Apr 1 - Jun 30
        return {
          startDate: new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0)),
          endDate: new Date(Date.UTC(fyStartYear, 5, 30, 23, 59, 59)),
          financialYear: financialYearString,
          periodLabel: `Q1 FY ${financialYearString} (Apr - Jun ${fyStartYear})`,
          financialYearEndYear: fyEndYear,
        };
      case "Q2": // Jul 1 - Sep 30
        return {
          startDate: new Date(Date.UTC(fyStartYear, 6, 1, 0, 0, 0)),
          endDate: new Date(Date.UTC(fyStartYear, 8, 30, 23, 59, 59)),
          financialYear: financialYearString,
          periodLabel: `Q2 FY ${financialYearString} (Jul - Sep ${fyStartYear})`,
          financialYearEndYear: fyEndYear,
        };
      case "Q3": // Oct 1 - Dec 31
        return {
          startDate: new Date(Date.UTC(fyStartYear, 9, 1, 0, 0, 0)),
          endDate: new Date(Date.UTC(fyStartYear, 11, 31, 23, 59, 59)),
          financialYear: financialYearString,
          periodLabel: `Q3 FY ${financialYearString} (Oct - Dec ${fyStartYear})`,
          financialYearEndYear: fyEndYear,
        };
      case "Q4": // Jan 1 - Mar 31
        return {
          startDate: new Date(Date.UTC(fyEndYear, 0, 1, 0, 0, 0)),
          endDate: new Date(Date.UTC(fyEndYear, 2, 31, 23, 59, 59)),
          financialYear: financialYearString,
          periodLabel: `Q4 FY ${financialYearString} (Jan - Mar ${fyEndYear})`,
          financialYearEndYear: fyEndYear,
        };
      case "H1": // Apr 1 - Sep 30
        return {
          startDate: new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0)),
          endDate: new Date(Date.UTC(fyStartYear, 8, 30, 23, 59, 59)),
          financialYear: financialYearString,
          periodLabel: `H1 FY ${financialYearString} (Apr - Sep ${fyStartYear})`,
          financialYearEndYear: fyEndYear,
        };
      case "H2": // Oct 1 - Mar 31
        return {
          startDate: new Date(Date.UTC(fyStartYear, 9, 1, 0, 0, 0)),
          endDate: new Date(Date.UTC(fyEndYear, 2, 31, 23, 59, 59)),
          financialYear: financialYearString,
          periodLabel: `H2 FY ${financialYearString} (Oct ${fyStartYear} - Mar ${fyEndYear})`,
          financialYearEndYear: fyEndYear,
        };
      case "MONTH": {
        // Month 1 = April (FY month 1) or calendar month (1..12)
        const monthNum = query.month && query.month >= 1 && query.month <= 12 ? query.month : 4;
        const calYear = monthNum >= 4 ? fyStartYear : fyEndYear;
        const monthIndex = monthNum - 1; // 0-indexed JavaScript Month

        const s = new Date(Date.UTC(calYear, monthIndex, 1, 0, 0, 0));
        // Last day of month
        const lastDay = new Date(Date.UTC(calYear, monthIndex + 1, 0)).getUTCDate();
        const e = new Date(Date.UTC(calYear, monthIndex, lastDay, 23, 59, 59));

        const monthName = s.toLocaleString("en-US", { month: "long" });
        return {
          startDate: s,
          endDate: e,
          financialYear: financialYearString,
          periodLabel: `${monthName} ${calYear} (FY ${financialYearString})`,
          financialYearEndYear: fyEndYear,
        };
      }
      case "FY":
      default:
        return {
          startDate: fyStartDate,
          endDate: fyEndDate,
          financialYear: financialYearString,
          periodLabel: `Full Financial Year ${financialYearString} (1 Apr ${fyStartYear} - 31 Mar ${fyEndYear})`,
          financialYearEndYear: fyEndYear,
        };
    }
  }

  /**
   * Calculate precise accumulated depreciation of an asset up to a given cutoff date.
   */
  public static computeDepreciationUpTo(
    asset: {
      originalCost: number;
      salvageValue: number;
      usefulLifeYears: number;
      depreciationMethod: string;
      datePutToUse: Date;
      isDisposed?: boolean;
      disposalDate?: Date | null;
    },
    cutoffDate: Date
  ): number {
    const ptu = new Date(asset.datePutToUse);
    if (cutoffDate <= ptu) return 0;

    const effectiveEnd =
      asset.isDisposed && asset.disposalDate && new Date(asset.disposalDate) < cutoffDate
        ? new Date(asset.disposalDate)
        : cutoffDate;

    if (effectiveEnd <= ptu) return 0;

    const cost = asset.originalCost;
    const salvage = asset.salvageValue || Math.round(cost * 0.05 * 100) / 100;
    const life = asset.usefulLifeYears;
    const method = asset.depreciationMethod === "WDV" ? "WDV" : "SLM";

    if (method === "SLM") {
      const depreciableBase = Math.max(0, cost - salvage);
      const annualDepr = depreciableBase / life;
      // Pro-rata based on days (365/366)
      const days = countDaysInclusive(ptu, effectiveEnd) - 1; // days elapsed
      const depr = Math.min(depreciableBase, (annualDepr / 365.25) * Math.max(0, days));
      return Math.round(depr * 100) / 100;
    } else {
      // WDV calculation
      const wdvRate = calculateWdvRate(cost, salvage, life);
      const days = countDaysInclusive(ptu, effectiveEnd) - 1;
      const years = Math.max(0, days) / 365.25;
      const remainingWdv = cost * Math.pow(1 - wdvRate, years);
      const accrued = Math.max(0, Math.min(cost - salvage, cost - remainingWdv));
      return Math.round(accrued * 100) / 100;
    }
  }

  /**
   * Main Dynamic Fixed Asset Register generator
   */
  public static async generateRegister(companyId: number, query: DynamicRegisterQuery) {
    await ensureFixedAssetSeedData(companyId);

    const { startDate, endDate, financialYear, periodLabel, financialYearEndYear } =
      this.resolvePeriod(query);

    // Fetch all assets with category and tax block
    const assets = await prisma.fixedAsset.findMany({
      where: { companyId },
      include: {
        category: true,
        taxBlock: true,
      },
      orderBy: [{ datePutToUse: "asc" }, { assetCode: "asc" }],
    });

    const itemizedRows: RegisterItemRow[] = [];

    for (const a of assets) {
      // Filter criteria
      if (query.categoryId && a.assetCategoryId !== Number(query.categoryId)) continue;
      if (query.taxBlockId && a.taxBlockId !== Number(query.taxBlockId)) continue;
      if (query.status && query.status !== "ALL" && a.status !== query.status) continue;
      if (query.depreciationMethod && query.depreciationMethod !== "ALL" && a.depreciationMethod !== query.depreciationMethod) {
        continue;
      }
      if (query.location && a.location && !a.location.toLowerCase().includes(query.location.toLowerCase())) {
        continue;
      }
      if (query.department && a.department && !a.department.toLowerCase().includes(query.department.toLowerCase())) {
        continue;
      }
      if (query.search && query.search.trim()) {
        const q = query.search.trim().toLowerCase();
        const matches =
          a.assetCode.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.serialNo && a.serialNo.toLowerCase().includes(q)) ||
          (a.custodian && a.custodian.toLowerCase().includes(q)) ||
          (a.location && a.location.toLowerCase().includes(q));
        if (!matches) continue;
      }

      const ptu = new Date(a.datePutToUse);
      const dispDate = a.disposalDate ? new Date(a.disposalDate) : null;

      // 1. Check if asset existed before period start or was added in period
      // If acquired after period end, skip from this period report
      if (ptu > endDate) {
        continue;
      }

      // If disposed before period start, skip from this period report
      if (a.isDisposed && dispDate && dispDate < startDate) {
        continue;
      }

      const isAdditionInPeriod = ptu >= startDate && ptu <= endDate;
      const isDisposalInPeriod = Boolean(a.isDisposed && dispDate && dispDate >= startDate && dispDate <= endDate);

      // Check <180 days condition for FY additions
      const isLessThan180 = isAdditionInPeriod
        ? isPutToUseLessThan180Days(ptu, financialYearEndYear)
        : false;

      // Gross block figures
      const grossOpening = isAdditionInPeriod ? 0 : a.originalCost;
      const additions = isAdditionInPeriod ? a.originalCost : 0;
      const deductions = isDisposalInPeriod ? a.originalCost : 0;
      const grossClosing = Math.round((grossOpening + additions - deductions) * 100) / 100;

      // CWIP assets have 0 depreciation
      if (a.isCwip || a.status === "CWIP") {
        itemizedRows.push({
          assetId: a.id,
          assetCode: a.assetCode,
          name: a.name,
          categoryName: a.category?.name || "General",
          categoryCode: a.category?.code || "GEN",
          taxBlockName: a.taxBlock?.name,
          taxBlockRate: a.taxBlock?.depreciationRate,
          location: a.location || undefined,
          department: a.department || undefined,
          custodian: a.custodian || undefined,
          serialNo: a.serialNo || undefined,
          datePutToUse: a.datePutToUse.toISOString().slice(0, 10),
          disposalDate: a.disposalDate ? a.disposalDate.toISOString().slice(0, 10) : undefined,
          status: a.status,
          depreciationMethod: a.depreciationMethod === "WDV" ? "WDV" : "SLM",
          usefulLifeYears: a.usefulLifeYears,
          salvageValue: a.salvageValue,
          isAdditionInPeriod,
          isDisposalInPeriod,
          isLessThan180DaysAddition: isLessThan180,
          grossOpening,
          additions,
          deductions,
          grossClosing,
          depreciationOpening: 0,
          depreciationForPeriod: 0,
          depreciationOnDeductions: 0,
          depreciationClosing: 0,
          netOpening: grossOpening,
          netClosing: grossClosing,
        });
        continue;
      }

      // Depreciation computation
      // Depreciation accrued up to period start
      const depOpening = isAdditionInPeriod
        ? 0
        : this.computeDepreciationUpTo(
            {
              originalCost: a.originalCost,
              salvageValue: a.salvageValue,
              usefulLifeYears: a.usefulLifeYears,
              depreciationMethod: a.depreciationMethod,
              datePutToUse: ptu,
              isDisposed: a.isDisposed,
              disposalDate: dispDate,
            },
            startDate
          );

      const openingBookValue = Math.max(a.salvageValue, a.originalCost - depOpening);

      // Period depreciation using Books Depreciation Engine
      const periodDepResult = calculateBooksDepreciation({
        cost: a.originalCost,
        salvageValue: a.salvageValue,
        usefulLifeYears: a.usefulLifeYears,
        depreciationMethod: a.depreciationMethod === "WDV" ? "WDV" : "SLM",
        datePutToUse: ptu,
        disposalDate: dispDate,
        openingBookValue,
        periodStartDate: startDate,
        periodEndDate: endDate,
      });

      const depForPeriod = periodDepResult.depreciationAmount;

      // Depreciation on deduction if disposed in this period
      const depOnDeductions = isDisposalInPeriod
        ? Math.round((depOpening + depForPeriod) * 100) / 100
        : 0;

      const depClosing = isDisposalInPeriod
        ? 0
        : Math.round((depOpening + depForPeriod) * 100) / 100;

      const netOpening = Math.round((grossOpening - depOpening) * 100) / 100;
      const netClosing = Math.round((grossClosing - depClosing) * 100) / 100;

      itemizedRows.push({
        assetId: a.id,
        assetCode: a.assetCode,
        name: a.name,
        categoryName: a.category?.name || "General",
        categoryCode: a.category?.code || "GEN",
        taxBlockName: a.taxBlock?.name,
        taxBlockRate: a.taxBlock?.depreciationRate,
        location: a.location || undefined,
        department: a.department || undefined,
        custodian: a.custodian || undefined,
        serialNo: a.serialNo || undefined,
        datePutToUse: a.datePutToUse.toISOString().slice(0, 10),
        disposalDate: a.disposalDate ? a.disposalDate.toISOString().slice(0, 10) : undefined,
        status: a.status,
        depreciationMethod: a.depreciationMethod === "WDV" ? "WDV" : "SLM",
        usefulLifeYears: a.usefulLifeYears,
        salvageValue: a.salvageValue,
        isAdditionInPeriod,
        isDisposalInPeriod,
        isLessThan180DaysAddition: isLessThan180,
        grossOpening,
        additions,
        deductions,
        grossClosing,
        depreciationOpening: depOpening,
        depreciationForPeriod: depForPeriod,
        depreciationOnDeductions: depOnDeductions,
        depreciationClosing: depClosing,
        netOpening,
        netClosing,
      });
    }

    // Aggregate by Category (Schedule III PPE format)
    const categoryMap = new Map<number, RegisterCategoryRow>();

    for (const r of itemizedRows) {
      const assetObj = assets.find((a) => a.id === r.assetId);
      const catId = assetObj?.assetCategoryId || 0;
      const catName = r.categoryName;
      const catCode = r.categoryCode;
      const life = r.usefulLifeYears;
      const method = r.depreciationMethod;

      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          categoryId: catId,
          categoryName: catName,
          categoryCode: catCode,
          usefulLifeYears: life,
          defaultMethod: method,
          assetCount: 0,
          grossOpening: 0,
          additions: 0,
          deductions: 0,
          grossClosing: 0,
          depreciationOpening: 0,
          depreciationForPeriod: 0,
          depreciationOnDeductions: 0,
          depreciationClosing: 0,
          netOpening: 0,
          netClosing: 0,
        });
      }

      const row = categoryMap.get(catId)!;
      row.assetCount += 1;
      row.grossOpening = Math.round((row.grossOpening + r.grossOpening) * 100) / 100;
      row.additions = Math.round((row.additions + r.additions) * 100) / 100;
      row.deductions = Math.round((row.deductions + r.deductions) * 100) / 100;
      row.grossClosing = Math.round((row.grossClosing + r.grossClosing) * 100) / 100;
      row.depreciationOpening = Math.round((row.depreciationOpening + r.depreciationOpening) * 100) / 100;
      row.depreciationForPeriod = Math.round((row.depreciationForPeriod + r.depreciationForPeriod) * 100) / 100;
      row.depreciationOnDeductions =
        Math.round((row.depreciationOnDeductions + r.depreciationOnDeductions) * 100) / 100;
      row.depreciationClosing = Math.round((row.depreciationClosing + r.depreciationClosing) * 100) / 100;
      row.netOpening = Math.round((row.netOpening + r.netOpening) * 100) / 100;
      row.netClosing = Math.round((row.netClosing + r.netClosing) * 100) / 100;
    }

    const categoryRows = Array.from(categoryMap.values()).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName)
    );

    // Grand Totals KPI
    const grandTotals = itemizedRows.reduce(
      (acc, r) => ({
        grossOpening: acc.grossOpening + r.grossOpening,
        additions: acc.additions + r.additions,
        deductions: acc.deductions + r.deductions,
        grossClosing: acc.grossClosing + r.grossClosing,
        depreciationOpening: acc.depreciationOpening + r.depreciationOpening,
        depreciationForPeriod: acc.depreciationForPeriod + r.depreciationForPeriod,
        depreciationOnDeductions: acc.depreciationOnDeductions + r.depreciationOnDeductions,
        depreciationClosing: acc.depreciationClosing + r.depreciationClosing,
        netOpening: acc.netOpening + r.netOpening,
        netClosing: acc.netClosing + r.netClosing,
        totalAssets: acc.totalAssets + 1,
        activeCount: acc.activeCount + (r.status === "ACTIVE" ? 1 : 0),
        cwipCount: acc.cwipCount + (r.status === "CWIP" ? 1 : 0),
        disposedCount: acc.disposedCount + (r.status === "DISPOSED" ? 1 : 0),
      }),
      {
        grossOpening: 0,
        additions: 0,
        deductions: 0,
        grossClosing: 0,
        depreciationOpening: 0,
        depreciationForPeriod: 0,
        depreciationOnDeductions: 0,
        depreciationClosing: 0,
        netOpening: 0,
        netClosing: 0,
        totalAssets: 0,
        activeCount: 0,
        cwipCount: 0,
        disposedCount: 0,
      }
    );

    // Format all totals cleanly
    const formattedGrandTotals = {
      grossOpening: Math.round(grandTotals.grossOpening * 100) / 100,
      additions: Math.round(grandTotals.additions * 100) / 100,
      deductions: Math.round(grandTotals.deductions * 100) / 100,
      grossClosing: Math.round(grandTotals.grossClosing * 100) / 100,
      depreciationOpening: Math.round(grandTotals.depreciationOpening * 100) / 100,
      depreciationForPeriod: Math.round(grandTotals.depreciationForPeriod * 100) / 100,
      depreciationOnDeductions: Math.round(grandTotals.depreciationOnDeductions * 100) / 100,
      depreciationClosing: Math.round(grandTotals.depreciationClosing * 100) / 100,
      netOpening: Math.round(grandTotals.netOpening * 100) / 100,
      netClosing: Math.round(grandTotals.netClosing * 100) / 100,
      totalAssets: grandTotals.totalAssets,
      activeCount: grandTotals.activeCount,
      cwipCount: grandTotals.cwipCount,
      disposedCount: grandTotals.disposedCount,
    };

    return {
      metadata: {
        financialYear,
        periodType: query.periodType || "FY",
        periodLabel,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        generatedAt: new Date().toISOString(),
        standard: "Companies Act 2013 (Schedule II & III Part I) & Income-tax Act Section 32",
      },
      grandTotals: formattedGrandTotals,
      categories: categoryRows,
      itemized: itemizedRows,
    };
  }
}
