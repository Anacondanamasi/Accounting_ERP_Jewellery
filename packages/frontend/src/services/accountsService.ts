import { api } from "@/lib/axios";

export const accountsService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/accounts", { params });
    return response.data.data;
  },
  async listGroups() {
    const response = await api.get("/accounts/groups");
    return response.data.data;
  },
  async createGroup(payload: Record<string, unknown>) {
    const response = await api.post("/accounts/groups", payload);
    return response.data.data;
  },
  async updateGroup(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/accounts/groups/${id}`, payload);
    return response.data.data;
  },
  async getById(id: number) {
    const response = await api.get(`/accounts/${id}`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/accounts", payload);
    return response.data.data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/accounts/${id}`, payload);
    return response.data.data;
  },
  async delete(id: number) {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
  },
};
