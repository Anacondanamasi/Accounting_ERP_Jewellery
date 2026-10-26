import { api } from "@/lib/axios";

export interface FieldCatalogItem {
  id: string;
  label: string;
  category: string;
  dataType: string;
  defaultVisible: boolean;
  defaultWidth?: number;
  sortable: boolean;
  groupable: boolean;
  filterable: boolean;
  operators: string[];
  enumOptions?: Array<{ label: string; value: string }>;
  description?: string;
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
  nextCursor?: number;
  meta: {
    generatedAt: string;
    serverTimeMs: number;
    totalFilteredTransactions: number;
  };
}

export interface CustomReportItem {
  id: number;
  companyId: number;
  reportId: string;
  name: string;
  description?: string | null;
  folderId?: number | null;
  visibility: "PRIVATE" | "SHARED" | "COMPANY";
  isDefault: boolean;
  definition: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  folder?: { id: number; name: string } | null;
}

export const journalReportService = {
  async runReport(payload: Record<string, any>): Promise<JournalReportResponse> {
    const res = await api.post("/reports/journal/run", payload);
    return res.data.data;
  },

  async getFieldCatalog(): Promise<FieldCatalogItem[]> {
    const res = await api.get("/reports/journal/fields");
    return res.data.data;
  },

  async exportReport(payload: Record<string, any>, format: "excel" | "pdf" | "csv"): Promise<Blob> {
    const res = await api.post(
      "/reports/journal/export",
      { ...payload, format },
      { responseType: "blob" }
    );
    return res.data;
  },

  async listCustomReports(): Promise<CustomReportItem[]> {
    const res = await api.get("/reports/custom");
    return res.data.data;
  },

  async saveCustomReport(payload: Record<string, any>): Promise<CustomReportItem> {
    const res = await api.post("/reports/custom", payload);
    return res.data.data;
  },

  async updateCustomReport(id: number, payload: Record<string, any>): Promise<CustomReportItem> {
    const res = await api.put(`/reports/custom/${id}`, payload);
    return res.data.data;
  },

  async deleteCustomReport(id: number): Promise<void> {
    await api.delete(`/reports/custom/${id}`);
  },

  async listFolders(): Promise<Array<{ id: number; name: string }>> {
    const res = await api.get("/reports/folders");
    return res.data.data;
  },

  async createFolder(name: string): Promise<{ id: number; name: string }> {
    const res = await api.post("/reports/folders", { name });
    return res.data.data;
  },
};
