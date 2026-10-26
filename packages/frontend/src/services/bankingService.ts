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
