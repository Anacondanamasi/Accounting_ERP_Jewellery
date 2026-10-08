import { api } from "@/lib/axios";

export interface TodayMetalRates {
  date: string;
  karat24: number;
  karat22: number;
  karat18: number;
  karat14: number;
  silver: number;
}

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  subCategory: string;
  collection: string;
  occasion: string[];
  gender: "UNISEX" | "WOMEN" | "MEN" | "KIDS";
  description: string;
  tags: string[];
  metalType: "GOLD" | "SILVER" | "PLATINUM";
  karat: "24K" | "22K" | "18K" | "14K" | "SILVER" | "PLATINUM";
  grossWt: number;
  netWt: number;
  stoneWt: number;
  wastagePct: number;
  huid: string;
  hallmarkGrade: string;
  costingMethod: "FIFO" | "WEIGHTED_AVG" | "SPECIFIC_ID";
  makingType: "PER_GRAM" | "FLAT" | "PERCENT";
  makingRate: number;
  overheadPct: number;
  costPrice: number;
  minSalePrice: number;
  mrp: number;
  reorderLevel: number;
  stockQty: number;
  stockWt: number;
  inProcessWt: number;
  isActive: boolean;
  imageUrl?: string;
}

export interface StockLedgerRow {
  id: number;
  itemId: number;
  date: string;
  transactionType: string;
  referenceType: string;
  referenceId: number;
  issuedQty: number;
  issuedWt: number;
  receivedQty: number;
  receivedWt: number;
  balanceQty: number;
  balanceWt: number;
  rate: number;
  value: number;
  narration: string;
}

export interface InventoryAdjustment {
  id: number;
  adjNo: string;
  date: string;
  type: string;
  reason: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "POSTED";
  approvedBy?: string;
  lines: Array<{
    id: number;
    itemId: number;
    currentQty: number;
    currentWt: number;
    adjustedQty: number;
    adjustedWt: number;
    diffQty: number;
    diffWt: number;
    oldRate: number;
    newRate: number;
    valueImpact: number;
    accountId: number;
  }>;
}

export interface MetalRateRow {
  id: number;
  date: string;
  karat24: number;
  karat22: number;
  karat18: number;
  karat14: number;
  silver: number;
  source: "MCX" | "MANUAL";
}

export interface KarigarRow {
  id: number;
  code: string;
  name: string;
  specialization: string;
  mobile: string;
  goldInHand: number;
  pendingReturn: number;
  makingDue: number;
  isActive: boolean;
}

export interface JobWorkOrderRow {
  id: number;
  jwoNo: string;
  karigarId: number;
  karigarName: string;
  issueDate: string;
  expectedDate: string;
  description: string;
  goldIssuedG: number;
  goldReturnedG: number;
  allowedLossPct: number;
  makingCharges: number;
  status: "ISSUED" | "PARTIALLY_RETURNED" | "COMPLETED" | "OVERDUE";
}

export const inventoryService = {
  async listItems(params: Record<string, unknown> = {}) {
    const response = await api.get("/items", { params });
    return response.data.data as InventoryItem[];
  },
  async getItemById(id: number) {
    const response = await api.get(`/items/${id}`);
    return response.data.data as InventoryItem;
  },
  async createItem(payload: Record<string, unknown>) {
    const response = await api.post("/items", payload);
    return response.data.data as InventoryItem;
  },
  async updateItem(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/items/${id}`, payload);
    return response.data.data as InventoryItem;
  },
  async listStockLedger(itemId: number, params: { from?: string; to?: string } = {}) {
    const response = await api.get(`/items/${itemId}/stock-ledger`, { params });
    return response.data.data as StockLedgerRow[];
  },
  async listAdjustments(params: Record<string, unknown> = {}) {
    const response = await api.get("/inventory/adjustments", { params });
    return response.data.data as InventoryAdjustment[];
  },
  async getAdjustmentById(id: number) {
    const response = await api.get(`/inventory/adjustments/${id}`);
    return response.data.data as InventoryAdjustment;
  },
  async createAdjustment(payload: Record<string, unknown>) {
    const response = await api.post("/inventory/adjustments", payload);
    return response.data.data as InventoryAdjustment;
  },
  async updateAdjustment(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/inventory/adjustments/${id}`, payload);
    return response.data.data as InventoryAdjustment;
  },
  async submitAdjustment(id: number) {
    const response = await api.post(`/inventory/adjustments/${id}/submit`);
    return response.data.data as InventoryAdjustment;
  },
  async approveAdjustment(id: number) {
    const response = await api.post(`/inventory/adjustments/${id}/approve`);
    return response.data.data as InventoryAdjustment;
  },
  async postAdjustment(id: number) {
    const response = await api.post(`/inventory/adjustments/${id}/post`);
    return response.data.data as InventoryAdjustment;
  },
  async createRevaluation(payload: Record<string, unknown>) {
    const response = await api.post("/inventory/adjustments/revaluation", payload);
    return response.data.data as {
      date: string;
      reason: string;
      goldWeightAffected: number;
      valueImpact: number;
      accountHead: string;
    };
  },
  async getTodayRates(): Promise<TodayMetalRates> {
    const response = await api.get("/metal-rates/today");
    return response.data.data as TodayMetalRates;
  },
  async getRateHistory(params: Record<string, unknown> = {}) {
    const response = await api.get("/metal-rates/history", { params });
    return response.data.data as MetalRateRow[];
  },
  async getRateChart(params: { months?: number } = {}) {
    const response = await api.get("/metal-rates/chart", { params });
    return response.data.data as Array<{ date: string; karat24: number; karat22: number; silver: number }>;
  },
  async createRateEntry(payload: Record<string, unknown>) {
    const response = await api.post("/metal-rates", payload);
    return response.data.data as MetalRateRow;
  },
  async refreshRates() {
    const response = await api.post("/metal-rates/refresh");
    return response.data.data as MetalRateRow;
  },
  async listKarigars() {
    const response = await api.get("/karigar");
    return response.data.data as KarigarRow[];
  },
  async createKarigar(payload: Record<string, unknown>) {
    const response = await api.post("/karigar", payload);
    return response.data.data as KarigarRow;
  },
  async updateKarigar(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/karigar/${id}`, payload);
    return response.data.data as KarigarRow;
  },
  async listJobWorkOrders(params: Record<string, unknown> = {}) {
    const response = await api.get("/job-work", { params });
    return response.data.data as JobWorkOrderRow[];
  },
  async createJobWorkOrder(payload: Record<string, unknown>) {
    const response = await api.post("/job-work", payload);
    return response.data.data as JobWorkOrderRow;
  },
  async returnJobWork(id: number, payload: Record<string, unknown>) {
    const response = await api.post(`/job-work/${id}/return`, payload);
    return response.data.data as JobWorkOrderRow;
  },
  async createJobWorkBill(id: number) {
    const response = await api.post(`/job-work/${id}/bill`);
    return response.data.data as { billNo: string; jwoNo: string; amount: number; supplierType: string };
  },
};
