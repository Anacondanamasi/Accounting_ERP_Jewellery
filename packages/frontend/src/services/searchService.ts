import { api } from "@/lib/axios";

export const searchService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/search", { params });
    return response.data.data;
  },
  async getById(id: number) {
    const response = await api.get(`/search/${id}`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/search", payload);
    return response.data.data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/search/${id}`, payload);
    return response.data.data;
  },
};
