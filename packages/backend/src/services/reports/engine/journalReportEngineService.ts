import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import {
  ReportQueryBuilder,
  type FilterGroup,
  type QueryPlanOptions,
} from "./reportQueryBuilder";
import { JOURNAL_FIELD_CATALOG } from "./reportFieldCatalog";

export interface JournalReportRequest {
  companyId: number;
  period?: string;
  from?: string;
  to?: string;
  dateField?: "date" | "postedAt" | "createdAt" | "updatedAt";
  filterMode?: "match_transactions" | "match_lines_only";
  layout?: "blocks" | "flat" | "summary";
  voucherProfile?: boolean;
  filters?: FilterGroup;
  columns?: string[];
  grouping?: Array<{ field: string; direction?: "asc" | "desc"; dateBucket?: string }>;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  status?: string;
  limit?: number;
  cursor?: number;
}

export interface JournalReportLine {
  id: number;
  lineNo: number;
  entryId: number;
  date: string;
  entryNo: string;
  voucherType: string;
  displayVoucherType: string;
  narration?: string;
  status: string;
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountGroup: string;
  isControlAccount: boolean;
  partyName?: string;
  debit: number;
  credit: number;
  netAmount: number;
  runningBalance?: number;
  costCentre?: string;
  taxCode?: string;
  role?: string;
  isReconciled: boolean;
  isBackdated: boolean;
  isEditedAfterPosting: boolean;
  createdBy: string;
  sourceType?: string;
  sourceId?: number;
}

export interface JournalReportBlock {
  id: number;
  entryNo: string;
  date: string;
  voucherType: string;
  displayVoucherType: string;
  narration: string;
  status: string;
  partyName?: string;
  sourceType: string;
  sourceId: number;
  isReversal: boolean;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  isPartial: boolean;
  lines: JournalReportLine[];
}

export interface JournalGroupSummary {
  groupKey: string;
  groupLabel: string;
  field: string;
  totalDebit: number;
  totalCredit: number;
  netAmount: number;
  transactionCount: number;
  lineCount: number;
  items?: JournalReportBlock[] | JournalReportLine[];
}

export interface JournalReportResponse {
  reportId: string;
  title: string;
  periodLabel: string;
  from: string;
  to: string;
  filterMode: "match_transactions" | "match_lines_only";
  layout: "blocks" | "flat" | "summary";
  voucherProfile: boolean;
  columns: string[];
  grandTotals: {
    totalDebit: number;
    totalCredit: number;
    netAmount: number;
    isBalanced: boolean;
    transactionCount: number;
    lineCount: number;
  };
  blocks?: JournalReportBlock[];
  flatLines?: JournalReportLine[];
  groupedData?: JournalGroupSummary[];
  nextCursor?: number;
  meta: {
    generatedAt: string;
    serverTimeMs: number;
    totalFilteredTransactions: number;
  };
}

const mapVoucherProfileType = (type: string, isVoucherProfile = false): string => {
  const norm = (type || "JOURNAL").toUpperCase();
  if (!isVoucherProfile) {
    if (norm === "INVOICE") return "Sales Invoice";
    if (norm === "BILL") return "Purchase Bill";
    if (norm === "PAYMENT") return "Payment / Receipt";
    if (norm === "EXPENSE") return "Expense";
    if (norm === "CREDIT_NOTE") return "Credit Note";
    if (norm === "DEBIT_NOTE") return "Debit Note";
    if (norm === "CONTRA") return "Contra Entry";
    if (norm === "DEPRECIATION") return "Asset Depreciation";
    if (norm === "DISPOSAL") return "Asset Disposal";
    return "Manual Journal";
  }

  // Tally-style Indian Accounting names
  if (norm === "INVOICE") return "Sales";
  if (norm === "BILL") return "Purchase";
  if (norm === "PAYMENT") return "Receipt / Payment";
  if (norm === "EXPENSE") return "Payment";
  if (norm === "CREDIT_NOTE") return "Credit Note";
  if (norm === "DEBIT_NOTE") return "Debit Note";
  if (norm === "CONTRA") return "Contra";
  if (norm === "DEPRECIATION" || norm === "DISPOSAL") return "Stock / Asset Journal";
  return "Journal";
};

