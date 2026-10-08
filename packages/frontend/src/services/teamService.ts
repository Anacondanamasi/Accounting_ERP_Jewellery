import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

const currentCompanyId = () => useAuthStore.getState().currentCompanyId;

export const teamService = {
  async listMembers() {
    const companyId = currentCompanyId();
    const response = await api.get(`/companies/${companyId}/members`);
    return response.data.data as Array<{
      userId: string;
      email: string;
      fullName: string;
      roleId: string;
      role: string;
      status: "pending" | "active" | "suspended" | "revoked";
      joinedAt?: string | null;
    }>;
  },
  async listRoles() {
    const companyId = currentCompanyId();
    const response = await api.get(`/companies/${companyId}/roles`);
    return response.data.data as Array<{
      id: string;
      name: string;
      description: string;
      isSystemRole: boolean;
      permissions: string[];
    }>;
  },
  async inviteMember(email: string, roleId: string) {
    const companyId = currentCompanyId();
    const response = await api.post(`/companies/${companyId}/members/invite`, { email, roleId });
    return response.data.data as { inviteLinkPreview?: string };
  },
  async updateRole(userId: string, roleId: string) {
    const companyId = currentCompanyId();
    await api.patch(`/companies/${companyId}/members/${userId}/role`, { roleId });
  },
  async removeMember(userId: string) {
    const companyId = currentCompanyId();
    await api.delete(`/companies/${companyId}/members/${userId}`);
  },
  async requestTransfer(targetUserId: string) {
    const companyId = currentCompanyId();
    const response = await api.post(`/companies/${companyId}/transfer-ownership`, { targetUserId });
    return response.data.data as { transferLinkPreview: string };
  },
  async confirmTransfer(token: string) {
    await api.post(`/transfer-ownership/confirm?token=${token}`);
  },
};

