import { api } from "@/lib/axios";
export const supplierService = {
    async list(params = {}) {
        const response = await api.get("/suppliers", { params });
        return response.data.data;
    },
    async getById(id) {
        const response = await api.get(`/suppliers/${id}`);
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/suppliers", payload);
        return response.data.data;
    },
    async update(id, payload) {
        const response = await api.put(`/suppliers/${id}`, payload);
        return response.data.data;
    },
    async remove(id) {
        const response = await api.delete(`/suppliers/${id}`);
        return response.data.data;
    },
    async getLedger(id, params) {
        const response = await api.get(`/suppliers/${id}/ledger`, { params });
        return response.data.data;
    },
    async getBills(id) {
        const response = await api.get(`/suppliers/${id}/bills`);
        return response.data.data;
    },
};
