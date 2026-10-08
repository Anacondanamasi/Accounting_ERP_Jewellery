import { api } from "@/lib/axios";

export const advanceService = {
  async list() {
    const response = await api.get("/advances");
    return response.data.data;
  },
  async create(payload: {
    customerId: number;
    date: string;
    amount: number;
    mode: "CASH" | "CARD" | "UPI" | "CHEQUE" | "BANK_TRANSFER";
    reference?: string;
  }) {
    const response = await api.post("/advances", payload);
    return response.data.data;
  },
  async apply(id: number, payload: { invoiceId: number; amount: number; date: string }) {
    const response = await api.post(`/advances/${id}/apply`, payload);
    return response.data.data;
  },
};
