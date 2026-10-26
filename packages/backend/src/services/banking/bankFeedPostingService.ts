import { prisma } from "../../lib/prisma";
import { resolveAccountingAccounts, upsertPostedJournalForSource } from "../../lib/accounting";

export interface CategorizeLineInput {
  type: "DEPOSIT" | "EXPENSE" | "CUSTOMER_PAYMENT" | "VENDOR_PAYMENT" | "TRANSFER" | "JOURNAL";
  payee?: string;
  payeeId?: number;
  accountId: number;
  taxRate?: number;
  isRcm?: boolean;
  itcEligibility?: "ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5";
  tdsSection?: string;
  tdsAmount?: number;
  targetBankAccountId?: number; // For transfers
  memo?: string;
  splits?: Array<{
    accountId: number;
    amount: number;
    taxRate?: number;
    memo?: string;
  }>;
}

export class BankFeedPostingService {
  /**
   * One-Click "Add" pipeline: creates accounting effect & transitions feed line to CATEGORIZED
   */
  static async categorizeAndAdd(
    companyId: number,
    feedLineId: number,
    input: CategorizeLineInput,
    actor: string
  ): Promise<{ transactionId: number; transactionType: string }> {
    return prisma.$transaction(async (tx) => {
      const line = await tx.bankFeedLine.findFirst({
        where: { id: feedLineId, companyId },
        include: { bankAccount: true },
      });
      if (!line) throw new Error("Bank feed line not found");
      if (line.status === "CATEGORIZED") throw new Error("This bank line has already been categorized");

      const bankAcc = line.bankAccount;
      if (!bankAcc.accountId) {
        throw new Error(`Bank account '${bankAcc.bankName}' has no Chart of Accounts ledger assigned.`);
      }

      const isMoneyIn = line.credit > 0;
      const totalAmount = isMoneyIn ? line.credit : line.debit;
      let transactionId = 0;
      let transactionType = input.type;

      // Handle 1: Contra Transfer
      if (input.type === "TRANSFER") {
        if (!input.targetBankAccountId) throw new Error("Please specify destination/source bank account for transfer");
        const targetAcc = await tx.bankAccount.findFirst({
          where: { id: input.targetBankAccountId, companyId },
        });
        if (!targetAcc || !targetAcc.accountId) throw new Error("Target bank account or its GL mapping not found");

        const journalLines = isMoneyIn
          ? [
              { accountId: bankAcc.accountId, debit: totalAmount, narration: `Transfer from ${targetAcc.accountName || targetAcc.bankName}` },
              { accountId: targetAcc.accountId, credit: totalAmount, narration: `Transfer to ${bankAcc.accountName || bankAcc.bankName}` },
            ]
          : [
              { accountId: targetAcc.accountId, debit: totalAmount, narration: `Transfer from ${bankAcc.accountName || bankAcc.bankName}` },
              { accountId: bankAcc.accountId, credit: totalAmount, narration: `Transfer to ${targetAcc.accountName || targetAcc.bankName}` },
            ];

        const jnl = await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey: `BANK_FEED_XFER:${line.id}`,
          entryPrefix: "TRF",
          date: new Date(line.txnDate),
          narration: input.memo || `Contra Transfer between ${bankAcc.bankName} and ${targetAcc.bankName}`,
          actor,
          lines: journalLines,
        });

        transactionId = jnl?.id || 0;
        transactionType = "TRANSFER";
      }

      // Handle 2: Direct Expense or Deposit (with optional GST posting)
      else if (input.type === "EXPENSE" || input.type === "DEPOSIT" || input.type === "JOURNAL") {
        const isExp = input.type === "EXPENSE" || (!isMoneyIn && input.type !== "DEPOSIT");
        const splits = input.splits && input.splits.length > 0
          ? input.splits
          : [{ accountId: input.accountId, amount: totalAmount, taxRate: input.taxRate || 0, memo: input.memo }];

        const journalLines: Array<{ accountId: number; debit?: number; credit?: number; narration?: string }> = [];

        // Bank side line
        if (isExp) {
          journalLines.push({
            accountId: bankAcc.accountId,
            credit: totalAmount,
            narration: input.memo || line.descriptionRaw,
          });
        } else {
          journalLines.push({
            accountId: bankAcc.accountId,
            debit: totalAmount,
            narration: input.memo || line.descriptionRaw,
          });
        }

        // Category & GST side lines
        for (const sp of splits) {
          const rate = sp.taxRate || 0;
          let netAmount = sp.amount;
          let gstAmount = 0;

          if (rate > 0) {
            netAmount = Math.round((sp.amount / (1 + rate / 100)) * 100) / 100;
            gstAmount = Math.round((sp.amount - netAmount) * 100) / 100;
          }

          if (isExp) {
            journalLines.push({
              accountId: sp.accountId,
              debit: netAmount,
              narration: sp.memo || line.descriptionRaw,
            });
            if (gstAmount > 0) {
              const accounts = await resolveAccountingAccounts(tx, companyId, actor);
              journalLines.push({
                accountId: accounts.inputCgstId || accounts.cashId,
                debit: gstAmount,
                narration: `ITC GST ${rate}% on ${line.descriptionRaw}`,
              });
            }
          } else {
            journalLines.push({
              accountId: sp.accountId,
              credit: netAmount,
              narration: sp.memo || line.descriptionRaw,
            });
            if (gstAmount > 0) {
              const accounts = await resolveAccountingAccounts(tx, companyId, actor);
              journalLines.push({
                accountId: accounts.outputCgstId || accounts.cashId,
                credit: gstAmount,
                narration: `Output GST ${rate}% on ${line.descriptionRaw}`,
              });
            }
          }
        }

        const jnl = await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey: `BANK_FEED:${line.id}`,
          entryPrefix: isExp ? "EXP" : "DEP",
          date: new Date(line.txnDate),
          narration: input.memo || `${input.payee ? input.payee + ": " : ""}${line.descriptionRaw}`,
          actor,
          lines: journalLines,
        });

