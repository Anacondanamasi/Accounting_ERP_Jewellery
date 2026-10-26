import { prisma } from "../../lib/prisma";
import { calculateBooksDepreciation } from "./booksDepreciationEngine";
import { AuditService } from "../audit/auditService";
import { ensureFixedAssetSeedData } from "./fixedAssetSeedService";

export interface DepreciationRunPreviewInput {
  periodStartDate: Date | string;
  periodEndDate: Date | string;
  frequency?: "MONTHLY" | "QUARTERLY" | "YEARLY";
}

export interface DepreciationRunPostInput extends DepreciationRunPreviewInput {
  remarks?: string;
}

export class DepreciationRunService {
  /**
   * Determine Indian Financial Year label (e.g. "2024-2025") from a date
   */
  public static getFinancialYear(date: Date): string {
    const month = date.getMonth(); // 0-indexed: 0=Jan, 2=Mar, 3=Apr
    const year = date.getFullYear();
    if (month >= 3) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  /**
   * Generate next sequential depreciation run number
   */
  public static async generateRunNumber(companyId: number, periodEnd: Date): Promise<string> {
    const yyyymm = `${periodEnd.getFullYear()}${String(periodEnd.getMonth() + 1).padStart(2, "0")}`;
    const count = await prisma.depreciationRun.count({
      where: { companyId },
    });
    return `DEPR-${yyyymm}-${String(count + 1).padStart(4, "0")}`;
  }

  /**
   * Preview a depreciation run without posting changes
   */
  public static async previewDepreciationRun(companyId: number, input: DepreciationRunPreviewInput) {
    await ensureFixedAssetSeedData(companyId);

    const periodStart = new Date(input.periodStartDate);
    const periodEnd = new Date(input.periodEndDate);

    if (periodEnd < periodStart) {
      throw new Error("Period end date cannot be earlier than start date");
    }

    // Check for existing overlapping posted run
    const existingRun = await prisma.depreciationRun.findFirst({
      where: {
        companyId,
        status: "POSTED",
        OR: [
          {
            periodStartDate: { lte: periodEnd },
            periodEndDate: { gte: periodStart },
          },
        ],
      },
    });

    // Fetch all active fixed assets
    const assets = await prisma.fixedAsset.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        isCwip: false,
        isDisposed: false,
        datePutToUse: { lte: periodEnd },
      },
      include: {
        category: true,
      },
      orderBy: { assetCode: "asc" },
    });

    const lines: Array<{
      fixedAssetId: number;
      assetCode: string;
      assetName: string;
      categoryName: string;
      originalCost: number;
      openingBookValue: number;
      depreciationAmount: number;
      closingBookValue: number;
      salvageValue: number;
      daysDepreciated: number;
      status: "POSTED" | "EXCLUDED";
      remarks: string;
      depExpenseAccountId: number;
      accumulatedDepAccountId: number;
    }> = [];

    let totalDepreciation = 0;
    const categoryTotals = new Map<number, { categoryName: string; expenseAccId: number; accumAccId: number; amount: number }>();

    for (const asset of assets) {
      const calc = calculateBooksDepreciation({
        cost: asset.originalCost,
        salvageValue: asset.salvageValue,
        usefulLifeYears: asset.usefulLifeYears,
        depreciationMethod: asset.depreciationMethod as "SLM" | "WDV",
        datePutToUse: asset.datePutToUse,
        openingBookValue: asset.currentBookValue,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
      });

      let status: "POSTED" | "EXCLUDED" = "POSTED";
      let remark = `Calculated using ${asset.depreciationMethod} (${calc.activeDaysInPeriod} active days)`;

      if (calc.depreciationAmount <= 0) {
        status = "EXCLUDED";
        if (calc.isFullyDepreciated) {
          remark = `Asset fully depreciated to residual value floor (₹${asset.salvageValue.toLocaleString("en-IN")})`;
        } else if (calc.activeDaysInPeriod <= 0) {
          remark = "Asset not active during period";
        }
      }

      if (status === "POSTED") {
        totalDepreciation += calc.depreciationAmount;

        const catKey = asset.assetCategoryId;
        const currentCat = categoryTotals.get(catKey) || {
          categoryName: asset.category.name,
          expenseAccId: asset.category.depExpenseAccountId,
          accumAccId: asset.category.accumulatedDepAccountId,
          amount: 0,
        };
        currentCat.amount += calc.depreciationAmount;
        categoryTotals.set(catKey, currentCat);
      }

      lines.push({
        fixedAssetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.name,
        categoryName: asset.category.name,
        originalCost: asset.originalCost,
        openingBookValue: calc.openingBookValue,
        depreciationAmount: calc.depreciationAmount,
        closingBookValue: calc.closingBookValue,
        salvageValue: calc.salvageValue,
        daysDepreciated: calc.activeDaysInPeriod,
        status,
        remarks: remark,
        depExpenseAccountId: asset.category.depExpenseAccountId,
        accumulatedDepAccountId: asset.category.accumulatedDepAccountId,
      });
    }

    const journalPreview = Array.from(categoryTotals.values()).map((c) => ({
      categoryName: c.categoryName,
      expenseAccountId: c.expenseAccId,
      accumulatedDepAccountId: c.accumAccId,
      amount: Math.round(c.amount * 100) / 100,
    }));

    return {
      periodStartDate: periodStart,
      periodEndDate: periodEnd,
      financialYear: this.getFinancialYear(periodEnd),
      totalDepreciation: Math.round(totalDepreciation * 100) / 100,
      assetCount: lines.filter((l) => l.status === "POSTED").length,
      excludedCount: lines.filter((l) => l.status === "EXCLUDED").length,
      lines,
      journalPreview,
      hasOverlapWarning: !!existingRun,
      overlapRunNumber: existingRun?.runNumber ?? null,
    };
  }

  /**
   * Post a depreciation run and create General Ledger balanced journal entry
   */
  public static async postDepreciationRun(companyId: number, input: DepreciationRunPostInput, actor = "system") {
    const preview = await this.previewDepreciationRun(companyId, input);

    if (preview.lines.length === 0) {
      throw new Error("No active assets available for depreciation in the selected period");
    }

    const periodEnd = new Date(input.periodEndDate);
    const runNumber = await this.generateRunNumber(companyId, periodEnd);
    const financialYear = preview.financialYear;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create balanced General Ledger journal entry if depreciation amount > 0
      let journalId: number | null = null;

      if (preview.totalDepreciation > 0 && preview.journalPreview.length > 0) {
        // Collect debits (Depreciation Expense) and credits (Accumulated Depreciation)
        const journalLinesData: any[] = [];

        for (const jLine of preview.journalPreview) {
          if (jLine.amount > 0) {
            // Debit line: Depreciation Expense
            journalLinesData.push({
              companyId,
              accountId: jLine.expenseAccountId,
              debit: jLine.amount,
              credit: 0,
              narration: `Depreciation on ${jLine.categoryName} for ${periodEnd.toISOString().slice(0, 10)}`,
              createdBy: actor,
            });
            // Credit line: Accumulated Depreciation
            journalLinesData.push({
              companyId,
              accountId: jLine.accumulatedDepAccountId,
              debit: 0,
              credit: jLine.amount,
              narration: `Accum. Depr. on ${jLine.categoryName} for ${periodEnd.toISOString().slice(0, 10)}`,
              createdBy: actor,
            });
          }
        }

        const journal = await tx.journalEntry.create({
          data: {
            companyId,
            entryNo: `JNL-${runNumber}`,
            date: periodEnd,
            narration: `Periodic depreciation run ${runNumber} (${financialYear}) - ${input.remarks || "Companies Act 2013"}`,
            status: "POSTED",
            postedAt: new Date(),
            postedBy: actor,
            createdBy: actor,
            lines: {
              create: journalLinesData,
            },
          },
        });
        journalId = journal.id;
      }

      // 2. Create DepreciationRun
      const run = await tx.depreciationRun.create({
        data: {
          companyId,
          runNumber,
          runDate: new Date(),
          periodStartDate: preview.periodStartDate,
          periodEndDate: preview.periodEndDate,
          financialYear,
          frequency: input.frequency || "MONTHLY",
          status: "POSTED",
          totalDepreciation: preview.totalDepreciation,
          assetCount: preview.assetCount,
          journalId,
          remarks: input.remarks,
          createdBy: actor,
        },
      });

      // 3. Create run lines & update assets
      for (const line of preview.lines) {
        await tx.depreciationRunLine.create({
          data: {
            depreciationRunId: run.id,
            fixedAssetId: line.fixedAssetId,
            assetCode: line.assetCode,
            assetName: line.assetName,
            openingBookValue: line.openingBookValue,
            depreciationAmount: line.depreciationAmount,
            closingBookValue: line.closingBookValue,
            daysDepreciated: line.daysDepreciated,
            status: line.status,
            remarks: line.remarks,
          },
        });

        if (line.status === "POSTED" && line.depreciationAmount > 0) {
          await tx.fixedAsset.update({
            where: { id: line.fixedAssetId },
            data: {
              currentBookValue: line.closingBookValue,
              accumulatedDep: {
                increment: line.depreciationAmount,
              },
            },
          });

          await tx.assetEvent.create({
            data: {
              companyId,
              fixedAssetId: line.fixedAssetId,
              eventType: "DEPRECIATION",
              eventDate: periodEnd,
              amount: line.depreciationAmount,
              remarks: `Depreciation run ${runNumber}: ₹${line.depreciationAmount.toLocaleString("en-IN")} (${line.daysDepreciated} days)`,
              referenceType: "DEPRECIATION_RUN",
              referenceId: run.id,
              createdBy: actor,
            },
          });
        }
      }

      // 4. Audit log entry
      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "FIXED_ASSET_DEPRECIATION_RUN",
        entityType: "DepreciationRun",
        entityId: run.id,
        entityNumber: run.runNumber,
        amountAfter: preview.totalDepreciation,
        summary: `Posted depreciation run ${run.runNumber} for ${preview.assetCount} assets (₹${preview.totalDepreciation.toLocaleString("en-IN")})`,
        after: {
          runNumber: run.runNumber,
          totalDepreciation: preview.totalDepreciation,
          assetCount: preview.assetCount,
          journalId,
        },
      });

      return run;
    });

    return result;
  }

  /**
   * Reverse a depreciation run and restore previous book values
   */
  public static async reverseDepreciationRun(
    companyId: number,
    runId: number,
    reason: string,
    actor = "system"
  ) {
    const run = await prisma.depreciationRun.findFirst({
      where: { id: runId, companyId },
      include: {
        lines: true,
      },
    });

    if (!run) {
      throw new Error(`Depreciation run #${runId} not found`);
    }

    if (run.status === "REVERSED") {
      throw new Error(`Depreciation run ${run.runNumber} has already been reversed`);
    }

    // Check if there is any newer active depreciation run
    const newerRun = await prisma.depreciationRun.findFirst({
      where: {
        companyId,
        status: "POSTED",
        periodEndDate: { gt: run.periodEndDate },
      },
    });
    if (newerRun) {
      throw new Error(
        `Cannot reverse run ${run.runNumber} because subsequent run ${newerRun.runNumber} exists. Reverse newer runs first.`
      );
    }

    const reversed = await prisma.$transaction(async (tx) => {
      let reversalJournalId: number | null = null;

      // 1. Reverse the General Ledger journal entry if one existed
      if (run.journalId) {
        const originalJournal = await tx.journalEntry.findUnique({
          where: { id: run.journalId },
          include: { lines: true },
        });

        if (originalJournal) {
          const revLines = originalJournal.lines.map((l) => ({
            companyId,
            accountId: l.accountId,
            debit: l.credit, // swap debit and credit
            credit: l.debit,
            narration: `Reversal of ${originalJournal.entryNo} - ${reason}`,
            createdBy: actor,
          }));

          const revJournal = await tx.journalEntry.create({
            data: {
              companyId,
              entryNo: `REV-${run.runNumber}`,
              date: new Date(),
              narration: `Reversal of depreciation run ${run.runNumber}: ${reason}`,
              status: "POSTED",
              postedAt: new Date(),
              postedBy: actor,
              createdBy: actor,
              lines: {
                create: revLines,
              },
            },
          });
          reversalJournalId = revJournal.id;
        }
      }

      // 2. Roll back assets
      for (const line of run.lines) {
        if (line.status === "POSTED" && line.depreciationAmount > 0) {
          await tx.fixedAsset.update({
            where: { id: line.fixedAssetId },
            data: {
              currentBookValue: {
                increment: line.depreciationAmount,
              },
              accumulatedDep: {
                decrement: line.depreciationAmount,
              },
            },
          });

          await tx.assetEvent.create({
            data: {
              companyId,
              fixedAssetId: line.fixedAssetId,
              eventType: "REVERSAL",
              eventDate: new Date(),
              amount: line.depreciationAmount,
              remarks: `Reversal of depreciation run ${run.runNumber}: ${reason}`,
              referenceType: "DEPRECIATION_RUN_REVERSAL",
              referenceId: run.id,
              createdBy: actor,
            },
          });
        }
      }

      // 3. Mark run as REVERSED
      const updatedRun = await tx.depreciationRun.update({
        where: { id: run.id },
        data: {
          status: "REVERSED",
          reversalJournalId,
          remarks: `${run.remarks || ""} [REVERSED: ${reason}]`,
        },
      });

      // 4. Audit log entry
      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "FIXED_ASSET_DEPRECIATION_REVERSAL",
        entityType: "DepreciationRun",
        entityId: run.id,
        entityNumber: run.runNumber,
        summary: `Reversed depreciation run ${run.runNumber} (${reason})`,
      });

      return updatedRun;
    });

    return reversed;
  }

  /**
   * List all depreciation runs
   */
  public static async listRuns(companyId: number) {
    return prisma.depreciationRun.findMany({
      where: { companyId },
      include: {
        _count: { select: { lines: true } },
      },
      orderBy: { periodEndDate: "desc" },
    });
  }

  /**
   * Get run details with lines
   */
  public static async getRunById(companyId: number, runId: number) {
    return prisma.depreciationRun.findFirst({
      where: { id: runId, companyId },
      include: {
        lines: {
          include: {
            fixedAsset: {
              select: { assetCode: true, name: true, originalCost: true },
            },
          },
        },
      },
    });
  }
}
