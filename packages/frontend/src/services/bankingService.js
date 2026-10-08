import { api } from "@/lib/axios";
export const bankingService = {
    async listAccounts() {
        const response = await api.get("/bank-accounts");
        return response.data.data;
    },
    async getAccount(id) {
        const response = await api.get(`/bank-accounts/${id}`);
        return response.data.data;
    },
    async createAccount(payload) {
        const response = await api.post("/bank-accounts", payload);
        return response.data.data;
    },
    async updateAccount(id, payload) {
        const response = await api.put(`/bank-accounts/${id}`, payload);
        return response.data.data;
    },
    async listTransactions(id, params = {}) {
        const response = await api.get(`/bank-accounts/${id}/transactions`, { params });
        return response.data.data;
    },
    async createTransaction(id, payload) {
        const response = await api.post(`/bank-accounts/${id}/transactions`, payload);
        return response.data.data;
    },
    async importStatement(id, payload) {
        const response = await api.post(`/bank-accounts/${id}/import`, payload);
        return response.data.data;
    },
    async getReconciliation(id, params) {
        const response = await api.get(`/bank-accounts/${id}/reconciliation`, { params });
        return response.data.data;
    },
    async matchReconciliation(id, payload) {
        const response = await api.post(`/bank-accounts/${id}/reconciliation/match`, payload);
        return response.data.data;
    },
    async finalizeReconciliation(id, payload) {
        const response = await api.post(`/bank-accounts/${id}/reconciliation/finalize`, payload);
        return response.data.data;
    },
};