export class JournalReportEngineService {
  /**
   * Resolves date boundaries (including Indian Financial Year).
   */
  static resolvePeriodDates(period?: string, from?: string, to?: string): { from: string; to: string; label: string } {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth(); // 0-indexed

    // Indian FY starts April 1st
    const curFyStartYear = curMonth >= 3 ? curYear : curYear - 1;

    if (period === "today") {
      const d = today.toISOString().slice(0, 10);
      return { from: d, to: d, label: "Today" };
    }
    if (period === "this_week") {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff)).toISOString().slice(0, 10);
      const sunday = new Date(d.setDate(diff + 6)).toISOString().slice(0, 10);
      return { from: monday, to: sunday, label: "This Week" };
    }
    if (period === "this_month") {
      const start = new Date(curYear, curMonth, 1).toISOString().slice(0, 10);
      const end = new Date(curYear, curMonth + 1, 0).toISOString().slice(0, 10);
      return { from: start, to: end, label: "This Month" };
    }
    if (period === "last_month") {
      const start = new Date(curYear, curMonth - 1, 1).toISOString().slice(0, 10);
      const end = new Date(curYear, curMonth, 0).toISOString().slice(0, 10);
      return { from: start, to: end, label: "Last Month" };
    }
    if (period === "this_fy") {
      const start = `${curFyStartYear}-04-01`;
      const end = `${curFyStartYear + 1}-03-31`;
      return { from: start, to: end, label: `This FY (${curFyStartYear}-${String(curFyStartYear + 1).slice(-2)})` };
    }
    if (period === "last_fy") {
      const start = `${curFyStartYear - 1}-04-01`;
      const end = `${curFyStartYear}-03-31`;
      return { from: start, to: end, label: `Last FY (${curFyStartYear - 1}-${String(curFyStartYear).slice(-2)})` };
    }

    if (from && to) {
      return { from, to, label: `${from} to ${to}` };
    }

    // Default: This Month
    const start = new Date(curYear, curMonth, 1).toISOString().slice(0, 10);
    const end = today.toISOString().slice(0, 10);
    return { from: start, to: end, label: "Custom Period" };
  }

  /**
   * Main Report Execution pipeline.
   */
  static async runReport(req: JournalReportRequest): Promise<JournalReportResponse> {
    const startTime = Date.now();
    const { companyId } = req;
    const limit = Math.min(req.limit || 100, 500);
    const filterMode = req.filterMode || "match_transactions";
    const layout = req.layout || "blocks";
    const voucherProfile = Boolean(req.voucherProfile);
    const dateField = req.dateField || "date";

    // 1. Resolve Dates
    const period = this.resolvePeriodDates(req.period, req.from, req.to);

    // 2. Validate filters
    if (req.filters) {
      ReportQueryBuilder.validateFilterTree(req.filters);
    }

    // 3. Base date criteria
    const dateFilter: Prisma.DateTimeFilter = {
      gte: new Date(period.from),
      lte: new Date(`${period.to}T23:59:59.999Z`),
    };

    const entryWhere: Prisma.JournalEntryWhereInput = {
      companyId,
      [dateField]: dateFilter,
    };

    if (req.status && req.status !== "ALL") {
      entryWhere.status = req.status.toUpperCase();
    }

    // Process additional filters
    const lineFilters: Prisma.JournalLineWhereInput[] = [];
    const accountIdsFilter: number[] = [];

    if (req.filters?.conditions) {
      for (const cond of req.filters.conditions) {
        const resolved = ReportQueryBuilder.buildConditionWhere(cond);
        if (resolved.entryWhere) {
          Object.assign(entryWhere, resolved.entryWhere);
        }
        if (resolved.lineWhere) {
          lineFilters.push(resolved.lineWhere);
        }
        if (resolved.accountWhere) {
          const matchingAccounts = await prisma.account.findMany({
            where: { companyId, ...resolved.accountWhere },
            select: { id: true },
          });
          accountIdsFilter.push(...matchingAccounts.map((a) => a.id));
        }
      }
    }

    if (accountIdsFilter.length > 0) {
      lineFilters.push({ accountId: { in: accountIdsFilter } });
    }

    // 4. Query Execution Plan
    let matchingEntryIds: number[] = [];
    let isPartialView = false;

    if (filterMode === "match_transactions") {
      // Step 1: Candidate entry identification
      const candidateWhere: Prisma.JournalEntryWhereInput = {
        ...entryWhere,
        ...(lineFilters.length > 0 ? { lines: { some: { AND: lineFilters } } } : {}),
      };

      const candidateEntries = await prisma.journalEntry.findMany({
        where: candidateWhere,
        select: { id: true },
        orderBy: [{ [dateField]: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(req.cursor ? { cursor: { id: req.cursor }, skip: 1 } : {}),
      });

      matchingEntryIds = candidateEntries.map((e) => e.id);
    } else {
      // "match_lines_only" mode: mark as partial view
      isPartialView = true;
      const candidateWhere: Prisma.JournalEntryWhereInput = {
        ...entryWhere,
        lines: { some: { AND: lineFilters } },
      };
      const candidateEntries = await prisma.journalEntry.findMany({
        where: candidateWhere,
        select: { id: true },
        orderBy: [{ [dateField]: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(req.cursor ? { cursor: { id: req.cursor }, skip: 1 } : {}),
      });
      matchingEntryIds = candidateEntries.map((e) => e.id);
    }

    let nextCursor: number | undefined = undefined;
    if (matchingEntryIds.length > limit) {
      nextCursor = matchingEntryIds.pop();
    }

    // Step 2: Fetch Journal Entries with their lines
    const entries = await prisma.journalEntry.findMany({
      where: {
        id: { in: matchingEntryIds },
        companyId,
      },
      include: {
        lines: {
          where: isPartialView && lineFilters.length > 0 ? { AND: lineFilters } : undefined,
          orderBy: { id: "asc" },
        },
      },
      orderBy: [{ [dateField]: "desc" }, { id: "desc" }],
    });

    // 5. Bulk Load Referenced Accounts
    const allAccountIds = Array.from(
      new Set(entries.flatMap((e) => e.lines.map((l) => l.accountId)))
    );
    const accounts = await prisma.account.findMany({
      where: { id: { in: allAccountIds }, companyId },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        group: true,
        isControlAccount: true,
      },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // 6. Map and Format Blocks and Lines
    let grandDebit = 0;
    let grandCredit = 0;
    let totalLineCount = 0;
    const flatLines: JournalReportLine[] = [];

    const blocks: JournalReportBlock[] = entries.map((entry) => {
      let blockDebit = 0;
      let blockCredit = 0;

      let sourceType = "JOURNAL";
      let sourceId = entry.id;
      if (entry.type && entry.type.includes(":")) {
        const parts = entry.type.split(":");
        sourceType = parts[0];
        sourceId = Number(parts[1]) || entry.id;
      }

      const entryDateStr = new Date(entry.date).toISOString().slice(0, 10);
      const isBackdated = Math.abs(new Date(entry.createdAt).getTime() - new Date(entry.date).getTime()) > 3 * 86400000;
      const isEditedAfterPosting = Boolean(entry.postedAt && entry.updatedAt.getTime() - entry.postedAt.getTime() > 60000);

      const lines: JournalReportLine[] = entry.lines.map((l, idx) => {
        const acc = accountMap.get(l.accountId);
        const debit = Number(l.debit);
        const credit = Number(l.credit);
        blockDebit += debit;
        blockCredit += credit;
        totalLineCount += 1;

        const lineObj: JournalReportLine = {
          id: l.id,
          lineNo: idx + 1,
          entryId: entry.id,
          date: entryDateStr,
          entryNo: entry.entryNo,
          voucherType: sourceType,
          displayVoucherType: mapVoucherProfileType(sourceType, voucherProfile),
          narration: l.narration || entry.narration,
          status: entry.status,
          accountId: l.accountId,
          accountCode: acc?.code || `${l.accountId}`,
          accountName: acc?.name || "General Ledger",
          accountType: acc?.type || "Asset",
          accountGroup: acc?.group || "General",
          isControlAccount: Boolean(acc?.isControlAccount),
          partyName: entry.narration || undefined,
          debit: Math.round(debit * 100) / 100,
          credit: Math.round(credit * 100) / 100,
          netAmount: Math.round((debit - credit) * 100) / 100,
          costCentre: l.costCentreId ? `CC-${l.costCentreId}` : undefined,
          isReconciled: Boolean(l.reconciliationId),
          isBackdated,
          isEditedAfterPosting,
          createdBy: entry.createdBy,
          sourceType,
          sourceId,
        };

        flatLines.push(lineObj);
        return lineObj;
      });

      grandDebit += blockDebit;
      grandCredit += blockCredit;

      return {
        id: entry.id,
        entryNo: entry.entryNo,
        date: entryDateStr,
        voucherType: sourceType,
        displayVoucherType: mapVoucherProfileType(sourceType, voucherProfile),
        narration: entry.narration,
        status: entry.status,
        partyName: entry.narration || undefined,
        sourceType,
        sourceId,
        isReversal: Boolean(entry.reversalOf),
        totalDebit: Math.round(blockDebit * 100) / 100,
        totalCredit: Math.round(blockCredit * 100) / 100,
        isBalanced: Math.abs(blockDebit - blockCredit) < 0.01,
        isPartial: isPartialView,
        lines,
      };
    });

    const activeColumns = req.columns && req.columns.length > 0
      ? req.columns
      : Object.values(JOURNAL_FIELD_CATALOG)
          .filter((f) => f.defaultVisible)
          .map((f) => f.id);

    return {
      reportId: "transaction-journal",
      title: voucherProfile ? "Day Book / Journal Register" : "Transaction Journal",
      periodLabel: period.label,
      from: period.from,
      to: period.to,
      filterMode,
      layout,
      voucherProfile,
      columns: activeColumns,
      grandTotals: {
        totalDebit: Math.round(grandDebit * 100) / 100,
        totalCredit: Math.round(grandCredit * 100) / 100,
        netAmount: Math.round((grandDebit - grandCredit) * 100) / 100,
        isBalanced: Math.abs(grandDebit - grandCredit) < 0.01,
        transactionCount: entries.length,
        lineCount: totalLineCount,
      },
      blocks: layout === "blocks" ? blocks : undefined,
      flatLines: layout === "flat" ? flatLines : undefined,
      nextCursor,
      meta: {
        generatedAt: new Date().toISOString(),
        serverTimeMs: Date.now() - startTime,
        totalFilteredTransactions: entries.length,
      },
    };
  }
}
