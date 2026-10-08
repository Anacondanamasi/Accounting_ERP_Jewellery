import { api } from "@/lib/axios";

export interface BillLinePayload {
  sku: string;
  description: string;
  karat: "24K" | "22K" | "18K" | "14K" | "SILVER" | "PLATINUM";
  grossWt: number;
  netWt: number;
  stoneWt: number;
  makingType: "PER_GRAM" | "FLAT" | "PERCENT";
  makingRate: number;
  ratePerGram: number;
  discountPct: number;
  gstPct: number;
  hsnCode: string;
}

export const billService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/bills", { params });
    return response.data.data;
  },
  async getById(id: number) {
    const response = await api.get(`/bills/${id}`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/bills", payload);
    return response.data.data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/bills/${id}`, payload);
    return response.data.data;
  },
  async getNextNumber() {
    const response = await api.get("/bills/next-number");
    return response.data.data;
  },
  async post(id: number) {
    const response = await api.post(`/bills/${id}/post`);
    return response.data.data;
  },
  async void(id: number) {
    const response = await api.post(`/bills/${id}/void`);
    return response.data.data;
  },
  async duplicate(id: number) {
    const response = await api.post(`/bills/${id}/duplicate`);
    return response.data.data;
  },
  async recordPayment(
    id: number,
    payload: { date: string; mode: string; amount: number; reference?: string },
  ) {
    const response = await api.post(`/bills/${id}/record-payment`, payload);
    return response.data.data;
  },
};
