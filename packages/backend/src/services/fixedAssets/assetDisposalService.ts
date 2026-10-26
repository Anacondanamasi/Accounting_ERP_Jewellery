import { prisma } from "../../lib/prisma";
import { calculateBooksDepreciation } from "./booksDepreciationEngine";
import { AuditService } from "../audit/auditService";

export interface AssetDisposalInput {
  disposalDate: Date | string;
  disposalAmount: number; // Sale price / realization (0 if scrapped/destroyed)
  disposalReason: "SOLD" | "SCRAPPED" | "DESTROYED" | "DONATED";
  buyerPartyName?: string;
  buyerGstin?: string;
  gstRate?: number; // GST % charged on sale (e.g. 18, 12, 5, 0)
  disposalInvoiceNo?: string;
  remarks?: string;
  depreciateUpToDate?: boolean; // Compute pro-rata depreciation from last run to disposal date
}

export class AssetDisposalService {
  /**
   * Rule 43 (CGST Rules): Calculate capital goods ITC reversal if disposed within 5 years (60 months).
   */
  public static calculateRule43Reversal(
    dateOfPurchase: Date,
    disposalDate: Date,
    eligibleItcClaimed: number
  ): { monthsUsed: number; monthsRemaining: number; reversalAmount: number } {
    if (eligibleItcClaimed <= 0) {
      return { monthsUsed: 60, monthsRemaining: 0, reversalAmount: 0 };
    }

    const start = new Date(dateOfPurchase);
    const end = new Date(disposalDate);
    const diffMonths =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const monthsUsed = Math.max(0, Math.min(60, diffMonths));
    const monthsRemaining = Math.max(0, 60 - monthsUsed);

    const reversalAmount = Math.round(((eligibleItcClaimed * monthsRemaining) / 60) * 100) / 100;

    return {
      monthsUsed,
      monthsRemaining,
      reversalAmount,
    };
  }

  /**
   * Preview asset disposal financials (pro-rata depr, gain/loss, GST & Rule 43 comparison)
   */
  public static async previewDisposal(
    companyId: number,
    assetId: number,
    input: AssetDisposalInput
  ) {
    const asset = await prisma.fixedAsset.findFirst({
      where: { id: assetId, companyId },
      include: { category: true, taxBlock: true },
    });

    if (!asset) {
      throw new Error(`Fixed asset #${assetId} not found`);
    }

    if (asset.isDisposed || asset.status === "DISPOSED") {
      throw new Error(`Asset ${asset.assetCode} has already been disposed`);
    }

    const dispDate = new Date(input.disposalDate);
    let interimDepreciation = 0;

    // Check if pro-rata depreciation up to disposal date is requested
    if (input.depreciateUpToDate) {
      const lastRun = await prisma.depreciationRun.findFirst({
        where: { companyId, status: "POSTED" },
        orderBy: { periodEndDate: "desc" },
      });
      const startDate = lastRun ? new Date(lastRun.periodEndDate) : asset.datePutToUse;

      if (dispDate > startDate) {
        const calc = calculateBooksDepreciation({
          cost: asset.originalCost,
          salvageValue: asset.salvageValue,
          usefulLifeYears: asset.usefulLifeYears,
          depreciationMethod: asset.depreciationMethod as "SLM" | "WDV",
          datePutToUse: asset.datePutToUse,
          openingBookValue: asset.currentBookValue,
          periodStartDate: startDate,
          periodEndDate: dispDate,
        });
        interimDepreciation = calc.depreciationAmount;
      }
    }

    const netBookValueAtDisposal = Math.max(
      0,
      Math.round((asset.currentBookValue - interimDepreciation) * 100) / 100
    );
    const totalAccumulatedDepAtDisposal = Math.round(
      (asset.accumulatedDep + interimDepreciation) * 100
    ) / 100;

    const disposalAmount = Math.max(0, Math.round(Number(input.disposalAmount) * 100) / 100);
    const gstRate = input.gstRate ?? 18;
    const gstOnSale = Math.round(((disposalAmount * gstRate) / 100) * 100) / 100;

    // Rule 43 calculation
    const rule43 = this.calculateRule43Reversal(
      asset.dateOfPurchase,
      dispDate,
      asset.eligibleItcGst
    );

    // Section 18(6) comparison: Tax payable is higher of GST on sale or Rule 43 pro-rata reversal
    const higherStatutoryGst = Math.max(gstOnSale, rule43.reversalAmount);

    const gainLoss = Math.round((disposalAmount - netBookValueAtDisposal) * 100) / 100;

    return {
      assetId: asset.id,
      assetCode: asset.assetCode,
      assetName: asset.name,
      originalCost: asset.originalCost,
      currentBookValue: asset.currentBookValue,
      interimDepreciation,
      netBookValueAtDisposal,
      totalAccumulatedDepAtDisposal,
      disposalAmount,
      gstRate,
      gstOnSale,
      rule43ReversalAmount: rule43.reversalAmount,
      rule43MonthsRemaining: rule43.monthsRemaining,
      higherStatutoryGst,
      gainLoss,
      isProfit: gainLoss > 0,
      isLoss: gainLoss < 0,
    };
  }

