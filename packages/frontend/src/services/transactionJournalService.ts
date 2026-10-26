import { api } from "@/lib/axios";

export interface JournalLineView {
  lineNo: number;
  id: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  role: string;
  narration?: string;
  partyName?: string;
  taxCode?: string;
  debit: number;
  credit: number;
  isReconciled: boolean;
  clearedAt?: string;
  costCentre?: string;
}

export interface TransactionJournalResult {
  transaction: {
    type: string;
    id: number;
    documentNo: string;
    date: string;
    partyName?: string;
    partyGstin?: string;
    placeOfSupply?: string;
    status: string;
    totalAmount: number;
    currentRevision: number;
    selectedRevision: number;
  };
  isPostingDocument: boolean;
  nonPostingReason?: string;
  revisions: Array<{
    revision: number;
    date: string;
    postedBy: string;
    status: string;
    journalEntryId: number;
  }>;
  activeJournalEntry?: {
    id: number;
    entryNo: string;
    date: string;
    narration: string;
    status: string;
    isReversal: boolean;
    reversalOf?: number | null;
  };
  lines: JournalLineView[];
  reversalLines?: JournalLineView[];
  totals: {
    debit: number;
    credit: number;
    isBalanced: boolean;
    difference: number;
  };
  relatedTransactions?: Array<{
    type: string;
    id: number;
    documentNo: string;
    date: string;
    amount: number;
    status: string;
  }>;
}

export interface BulkJournalEntry {
  id: number;
  entryNo: string;
  date: string;
  narration: string;
  status: string;
  sourceType: string;
  sourceId: number;
  isReversal: boolean;
  debitTotal: number;
  creditTotal: number;
  lines: JournalLineView[];
}

export interface BulkJournalReportResult {
  entries: BulkJournalEntry[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  nextCursor?: number;
}

export const transactionJournalService = {
  async getTransactionJournal(type: string, id: number | string, revision?: number) {
    const response = await api.get(`/transactions/${type}/${id}/journal`, {
      params: revision ? { revision } : undefined,
    });
    return response.data.data as TransactionJournalResult;
  },

  async getJournalReport(params: {
    from?: string;
    to?: string;
    types?: string[];
    accountId?: number;
    partyName?: string;
    status?: string;
    cursor?: number;
    limit?: number;
  }) {
    const response = await api.get("/reports/journal", {
      params: {
        ...params,
        types: params.types ? params.types.join(",") : undefined,
      },
    });
    return response.data.data as BulkJournalReportResult;
  },
};
