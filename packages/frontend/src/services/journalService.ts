import { api } from "@/lib/axios";

export const journalService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/journal", { params });
    return response.data.data;
  },
  async getById(id: number | string) {
    const response = await api.get(`/journal/${id}`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/journal", payload);
    return response.data.data;
  },
  async update(id: number | string, payload: Record<string, unknown>) {
    const response = await api.put(`/journal/${id}`, payload);
    return response.data.data;
  },
  async post(id: number | string) {
    const response = await api.post(`/journal/${id}/post`);
    return response.data.data;
  },
  async reverse(id: number | string) {
    const response = await api.post(`/journal/${id}/reverse`);
    return response.data.data;
  },
  async listTemplates() {
    const response = await api.get("/journal/templates");
    return response.data.data;
  },
  async createTemplate(payload: Record<string, unknown>) {
    const response = await api.post("/journal/templates", payload);
    return response.data.data;
  },
  async deleteTemplate(id: number) {
    const response = await api.delete(`/journal/templates/${id}`);
    return response.data.data;
  },
};
