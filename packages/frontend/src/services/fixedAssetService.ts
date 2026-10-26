import { api } from "@/lib/axios";

export interface AssetCategory {
  id: number;
  name: string;
  code?: string;
  description?: string;
  scheduleIIClass?: string;
  usefulLifeYears: number;
  residualPercentage: number;
  defaultMethod: "SLM" | "WDV";
  taxBlockId?: number | null;
  assetAccountId: number;
  accumulatedDepAccountId: number;
  depExpenseAccountId: number;
  cwipAccountId?: number | null;
  gainLossAccountId?: number | null;
  _count?: { assets: number };
}

export interface TaxBlock {
  id: number;
  name: string;
  assetClass: string;
  depreciationRate: number;
  description?: string;
  verifyWithCa: boolean;
  _count?: { assets: number };
}

export interface FixedAssetItem {
  id: number;
  assetCode: string;
  name: string;
  description?: string;
  assetCategoryId: number;
  taxBlockId?: number | null;
  serialNo?: string;
  location?: string;
  department?: string;
  custodian?: string;
  barcodeOrTag?: string;
  dateOfPurchase: string;
  datePutToUse: string;
  capitalizedAt?: string | null;
  originalCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: "SLM" | "WDV";
  wdvRate?: number | null;
  currentBookValue: number;
  accumulatedDep: number;
  status: "ACTIVE" | "CWIP" | "IMPAIRED" | "DISPOSED" | "WRITTEN_OFF";
  isCwip: boolean;
  supplierBillId?: number | null;
  eligibleItcGst: number;
  blockedItcGst: number;
  isDisposed: boolean;
  disposalDate?: string | null;
  disposalAmount?: number | null;
  disposalGainLoss?: number | null;
  disposalJournalId?: number | null;
  disposalReason?: string | null;
  rule43ReversalAmount?: number | null;
  category?: AssetCategory;
  taxBlock?: TaxBlock;
  costComponents?: any[];
  depreciationLines?: any[];
  events?: any[];
  verifications?: any[];
}

export const fixedAssetService = {
  async getKpis() {
    const res = await api.get("/fixed-assets/summary/kpis");
    return res.data.data;
  },

  async list(params: {
    status?: string;
    categoryId?: number;
    taxBlockId?: number;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const res = await api.get("/fixed-assets", { params });
    return res.data.data;
  },

  async getById(id: number | string) {
    const res = await api.get(`/fixed-assets/${id}`);
    return res.data.data as FixedAssetItem;
  },

  async create(payload: Record<string, any>) {
    const res = await api.post("/fixed-assets", payload);
    return res.data.data;
  },

  async update(id: number | string, payload: Record<string, any>) {
    const res = await api.put(`/fixed-assets/${id}`, payload);
    return res.data.data;
  },

  async bulkCreate(items: any[]) {
    const res = await api.post("/fixed-assets/bulk", { items });
    return res.data.data;
  },

  async capitalizeCwip(id: number | string, capitalizedDate?: string) {
    const res = await api.post(`/fixed-assets/${id}/capitalize`, { capitalizedDate });
    return res.data.data;
  },

  async recordVerification(id: number | string, payload: Record<string, any>) {
    const res = await api.post(`/fixed-assets/${id}/verify`, payload);
    return res.data.data;
  },

  async previewDepreciation(payload: {
    periodStartDate: string;
    periodEndDate: string;
    frequency?: string;
  }) {
    const res = await api.post("/fixed-assets/depreciation/preview", payload);
    return res.data.data;
  },

  async postDepreciation(payload: {
    periodStartDate: string;
    periodEndDate: string;
    frequency?: string;
    remarks?: string;
  }) {
    const res = await api.post("/fixed-assets/depreciation/post", payload);
    return res.data.data;
  },

  async reverseDepreciation(runId: number | string, reason: string) {
    const res = await api.post(`/fixed-assets/depreciation/reverse/${runId}`, { reason });
    return res.data.data;
  },

  async listDepreciationRuns() {
    const res = await api.get("/fixed-assets/depreciation/runs");
    return res.data.data;
  },

  async getDepreciationRunById(runId: number | string) {
    const res = await api.get(`/fixed-assets/depreciation/runs/${runId}`);
    return res.data.data;
  },

  async previewDisposal(id: number | string, payload: Record<string, any>) {
    const res = await api.post(`/fixed-assets/${id}/disposal/preview`, payload);
    return res.data.data;
  },

  async disposeAsset(id: number | string, payload: Record<string, any>) {
    const res = await api.post(`/fixed-assets/${id}/disposal/post`, payload);
    return res.data.data;
  },

  async undoDisposal(id: number | string) {
    const res = await api.post(`/fixed-assets/${id}/disposal/undo`);
    return res.data.data;
  },

  async listCategories(): Promise<AssetCategory[]> {
    const res = await api.get("/fixed-assets/masters/categories");
    return res.data.data;
  },

  async listTaxBlocks(): Promise<TaxBlock[]> {
    const res = await api.get("/fixed-assets/masters/tax-blocks");
    return res.data.data;
  },

  async getPpeReport(financialYear?: string) {
    const res = await api.get("/fixed-assets/reports/ppe-schedule", { params: { financialYear } });
    return res.data.data;
  },

  async getTaxBlockReport(year?: number) {
    const res = await api.get("/fixed-assets/reports/tax-blocks", { params: { year } });
    return res.data.data;
  },

  async getBooksVsTaxReport() {
    const res = await api.get("/fixed-assets/reports/books-vs-tax");
    return res.data.data;
  },
};
