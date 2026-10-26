import { api } from "@/lib/axios";

export interface BankAccount {
  id: number | string;
  bankName: string;
  accountName: string;
  accountNoMasked: string;
  ifsc: string;
  accountType: "CURRENT" | "SAVINGS" | "CASH_CREDIT";
  bookBalance: number;
  bankBalance: number;
  unreconciledCount: number;
  isActive: boolean;
  accountId?: number;
}

export interface BankTransaction {
  id: number | string;
  bankAccountId: number;
  date: string;
  narration: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
  isReconciled: boolean;
  matchedJournalLineId?: number;
  source: "BANK_STATEMENT" | "BOOKS_MANUAL";
}

export interface BankFeedLine {
  id: number;
  bankAccountId: number;
  txnDate: string;
  valueDate?: string;
  descriptionRaw: string;
  descriptionNormalized: string;
  reference?: string;
  payeeHint?: string;
  debit: number;
  credit: number;
  amount: number;
  runningBalance?: number;
  currency: string;
  status: "FOR_REVIEW" | "CATEGORIZED" | "MATCHED" | "TRANSFER" | "EXCLUDED";
  excludeReason?: string;
  source: string;
  ruleId?: number;
  ruleVersion?: number;
  ruleMode?: "SUGGESTED" | "AUTO_ADDED";
  ruleApplications?: Array<{
    id: number;
    ruleId: number;
    rule?: {
      id: number;
      name: string;
      autoAdd: boolean;
    };
  }>;
  suggestedType?: string;
  suggestedPayeeId?: number;
  suggestedAccountId?: number;
  suggestedTaxRate?: number;
  suggestedConfidence?: number;
  linkedTransactionId?: number;
  linkedTransactionType?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  matches?: any[];
}

export interface MatchCandidate {
  documentType: "INVOICE" | "BILL" | "PAYMENT" | "JOURNAL" | "CONTRA_TRANSFER";
  documentId: number;
  documentNumber: string;
  partyName?: string;
  date: string;
  totalAmount: number;
  openBalance: number;
  confidence: number;
  matchReason: string;
}

export interface BankFeedResponse {
  lines: BankFeedLine[];
  counts: {
    forReview: number;
    categorized: number;
    excluded: number;
    total: number;
  };
  bankAccount: BankAccount;
}

export interface ReconciliationHistoryRow {
  id: number;
  bankAccountId: number;
  statementDate: string;
  beginningBalance: number;
  endingBalance: number;
  clearedBalance: number;
  difference: number;
  clearedDepositsCount: number;
  clearedDepositsAmount: number;
  clearedPaymentsCount: number;
  clearedPaymentsAmount: number;
  autoAdjustmentAmount: number;
  autoAdjustmentJournalId?: number;
  status: "IN_PROGRESS" | "RECONCILED" | "UNDONE";
  reconciledBy?: string;
  reconciledAt?: string;
  statementAttachmentUrl?: string;
  reportPdfUrl?: string;
  notes?: string;
}

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

export interface ReconciliationSuggestion {
  bankTransactionId: number;
  candidateRef: string;
  confidence: number;
  reason: string;
}

export interface ReconciliationData {
  summary: {
    month: number;
    year: number;
    balancePerBank: number;
    depositsInTransit: number;
    outstandingCheques: number;
    adjustedBankBalance: number;
    balancePerBooks: number;
    difference: number;
    status: "RECONCILED" | "PARTIALLY_RECONCILED" | "UNRECONCILED";
  };
  bankTransactions: BankTransaction[];
  booksTransactions: BankTransaction[];
  suggestions: ReconciliationSuggestion[];
}

export interface MatchPayload {
  links: Array<{ bankTransactionId: number; journalRef: string }>;
}