        transactionId = jnl?.id || 0;
      }

      // Handle 3: Customer Payment (Receivable allocation)
      else if (input.type === "CUSTOMER_PAYMENT") {
        const payment = await tx.payment.create({
          data: {
            companyId,
            customerId: input.payeeId || undefined,
            type: "CUSTOMER_PAYMENT",
            date: new Date(line.txnDate),
            mode: "BANK",
            amount: totalAmount,
            reference: line.reference || line.descriptionRaw,
            notes: input.memo || "Bank feed customer receipt",
            createdBy: actor,
          },
        });

        const accounts = await resolveAccountingAccounts(tx, companyId, actor);
        await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey: `PAYMENT:${payment.id}`,
          entryPrefix: "RCP",
          date: new Date(line.txnDate),
          narration: `Customer payment: ${input.payee || line.descriptionRaw}`,
          actor,
          lines: [
            { accountId: bankAcc.accountId, debit: totalAmount, narration: "Bank Receipt" },
            { accountId: accounts.receivableId, credit: totalAmount, narration: input.payee || "Accounts Receivable" },
          ],
        });

        transactionId = payment.id;
      }

      // Handle 4: Vendor Payment (Payable allocation)
      else if (input.type === "VENDOR_PAYMENT") {
        const payment = await tx.payment.create({
          data: {
            companyId,
            supplierId: input.payeeId || undefined,
            type: "VENDOR_PAYMENT",
            date: new Date(line.txnDate),
            mode: "BANK",
            amount: totalAmount,
            reference: line.reference || line.descriptionRaw,
            notes: input.memo || "Bank feed supplier payment",
            createdBy: actor,
          },
        });

        const accounts = await resolveAccountingAccounts(tx, companyId, actor);
        await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey: `PAYMENT:${payment.id}`,
          entryPrefix: "PMT",
          date: new Date(line.txnDate),
          narration: `Supplier payment: ${input.payee || line.descriptionRaw}`,
          actor,
          lines: [
            { accountId: accounts.payableId, debit: totalAmount, narration: input.payee || "Accounts Payable" },
            { accountId: bankAcc.accountId, credit: totalAmount, narration: "Bank Payment" },
          ],
        });

        transactionId = payment.id;
      }

      // Transition Bank Feed line state
      await tx.bankFeedLine.update({
        where: { id: feedLineId },
        data: {
          status: "CATEGORIZED",
          linkedTransactionId: transactionId,
          linkedTransactionType: transactionType,
          reviewedBy: actor,
          reviewedAt: new Date(),
          notes: input.memo,
        },
      });

      // Update book balance
      const newBookBalance = Number(bankAcc.bookBalance) + (isMoneyIn ? totalAmount : -totalAmount);
      await tx.bankAccount.update({
        where: { id: bankAcc.id },
        data: {
          bookBalance: newBookBalance,
          unreconciledCount: { decrement: 1 },
        },
      });

      return { transactionId, transactionType };
    });
  }

  /**
   * Matches a bank feed line to existing book document(s)
   */
  static async matchFeedLine(
    companyId: number,
    feedLineId: number,
    matches: Array<{ documentType: string; documentId: number; amount: number }>,
    actor: string
  ): Promise<{ matchedCount: number }> {
    return prisma.$transaction(async (tx) => {
      const line = await tx.bankFeedLine.findFirst({
        where: { id: feedLineId, companyId },
        include: { bankAccount: true },
      });
      if (!line) throw new Error("Feed line not found");

      for (const m of matches) {
        await tx.bankFeedLineMatch.create({
          data: {
            companyId,
            feedLineId,
            documentType: m.documentType,
            documentId: m.documentId,
            allocatedAmount: m.amount,
            confidenceScore: 100,
          },
        });
      }

      await tx.bankFeedLine.update({
        where: { id: feedLineId },
        data: {
          status: "MATCHED",
          linkedTransactionId: matches[0]?.documentId,
          linkedTransactionType: matches[0]?.documentType,
          reviewedBy: actor,
          reviewedAt: new Date(),
        },
      });

      await tx.bankAccount.update({
        where: { id: line.bankAccountId },
        data: { unreconciledCount: { decrement: 1 } },
      });

      return { matchedCount: matches.length };
    });
  }

  /**
   * Excludes a bank feed line
   */
  static async excludeFeedLine(
    companyId: number,
    feedLineId: number,
    reason: string,
    actor: string
  ): Promise<void> {
    const line = await prisma.bankFeedLine.findFirst({
      where: { id: feedLineId, companyId },
    });
    if (!line) throw new Error("Feed line not found");

    await prisma.$transaction(async (tx) => {
      await tx.bankFeedLine.update({
        where: { id: feedLineId },
        data: {
          status: "EXCLUDED",
          excludeReason: reason,
          reviewedBy: actor,
          reviewedAt: new Date(),
        },
      });

      await tx.bankAccount.update({
        where: { id: line.bankAccountId },
        data: { unreconciledCount: { decrement: 1 } },
      });
    });
  }

  /**
   * Undoes a categorized or excluded feed line back to FOR_REVIEW
   */
  static async undoFeedLine(companyId: number, feedLineId: number, actor: string): Promise<void> {
    return prisma.$transaction(async (tx) => {
      const line = await tx.bankFeedLine.findFirst({
        where: { id: feedLineId, companyId },
        include: { bankAccount: true },
      });
      if (!line) throw new Error("Feed line not found");
      if (line.status === "FOR_REVIEW") throw new Error("Line is already in For Review status");

      // If categorized with created journal, delete created journal
      if (line.status === "CATEGORIZED" && line.linkedTransactionId) {
        const jnlKey = `BANK_FEED:${line.id}`;
        const xferKey = `BANK_FEED_XFER:${line.id}`;
        await tx.journalEntry.deleteMany({
          where: {
            companyId,
            OR: [
              { narration: { contains: jnlKey } },
              { narration: { contains: xferKey } },
              { id: line.linkedTransactionId },
            ],
          },
        });

        // Revert book balance
        const isMoneyIn = line.credit > 0;
        const totalAmount = isMoneyIn ? line.credit : line.debit;
        const revertedBookBalance = Number(line.bankAccount.bookBalance) - (isMoneyIn ? totalAmount : -totalAmount);

        await tx.bankAccount.update({
          where: { id: line.bankAccountId },
          data: { bookBalance: revertedBookBalance },
        });
      }

      // Delete matches if matched
      if (line.status === "MATCHED") {
        await tx.bankFeedLineMatch.deleteMany({ where: { feedLineId } });
      }

      // Revert line to FOR_REVIEW
      await tx.bankFeedLine.update({
        where: { id: feedLineId },
        data: {
          status: "FOR_REVIEW",
          excludeReason: null,
          linkedTransactionId: null,
          linkedTransactionType: null,
          reviewedBy: null,
          reviewedAt: null,
        },
      });

      await tx.bankAccount.update({
        where: { id: line.bankAccountId },
        data: { unreconciledCount: { increment: 1 } },
      });
    });
  }
}
