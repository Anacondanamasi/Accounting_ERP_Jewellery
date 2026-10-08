import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
const currentCompanyId = () => useAuthStore.getState().currentCompanyId;
export const teamService = {
    async listMembers() {
        const companyId = currentCompanyId();
        const response = await api.get(`/companies/${companyId}/members`);
        return response.data.data;
    },
    async listRoles() {
        const companyId = currentCompanyId();
        const response = await api.get(`/companies/${companyId}/roles`);
        return response.data.data;
    },
    async inviteMember(email, roleId) {
        const companyId = currentCompanyId();
        const response = await api.post(`/companies/${companyId}/members/invite`, { email, roleId });
        return response.data.data;
    },
    async updateRole(userId, roleId) {
        const companyId = currentCompanyId();
        await api.patch(`/companies/${companyId}/members/${userId}/role`, { roleId });
    },
    async removeMember(userId) {
        const companyId = currentCompanyId();
        await api.delete(`/companies/${companyId}/members/${userId}`);
    },
    async requestTransfer(targetUserId) {
        const companyId = currentCompanyId();
        const response = await api.post(`/companies/${companyId}/transfer-ownership`, { targetUserId });
        return response.data.data;
    },
    async confirmTransfer(token) {
        await api.post(`/transfer-ownership/confirm?token=${token}`);
    },
};
