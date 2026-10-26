import { prisma } from "../../lib/prisma";
import { resolveAccountingAccounts, upsertPostedJournalForSource } from "../../lib/accounting";

export interface ReconcileBookItem {
  id: number;
  sourceType: "JOURNAL_LINE" | "FEED_LINE";
  date: string;
  reference?: string;
  payeeOrParty?: string;
  narration: string;
  amount: number;
  direction: "DEPOSIT" | "PAYMENT";
  isCleared: boolean;
  clearedAt?: string;
}

export interface ReconcileSessionData {
  reconciliationId: number;
  bankAccountId: number;
  bankAccountName: string;
  statementDate: string;
  beginningBalance: number;
  endingBalance: number;
  clearedBalance: number;
  difference: number;
  clearedDepositsCount: number;
  clearedDepositsAmount: number;
  clearedPaymentsCount: number;
  clearedPaymentsAmount: number;
  deposits: ReconcileBookItem[];
  payments: ReconcileBookItem[];
}

export class ReconciliationService {
  /**
   * Retrieves all saved reconciliations for a bank account
   */
  static async getHistory(companyId: number, bankAccountId: number) {
    return prisma.reconciliation.findMany({
      where: { companyId, bankAccountId },
      orderBy: { statementDate: "desc" },
      include: {
        items: true,
      },
    });
  }