  /**
   * Process asset disposal, post journal entry and update books & tax schedules
   */
  public static async disposeAsset(
    companyId: number,
    assetId: number,
    input: AssetDisposalInput,
    actor = "system"
  ) {
    const preview = await this.previewDisposal(companyId, assetId, input);

    const asset = await prisma.fixedAsset.findFirst({
      where: { id: assetId, companyId },
      include: { category: true },
    });
    if (!asset) throw new Error("Asset not found");

    const dispDate = new Date(input.disposalDate);

    // Accounts resolution
    const accounts = await prisma.account.findMany({
      where: { companyId },
    });
    const accByCode = new Map<string, number>();
    for (const a of accounts) accByCode.set(a.code, a.id);

    // Bank / Receivable account
    const bankAccountId = accByCode.get("1002") || accByCode.get("1100") || asset.category.assetAccountId;
    // GST Output account
    const gstAccountId = accByCode.get("2203") || accByCode.get("2201"); // IGST or CGST
    // Profit on sale
    const profitAccountId = accByCode.get("4201");
    // Loss on sale
    const lossAccountId = accByCode.get("5201") || asset.category.gainLossAccountId;

    const result = await prisma.$transaction(async (tx) => {
      // 1. If interim depreciation was applied, post interim dep
      if (preview.interimDepreciation > 0) {
        await tx.assetCostComponent.updateMany({
          where: { fixedAssetId: assetId },
          data: {
            capitalizedCost: { decrement: preview.interimDepreciation },
          },
        });
      }

      // 2. Build balanced journal entry for disposal
      // Lines:
      // Dr Bank / AR (Total realization + GST)
      // Dr Accumulated Depreciation (Reverses total accumulated depr)
      // Dr Loss on Sale (if loss)
      // Cr Asset Gross Block (Reverses original cost)
      // Cr GST Output Payable (if GST)
      // Cr Profit on Sale (if profit)

      const journalLines: any[] = [];
      const totalReceivable = Math.round((preview.disposalAmount + preview.gstOnSale) * 100) / 100;

      if (totalReceivable > 0) {
        journalLines.push({
          companyId,
          accountId: bankAccountId,
          debit: totalReceivable,
          credit: 0,
          narration: `Sale proceeds of ${asset.assetCode} (${input.disposalInvoiceNo || "Disposal"})`,
          createdBy: actor,
        });
      }

      if (preview.totalAccumulatedDepAtDisposal > 0) {
        journalLines.push({
          companyId,
          accountId: asset.category.accumulatedDepAccountId,
          debit: preview.totalAccumulatedDepAtDisposal,
          credit: 0,
          narration: `Derecognition of accum dep on ${asset.assetCode}`,
          createdBy: actor,
        });
      }

      if (preview.isLoss && lossAccountId) {
        journalLines.push({
          companyId,
          accountId: lossAccountId,
          debit: Math.abs(preview.gainLoss),
          credit: 0,
          narration: `Loss on disposal of ${asset.assetCode}`,
          createdBy: actor,
        });
      }

      // Credits:
      journalLines.push({
        companyId,
        accountId: asset.category.assetAccountId,
        debit: 0,
        credit: asset.originalCost,
        narration: `Derecognition of gross block on ${asset.assetCode}`,
        createdBy: actor,
      });

      if (preview.gstOnSale > 0 && gstAccountId) {
        journalLines.push({
          companyId,
          accountId: gstAccountId,
          debit: 0,
          credit: preview.gstOnSale,
          narration: `GST liability on sale of ${asset.assetCode}`,
          createdBy: actor,
        });
      }

      if (preview.isProfit && profitAccountId) {
        journalLines.push({
          companyId,
          accountId: profitAccountId,
          debit: 0,
          credit: preview.gainLoss,
          narration: `Profit on disposal of ${asset.assetCode}`,
          createdBy: actor,
        });
      }

      let disposalJournalId: number | null = null;
      if (journalLines.length > 0) {
        const jnl = await tx.journalEntry.create({
          data: {
            companyId,
            entryNo: `DISP-${asset.assetCode}`,
            date: dispDate,
            narration: `Disposal of ${asset.assetCode} - ${asset.name} (${input.disposalReason})`,
            status: "POSTED",
            postedAt: new Date(),
            postedBy: actor,
            createdBy: actor,
            lines: {
              create: journalLines,
            },
          },
        });
        disposalJournalId = jnl.id;
      }

      // 3. Update asset status
      const updatedAsset = await tx.fixedAsset.update({
        where: { id: assetId },
        data: {
          isDisposed: true,
          status: "DISPOSED",
          disposalDate: dispDate,
          disposalAmount: preview.disposalAmount,
          disposalGstRate: preview.gstRate,
          disposalGstAmount: preview.gstOnSale,
          disposalInvoiceNo: input.disposalInvoiceNo,
          disposalGainLoss: preview.gainLoss,
          disposalJournalId,
          disposalReason: input.disposalReason,
          rule43ReversalAmount: preview.rule43ReversalAmount,
          currentBookValue: 0.0,
          accumulatedDep: preview.totalAccumulatedDepAtDisposal,
        },
      });

      // 4. Record event
      await tx.assetEvent.create({
        data: {
          companyId,
          fixedAssetId: assetId,
          eventType: "DISPOSAL",
          eventDate: dispDate,
          amount: preview.disposalAmount,
          remarks: `Asset ${input.disposalReason}. Net Gain/Loss: ₹${preview.gainLoss.toLocaleString("en-IN")}. GST: ₹${preview.gstOnSale.toLocaleString("en-IN")}. Rule 43 Reversal: ₹${preview.rule43ReversalAmount.toLocaleString("en-IN")}`,
          referenceType: "DISPOSAL",
          referenceId: disposalJournalId,
          createdBy: actor,
        },
      });

      // 5. Audit log entry
      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "FIXED_ASSET_DISPOSAL",
        entityType: "FixedAsset",
        entityId: asset.id,
        entityNumber: asset.assetCode,
        amountBefore: asset.currentBookValue,
        amountAfter: preview.disposalAmount,
        summary: `Disposed asset ${asset.assetCode} (${input.disposalReason}) for ₹${preview.disposalAmount.toLocaleString("en-IN")}. Gain/Loss: ₹${preview.gainLoss.toLocaleString("en-IN")}`,
      });

      return updatedAsset;
    });

    return result;
  }

  /**
   * Undo disposal and restore asset to ACTIVE
   */
  public static async undoDisposal(companyId: number, assetId: number, actor = "system") {
    const asset = await prisma.fixedAsset.findFirst({
      where: { id: assetId, companyId },
    });

    if (!asset || !asset.isDisposed) {
      throw new Error(`Asset #${assetId} is not disposed`);
    }

    const restored = await prisma.$transaction(async (tx) => {
      // Reverse disposal journal if it exists
      if (asset.disposalJournalId) {
        const origJournal = await tx.journalEntry.findUnique({
          where: { id: asset.disposalJournalId },
          include: { lines: true },
        });

        if (origJournal) {
          const revLines = origJournal.lines.map((l) => ({
            companyId,
            accountId: l.accountId,
            debit: l.credit,
            credit: l.debit,
            narration: `Reversal of disposal journal ${origJournal.entryNo}`,
            createdBy: actor,
          }));

          await tx.journalEntry.create({
            data: {
              companyId,
              entryNo: `REV-${origJournal.entryNo}`,
              date: new Date(),
              narration: `Undo disposal of ${asset.assetCode}`,
              status: "POSTED",
              postedAt: new Date(),
              postedBy: actor,
              createdBy: actor,
              lines: {
                create: revLines,
              },
            },
          });
        }
      }

      // Restore asset to ACTIVE
      const updated = await tx.fixedAsset.update({
        where: { id: assetId },
        data: {
          isDisposed: false,
          status: "ACTIVE",
          disposalDate: null,
          disposalAmount: null,
          disposalGstRate: null,
          disposalGstAmount: null,
          disposalInvoiceNo: null,
          disposalGainLoss: null,
          disposalJournalId: null,
          disposalReason: null,
          rule43ReversalAmount: null,
          currentBookValue: Math.max(0, asset.originalCost - asset.accumulatedDep),
        },
      });

      await tx.assetEvent.create({
        data: {
          companyId,
          fixedAssetId: assetId,
          eventType: "REVERSAL",
          eventDate: new Date(),
          amount: 0,
          remarks: `Undid disposal of asset ${asset.assetCode}. Restored to Active status.`,
          referenceType: "DISPOSAL_UNDO",
          createdBy: actor,
        },
      });

      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "FIXED_ASSET_UNDO_DISPOSAL",
        entityType: "FixedAsset",
        entityId: asset.id,
        entityNumber: asset.assetCode,
        summary: `Undid disposal of asset ${asset.assetCode}`,
      });

      return updated;
    });

    return restored;
  }
}
