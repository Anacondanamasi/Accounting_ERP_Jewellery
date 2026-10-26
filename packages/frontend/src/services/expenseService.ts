import { api } from "@/lib/axios";

export const expenseService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/expenses", { params });
    return response.data.data as any[];
  },
  async getById(id: number | string) {
    const response = await api.get(`/expenses/${id}`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/expenses", payload);
    return response.data.data;
  },
  async update(id: number | string, payload: Record<string, unknown>) {
    const response = await api.put(`/expenses/${id}`, payload);
    return response.data.data;
  },
  async delete(id: number | string) {
    const response = await api.delete(`/expenses/${id}`);
    return response.data.data;
  },
};
