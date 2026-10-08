import { api } from "@/lib/axios";
export const payrollService = {
    async list(params = {}) {
        const response = await api.get("/payroll", { params });
        return response.data.data;
    },
    async getById(id) {
        const response = await api.get(`/payroll/${id}`);
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/payroll", payload);
        return response.data.data;
    },
    async update(id, payload) {
        const response = await api.put(`/payroll/${id}`, payload);
        return response.data.data;
    },
};
