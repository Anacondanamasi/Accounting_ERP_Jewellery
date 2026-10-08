import { api } from "@/lib/axios";

export const schemeService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/schemes", { params });
    return response.data.data;
  },
  async getById(id: number) {
    const response = await api.get(`/schemes/${id}`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/schemes", payload);
    return response.data.data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const response = await api.put(`/schemes/${id}`, payload);
    return response.data.data;
  },
  async listMembers() {
    const response = await api.get("/schemes/members/all");
    return response.data.data;
  },
  async enrollMember(payload: Record<string, unknown>) {
    const response = await api.post("/schemes/members", payload);
    return response.data.data;
  },
  async payInstallment(memberId: number) {
    const response = await api.post(`/schemes/members/${memberId}/pay`);
    return response.data.data;
  },
};

