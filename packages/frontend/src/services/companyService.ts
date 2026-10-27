import { api } from "@/lib/axios";

export const companyService = {
  async list() {
    const response = await api.get("/companies");
    return response.data.data;
  },
  async getById(id: string) {
    const response = await api.get(`/companies/${id}`);
    return response.data.data;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const response = await api.patch(`/companies/${id}`, payload);
    return response.data.data;
  },
  async inviteMember(id: string, payload: { email: string; roleId: string }) {
    const response = await api.post(`/companies/${id}/invitations`, payload);
    return response.data.data;
  },
  async listMembers(id: string) {
    const response = await api.get(`/companies/${id}/members`);
    return response.data.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/companies", payload);
    return response.data.data as { id: string; name: string; accessToken?: string; legacyCompanyId?: number };
  },
  async switch(companyId: string) {
    const response = await api.post(`/companies/${companyId}/switch`);
    return response.data.data as { activeCompanyId: string; accessToken?: string; legacyCompanyId?: number };
  },
};
