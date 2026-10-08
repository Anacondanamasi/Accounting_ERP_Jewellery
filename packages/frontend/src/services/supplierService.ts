import { api } from "@/lib/axios";

export const supplierService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/suppliers", { params });
    return response.data.data;
  },
  async getById(id: number) {
    const response = await api.get(`/suppliers/${id}`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/suppliers", payload);
    return response.data.data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/suppliers/${id}`, payload);
    return response.data.data;
  },
  async remove(id: number) {
    const response = await api.delete(`/suppliers/${id}`);
    return response.data.data;
  },
  async getLedger(id: number, params: { from?: string; to?: string }) {
    const response = await api.get(`/suppliers/${id}/ledger`, { params });
    return response.data.data;
  },
  async getBills(id: number) {
    const response = await api.get(`/suppliers/${id}/bills`);
    return response.data.data;
  },
};