export const bankingService = {
  // Accounts CRUD
  async listAccounts() {
    const response = await api.get("/bank-accounts");
    return response.data.data as BankAccount[];
  },
  async getAccount(id: number | string) {
    const response = await api.get(`/bank-accounts/${id}`);
    return response.data.data as BankAccount;
  },
  async createAccount(payload: Record<string, unknown>) {
    const response = await api.post("/bank-accounts", payload);
    return response.data.data as BankAccount;
  },
  async updateAccount(id: number | string, payload: Record<string, unknown>) {
    const response = await api.put(`/bank-accounts/${id}`, payload);
    return response.data.data as BankAccount;
  },

  // Manual Transactions (preserved)
  async listTransactions(
    id: number | string,
    params: { from?: string; to?: string; reconciled?: string } = {},
  ) {
    const response = await api.get(`/bank-accounts/${id}/transactions`, { params });
    return response.data.data as BankTransaction[];
  },
  async createTransaction(id: number | string, payload: Record<string, unknown>) {
    const response = await api.post(`/bank-accounts/${id}/transactions`, payload);
    return response.data.data as BankTransaction;
  },
  async importStatement(id: number | string, payload: Record<string, unknown>) {
    const response = await api.post(`/bank-accounts/${id}/import`, payload);
    return response.data.data as { importedRows: number; duplicatesSkipped: number; batchId: number };
  },

  // QBO Bank Feed & Templates
  async downloadTemplate(id: number | string, format: "xlsx" | "csv" = "xlsx") {
    const response = await api.get(`/bank-accounts/${id}/template/${format}`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bank_import_template_v1.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  async uploadStatement(id: number | string, file: File, forceImportDuplicates: boolean = false) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("forceImportDuplicates", String(forceImportDuplicates));

    const response = await api.post(`/bank-accounts/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },
  async listFeedLines(
    id: number | string,
    params: { status?: string; search?: string; from?: string; to?: string; txnType?: string; ruleFilter?: string } = {}
  ) {
    const response = await api.get(`/bank-accounts/${id}/feed`, { params });
    return response.data.data as BankFeedResponse;
  },
  async getFeedLineMatches(id: number | string, lineId: number | string) {
    const response = await api.get(`/bank-accounts/${id}/feed/${lineId}/matches`);
    return response.data.data as MatchCandidate[];
  },
  async categorizeFeedLine(id: number | string, lineId: number | string, payload: Record<string, unknown>) {
    const response = await api.post(`/bank-accounts/${id}/feed/${lineId}/categorize`, payload);
    return response.data.data;
  },
  async matchFeedLine(id: number | string, lineId: number | string, matches: Array<{ documentType: string; documentId: number; amount: number }>) {
    const response = await api.post(`/bank-accounts/${id}/feed/${lineId}/match`, { matches });
    return response.data.data;
  },
  async excludeFeedLine(id: number | string, lineId: number | string, reason: string) {
    const response = await api.post(`/bank-accounts/${id}/feed/${lineId}/exclude`, { reason });
    return response.data.data;
  },
  async undoFeedLine(id: number | string, lineId: number | string) {
    const response = await api.post(`/bank-accounts/${id}/feed/${lineId}/undo`);
    return response.data.data;
  },
  async undoBatch(id: number | string, batchId: number | string) {
    const response = await api.post(`/bank-accounts/${id}/batches/${batchId}/undo`);
    return response.data.data;
  },

  // QBO Reconcile Wizard & History
  async getReconciliationHistory(id: number | string) {
    const response = await api.get(`/bank-accounts/${id}/reconcile/history`);
    return response.data.data as ReconciliationHistoryRow[];
  },
  async startReconciliation(id: number | string, payload: { statementDate: string; endingBalance: number }) {
    const response = await api.post(`/bank-accounts/${id}/reconcile/start`, payload);
    return response.data.data as ReconcileSessionData;
  },
  async updateReconciliationItems(
    id: number | string,
    reconId: number | string,
    clearedItems: Array<{ sourceType: string; id: number; amount: number; direction: string }>
  ) {
    const response = await api.post(`/bank-accounts/${id}/reconcile/${reconId}/items`, { clearedItems });
    return response.data.data as { clearedBalance: number; difference: number };
  },
  async finishReconciliation(id: number | string, reconId: number | string, autoAdjust: boolean = false) {
    const response = await api.post(`/bank-accounts/${id}/reconcile/${reconId}/finish`, { autoAdjust });
    return response.data.data;
  },
  async undoReconciliation(id: number | string, reconId: number | string) {
    const response = await api.post(`/bank-accounts/${id}/reconcile/${reconId}/undo`);
    return response.data.data;
  },

  // Bank Rules
  async listRules(id: number | string) {
    const response = await api.get(`/bank-accounts/${id}/rules`);
    return response.data.data;
  },
  async createRule(id: number | string, payload: Record<string, unknown>) {
    const response = await api.post(`/bank-accounts/${id}/rules`, payload);
    return response.data.data;
  },

  // Legacy Recon
  async getReconciliation(id: number | string, params: { month: number; year: number }) {
    const response = await api.get(`/bank-accounts/${id}/reconciliation`, { params });
    return response.data.data as ReconciliationData;
  },
  async matchReconciliation(id: number | string, payload: MatchPayload) {
    const response = await api.post(`/bank-accounts/${id}/reconciliation/match`, payload);
    return response.data.data as { matched: number };
  },
  async finalizeReconciliation(id: number | string, payload: { month: number; year: number }) {
    const response = await api.post(`/bank-accounts/${id}/reconciliation/finalize`, payload);
    return response.data.data as { bankAccountId: number; month: number; year: number; finalizedAt: string; status: "LOCKED" };
  },
};