  /**
   * Starts a new reconciliation or resumes an existing IN_PROGRESS session
   */
  static async startOrResume(
    companyId: number,
    bankAccountId: number,
    statementDateStr: string,
    endingBalance: number,
    actor: string
  ): Promise<ReconcileSessionData> {
    const bankAcc = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, companyId },
    });
    if (!bankAcc || !bankAcc.accountId) throw new Error("Bank account or GL mapping not found");

    const statementDate = new Date(statementDateStr);

    // Find previous reconciled ending balance to serve as Beginning Balance
    const latestReconciled = await prisma.reconciliation.findFirst({
      where: { companyId, bankAccountId, status: "RECONCILED" },
      orderBy: { statementDate: "desc" },
    });

    const beginningBalance = latestReconciled ? Number(latestReconciled.endingBalance) : Number(bankAcc.openingBalance);

    // Check for existing in-progress reconciliation
    let recon = await prisma.reconciliation.findFirst({
      where: { companyId, bankAccountId, status: "IN_PROGRESS" },
    });

    if (!recon) {
      recon = await prisma.reconciliation.create({
        data: {
          companyId,
          bankAccountId,
          statementDate,
          beginningBalance,
          endingBalance,
          clearedBalance: beginningBalance,
          difference: endingBalance - beginningBalance,
          status: "IN_PROGRESS",
          reconciledBy: actor,
        },
      });
    } else {
      // Update ending balance if changed
      recon = await prisma.reconciliation.update({
        where: { id: recon.id },
        data: {
          statementDate,
          endingBalance,
          difference: endingBalance - recon.clearedBalance,
        },
      });
    }

    // Fetch existing cleared items in this session
    const existingItems = await prisma.reconciliationItem.findMany({
      where: { reconciliationId: recon.id },
    });
    const clearedItemSet = new Set(existingItems.map((i) => `${i.transactionType}:${i.transactionId}`));

    // Fetch uncleared book journal lines on this bank GL account up to statement date
    const journalLines = await prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: bankAcc.accountId,
        entry: {
          date: { lte: statementDate },
        },
        OR: [
          { reconciliationId: null },
          { reconciliationId: recon.id },
        ],
      },
      include: { entry: true },
      orderBy: { entry: { date: "asc" } },
    });

    const deposits: ReconcileBookItem[] = [];
    const payments: ReconcileBookItem[] = [];

    for (const jl of journalLines) {
      const isDeposit = Number(jl.debit) > 0;
      const amt = isDeposit ? Number(jl.debit) : Number(jl.credit);
      const isCleared = clearedItemSet.has(`JOURNAL_LINE:${jl.id}`);

      const item: ReconcileBookItem = {
        id: jl.id,
        sourceType: "JOURNAL_LINE",
        date: new Date(jl.entry.date).toISOString().slice(0, 10),
        reference: jl.entry.entryNo,
        narration: jl.narration || jl.entry.narration,
        amount: amt,
        direction: isDeposit ? "DEPOSIT" : "PAYMENT",
        isCleared,
      };

      if (isDeposit) deposits.push(item);
      else payments.push(item);
    }

    // Also fetch categorized feed lines that haven't been reconciled
    const feedLines = await prisma.bankFeedLine.findMany({
      where: {
        companyId,
        bankAccountId,
        status: { in: ["CATEGORIZED", "MATCHED"] },
        txnDate: { lte: statementDate },
      },
      take: 200,
    });

    for (const fl of feedLines) {
      // If feed line already created a journal line, skip duplicate representation
      if (fl.linkedTransactionType === "JOURNAL" || fl.linkedTransactionType === "EXPENSE") {
        continue;
      }

      const isDeposit = Number(fl.credit) > 0;
      const amt = isDeposit ? Number(fl.credit) : Number(fl.debit);
      const isCleared = clearedItemSet.has(`FEED_LINE:${fl.id}`);

      const item: ReconcileBookItem = {
        id: fl.id,
        sourceType: "FEED_LINE",
        date: new Date(fl.txnDate).toISOString().slice(0, 10),
        reference: fl.reference || undefined,
        payeeOrParty: fl.payeeHint || undefined,
        narration: fl.descriptionRaw,
        amount: amt,
        direction: isDeposit ? "DEPOSIT" : "PAYMENT",
        isCleared,
      };

      if (isDeposit) deposits.push(item);
      else payments.push(item);
    }

    // Compute live balances
    const clearedDeposits = deposits.filter((d) => d.isCleared);
    const clearedPayments = payments.filter((p) => p.isCleared);

    const clearedDepositsSum = clearedDeposits.reduce((acc, d) => acc + d.amount, 0);
    const clearedPaymentsSum = clearedPayments.reduce((acc, p) => acc + p.amount, 0);

    const clearedBalance = beginningBalance + clearedDepositsSum - clearedPaymentsSum;
    const difference = endingBalance - clearedBalance;

    return {
      reconciliationId: recon.id,
      bankAccountId,
      bankAccountName: `${bankAcc.bankName} - ${bankAcc.accountName || ""}`,
      statementDate: statementDate.toISOString().slice(0, 10),
      beginningBalance,
      endingBalance,
      clearedBalance,
      difference: Math.round(difference * 100) / 100,
      clearedDepositsCount: clearedDeposits.length,
      clearedDepositsAmount: clearedDepositsSum,
      clearedPaymentsCount: clearedPayments.length,
      clearedPaymentsAmount: clearedPaymentsSum,
      deposits,
      payments,
    };
  }

  /**
   * Toggles or updates cleared items in an in-progress reconciliation
   */
  static async updateClearedItems(
    companyId: number,
    reconciliationId: number,
    clearedItems: Array<{ sourceType: "JOURNAL_LINE" | "FEED_LINE"; id: number; amount: number; direction: "DEPOSIT" | "PAYMENT" }>
  ) {
    return prisma.$transaction(async (tx) => {
      const recon = await tx.reconciliation.findFirst({
        where: { id: reconciliationId, companyId, status: "IN_PROGRESS" },
      });
      if (!recon) throw new Error("In-progress reconciliation session not found");

      // Replace existing items
      await tx.reconciliationItem.deleteMany({ where: { reconciliationId } });

      let depCount = 0;
      let depSum = 0;
      let pmtCount = 0;
      let pmtSum = 0;

      for (const item of clearedItems) {
        await tx.reconciliationItem.create({
          data: {
            companyId,
            reconciliationId,
            transactionType: item.sourceType,
            transactionId: item.id,
            amount: item.amount,
            direction: item.direction,
          },
        });

        if (item.direction === "DEPOSIT") {
          depCount += 1;
          depSum += item.amount;
        } else {
          pmtCount += 1;
          pmtSum += item.amount;
        }
      }

      const clearedBalance = recon.beginningBalance + depSum - pmtSum;
      const difference = Math.round((recon.endingBalance - clearedBalance) * 100) / 100;

      await tx.reconciliation.update({
        where: { id: reconciliationId },
        data: {
          clearedBalance,
          difference,
          clearedDepositsCount: depCount,
          clearedDepositsAmount: depSum,
          clearedPaymentsCount: pmtCount,
          clearedPaymentsAmount: pmtSum,
        },
      });

      return { clearedBalance, difference };
    });
  }

  /**
   * Finishes reconciliation: locks cleared lines, handles discrepancy journal if requested
   */
  static async finish(
    companyId: number,
    reconciliationId: number,
    autoAdjust: boolean,
    actor: string
  ) {
    return prisma.$transaction(async (tx) => {
      const recon = await tx.reconciliation.findFirst({
        where: { id: reconciliationId, companyId, status: "IN_PROGRESS" },
        include: { bankAccount: true },
      });
      if (!recon) throw new Error("In-progress reconciliation not found");

      let finalDiff = recon.difference;
      let autoAdjustJournalId: number | undefined;

      // Handle difference
      if (Math.abs(finalDiff) > 0.01) {
        if (!autoAdjust) {
          throw new Error(`Reconciliation difference is ₹${finalDiff}. Difference must be 0.00 to finish, or auto-adjustment must be approved.`);
        }

        // Post auto-adjustment journal to Reconciliation Discrepancy
        const accounts = await resolveAccountingAccounts(tx, companyId, actor);
        const bankGl = recon.bankAccount.accountId!;

        const isPositive = finalDiff > 0;
        const absDiff = Math.abs(finalDiff);

        const jnl = await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey: `RECON_ADJUST:${recon.id}`,
          entryPrefix: "REC",
          date: new Date(recon.statementDate),
          narration: `Bank Reconciliation auto-adjustment for ${recon.bankAccount.bankName} statement ending ${recon.statementDate.toISOString().slice(0, 10)}`,
          actor,
          lines: isPositive
            ? [
                { accountId: bankGl, debit: absDiff, narration: "Reconciliation discrepancy adjustment" },
                { accountId: accounts.cashId, credit: absDiff, narration: "Reconciliation Discrepancy Account" },
              ]
            : [
                { accountId: accounts.cashId, debit: absDiff, narration: "Reconciliation Discrepancy Account" },
                { accountId: bankGl, credit: absDiff, narration: "Reconciliation discrepancy adjustment" },
              ],
        });

        autoAdjustJournalId = jnl?.id || 0;
        finalDiff = 0;
      }

      // Mark cleared items on the actual JournalLines
      const items = await tx.reconciliationItem.findMany({
        where: { reconciliationId },
      });

      for (const it of items) {
        if (it.transactionType === "JOURNAL_LINE") {
          await tx.journalLine.update({
            where: { id: it.transactionId },
            data: {
              reconciliationId: recon.id,
              clearedAt: new Date(),
            },
          });
        }
      }

      // Lock reconciliation record
      await tx.reconciliation.update({
        where: { id: reconciliationId },
        data: {
          status: "RECONCILED",
          difference: 0,
          autoAdjustmentAmount: recon.difference,
          autoAdjustmentJournalId: autoAdjustJournalId,
          reconciledBy: actor,
          reconciledAt: new Date(),
        },
      });

      return { success: true, autoAdjustmentJournalId: autoAdjustJournalId };
    });
  }

  /**
   * Undoes a reconciliation (latest first)
   */
  static async undo(companyId: number, reconciliationId: number, actor: string) {
    return prisma.$transaction(async (tx) => {
      const recon = await tx.reconciliation.findFirst({
        where: { id: reconciliationId, companyId, status: "RECONCILED" },
      });
      if (!recon) throw new Error("Reconciliation not found or not in RECONCILED status");

      // Verify this is the latest reconciliation for the account
      const laterRecon = await tx.reconciliation.findFirst({
        where: {
          companyId,
          bankAccountId: recon.bankAccountId,
          status: "RECONCILED",
          statementDate: { gt: recon.statementDate },
        },
      });

      if (laterRecon) {
        throw new Error(
          `Cannot undo statement dated ${recon.statementDate.toISOString().slice(0, 10)}. You must undo the latest reconciliation dated ${laterRecon.statementDate.toISOString().slice(0, 10)} first.`
        );
      }

      // Unlock journal lines
      await tx.journalLine.updateMany({
        where: { reconciliationId: recon.id },
        data: {
          reconciliationId: null,
          clearedAt: null,
        },
      });

      // Delete auto-adjustment journal if one was created
      if (recon.autoAdjustmentJournalId) {
        await tx.journalEntry.deleteMany({
          where: { id: recon.autoAdjustmentJournalId, companyId },
        });
      }

      // Update status to UNDONE
      await tx.reconciliation.update({
        where: { id: recon.id },
        data: {
          status: "UNDONE",
          notes: `Undone by ${actor} on ${new Date().toISOString()}`,
        },
      });

      return { undone: true };
    });
  }
}
