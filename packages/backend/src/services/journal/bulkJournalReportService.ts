import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export interface BulkJournalFilter {
  from?: string;
  to?: string;
  types?: string[];
  accountId?: number;
  partyName?: string;
  status?: string;
  cursor?: number;
  limit?: number;
}

export class BulkJournalReportService {
  static async getJournalReport(companyId: number, filters: BulkJournalFilter) {
    const limit = Math.min(filters.limit || 50, 200);

    const where: Prisma.JournalEntryWhereInput = {
      companyId,
    };

    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    if (filters.types && filters.types.length > 0) {
      where.OR = filters.types.map((t) => ({
        type: { startsWith: `${t.toUpperCase()}:` },
      }));
    }

    if (filters.accountId) {
      where.lines = {
        some: { accountId: filters.accountId },
      };
    }

    if (filters.partyName) {
      where.narration = { contains: filters.partyName, mode: "insensitive" };
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(filters.cursor
        ? {
            cursor: { id: filters.cursor },
            skip: 1,
          }
        : {}),
    });

    let nextCursor: number | undefined = undefined;
    if (entries.length > limit) {
      const next = entries.pop();
      nextCursor = next?.id;
    }

    // Collect all account IDs
    const accountIds = Array.from(
      new Set(entries.flatMap((e) => e.lines.map((l) => l.accountId)))
    );
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds }, companyId },
      select: { id: true, code: true, name: true, type: true, group: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    let overallDebit = 0;
    let overallCredit = 0;

    const grouped = entries.map((entry) => {
      let entryDebit = 0;
      let entryCredit = 0;

      const lines = entry.lines.map((l, idx) => {
        const acc = accountMap.get(l.accountId);
        const debit = Number(l.debit);
        const credit = Number(l.credit);
        entryDebit += debit;
        entryCredit += credit;

        return {
          lineNo: idx + 1,
          id: l.id,
          accountId: l.accountId,
          accountCode: acc?.code || `${l.accountId}`,
          accountName: acc?.name || "General Ledger",
          accountType: acc?.type || "Asset",
          narration: l.narration || undefined,
          debit,
          credit,
          isReconciled: Boolean(l.reconciliationId),
        };
      });

      overallDebit += entryDebit;
      overallCredit += entryCredit;

      // Extract transaction type and id from type if present (e.g. INVOICE:42)
      let sourceType = "JOURNAL";
      let sourceId = entry.id;
      if (entry.type && entry.type.includes(":")) {
        const parts = entry.type.split(":");
        sourceType = parts[0];
        sourceId = Number(parts[1]) || entry.id;
      }

      return {
        id: entry.id,
        entryNo: entry.entryNo,
        date: new Date(entry.date).toISOString().slice(0, 10),
        narration: entry.narration,
        status: entry.status,
        sourceType,
        sourceId,
        isReversal: Boolean(entry.reversalOf),
        debitTotal: Math.round(entryDebit * 100) / 100,
        creditTotal: Math.round(entryCredit * 100) / 100,
        lines,
      };
    });

    return {
      entries: grouped,
      totalDebit: Math.round(overallDebit * 100) / 100,
      totalCredit: Math.round(overallCredit * 100) / 100,
      isBalanced: Math.abs(overallDebit - overallCredit) < 0.01,
      nextCursor,
    };
  }
}
