import { api } from "@/lib/axios";
export const settingsService = {
    async getCompanySettings() {
        const response = await api.get("/settings/company");
        return response.data.data;
    },
    async updateCompanySettings(payload) {
        const response = await api.put("/settings/company", payload);
        return response.data.data;
    },
    async getUsers() {
        const response = await api.get("/settings/users");
        return response.data.data;
    },
    async inviteUser(payload) {
        const response = await api.post("/settings/users/invite", payload);
        return response.data.data;
    },
    async updateUserRole(id, role) {
        const response = await api.put(`/settings/users/${id}/role`, { role });
        return response.data.data;
    },
    async removeUser(id) {
        const response = await api.delete(`/settings/users/${id}`);
        return response.data.data;
    },
    async getNumberSeries() {
        const response = await api.get("/settings/number-series");
        return response.data.data;
    },
    async updateNumberSeries(type, payload) {
        const response = await api.put(`/settings/number-series/${type}`, payload);
        return response.data.data;
    },
    async getIntegrations() {
        const response = await api.get("/settings/integrations");
        return response.data.data;
    },
    async updateIntegration(key, payload) {
        const response = await api.put(`/settings/integrations/${key}`, payload);
        return response.data.data;
    },
    async getAuditLog(params) {
        const response = await api.get("/settings/audit-log", { params });
        return response.data.data;
    },
    async getSettingsCenterDefinition() {
        const response = await api.get("/settings/center/definition");
        return response.data.data;
    },
    async getSettingsCenterRecords(section) {
        const response = await api.get(`/settings/center/records/${section}`);
        return response.data.data;
    },
    async upsertSettingsCenterRecord(section, payload) {
        const response = await api.put(`/settings/center/records/${section}`, payload);
        return response.data.data;
    },
    async archiveSettingsCenterRecord(section, recordKey) {
        const response = await api.delete(`/settings/center/records/${section}/${recordKey}`);
        return response.data.data;
    },
    async updateSettingsCenterMeta(payload) {
        const response = await api.put("/settings/center/meta", payload);
        return response.data.data;
    },
    async searchSettingsCenter(query) {
        const response = await api.get("/settings/center/search", { params: { q: query } });
        return response.data.data;
    },
};
