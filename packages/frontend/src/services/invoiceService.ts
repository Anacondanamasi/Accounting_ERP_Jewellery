import { api } from "@/lib/axios";

export interface InvoiceLinePayload {
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
  huid?: string | null;
}

export interface InvoicePayload {
  invoiceDate: string;
  dueDate: string;
  customerId: number;
  salespersonId?: number | null;
  placeOfSupply: string;
  notes?: string | null;
  terms?: string | null;
  lines: InvoiceLinePayload[];
}

export const invoiceService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/invoices", { params });
    return response.data.data;
  },
  async getById(id: number) {
    const response = await api.get(`/invoices/${id}`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/invoices", payload);
    return response.data.data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/invoices/${id}`, payload);
    return response.data.data;
  },
  async getNextNumber() {
    const response = await api.get("/invoices/next-number");
    return response.data.data;
  },
  async post(id: number) {
    const response = await api.post(`/invoices/${id}/post`);
    return response.data.data;
  },
  async void(id: number) {
    const response = await api.post(`/invoices/${id}/void`);
    return response.data.data;
  },
  async duplicate(id: number) {
    const response = await api.post(`/invoices/${id}/duplicate`);
    return response.data.data;
  },
  async recordPayment(
    id: number,
    payload: { date: string; mode: string; amount: number; reference?: string; notes?: string },
  ) {
    const response = await api.post(`/invoices/${id}/record-payment`, payload);
    return response.data.data;
  },
  async getPdf(id: number) {
    const response = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
    return response.data as Blob;
  },
  async sendEmail(id: number, payload: { to: string; cc?: string; message?: string }) {
    const response = await api.post(`/invoices/${id}/send-email`, payload);
    return response.data.data;
  },
};
