import { api } from "@/lib/axios";

export const advanceService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/advances", { params });
    return response.data.data;
  },
  async create(payload: {
    customerId: number;
    accountId: number | string;
    date: string;
    amount: number;
    mode: "CASH" | "CARD" | "UPI" | "CHEQUE" | "BANK_TRANSFER" | string;
    reference?: string;
    notes?: string;
    invoiceId?: number | string | null;
  }) {
    const response = await api.post("/advances", payload);
    return response.data.data;
  },
  async apply(id: number, payload: { invoiceId: number; amount: number; date: string }) {
    const response = await api.post(`/advances/${id}/apply`, payload);
    return response.data.data;
  },
};
