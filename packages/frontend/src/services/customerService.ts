import { api } from "@/lib/axios";

export const customerService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/customers", { params });
    return response.data.data;
  },
  async getById(id: number | string) {
    const response = await api.get(`/customers/${id}`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/customers", payload);
    return response.data.data;
  },
  async update(id: number | string, payload: Record<string, unknown>) {
    const response = await api.put(`/customers/${id}`, payload);
    return response.data.data;
  },
  async remove(id: number | string) {
    const response = await api.delete(`/customers/${id}`);
    return response.data.data;
  },
  async getLedger(id: number | string, params: { from?: string; to?: string }) {
    const response = await api.get(`/customers/${id}/ledger`, { params });
    return response.data.data;
  },
  async getInvoices(id: number | string) {
    const response = await api.get(`/customers/${id}/invoices`);
    return response.data.data;
  },
  async getAdvances(id: number | string) {
    const response = await api.get(`/customers/${id}/advances`);
    return response.data.data;
  },
  async sendStatement(id: number | string) {
    const response = await api.post(`/customers/${id}/send-statement`);
    return response.data.data;
  },
  async export() {
    const response = await api.get("/customers/export");
    return response.data.data;
  },
};
