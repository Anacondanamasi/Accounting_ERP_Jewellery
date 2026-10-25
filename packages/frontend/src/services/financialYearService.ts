import { api } from "@/lib/axios";

export interface FinancialYear {
  id: number;
  companyId: number;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
  closedAt?: string | null;
  closedBy?: string | null;
  closingEntryId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClosingPreviewAccount {
  id: number;
  code: string;
  name: string;
  balance: number;
}

export interface ProposedClosingLine {
  accountId: number;
  code: string;
  name: string;
  drCr: "DR" | "CR";
  amount: number;
}

export interface ClosingPreview {
  financialYear: FinancialYear;
  isAlreadyClosed: boolean;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  retainedEarningsAccount?: {
    id: number;
    code: string;
    name: string;
  } | null;
  revenueAccounts: ClosingPreviewAccount[];
  expenseAccounts: ClosingPreviewAccount[];
  proposedLines: ProposedClosingLine[];
  totalDr: number;
  totalCr: number;
  isBalanced: boolean;
}

export const financialYearService = {
  list: async (): Promise<FinancialYear[]> => {
    const res = await api.get("/financial-years");
    const raw = res.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  },

  create: async (payload: { label: string; startDate: string; endDate: string; isActive?: boolean }): Promise<FinancialYear> => {
    const res = await api.post("/financial-years", payload);
    return res.data?.data ?? res.data;
  },

  activate: async (id: number): Promise<{ success: boolean; activeYearId: number }> => {
    const res = await api.post(`/financial-years/${id}/activate`);
    return res.data?.data ?? res.data;
  },

  getClosingPreview: async (id: number): Promise<ClosingPreview> => {
    const res = await api.get(`/financial-years/${id}/closing-preview`);
    return res.data?.data ?? res.data;
  },

  close: async (id: number): Promise<any> => {
    const res = await api.post(`/financial-years/${id}/close`);
    return res.data;
  },

  reopen: async (id: number): Promise<any> => {
    const res = await api.post(`/financial-years/${id}/reopen`);
    return res.data;
  },
};
