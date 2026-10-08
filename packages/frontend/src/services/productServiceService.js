import { api } from "@/lib/axios";
export const productServiceService = {
    async list(params = {}) {
        const response = await api.get("/product-services", { params });
        return response.data.data;
    },
    async getById(id) {
        const response = await api.get(`/product-services/${id}`);
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/product-services", payload);
        return response.data.data;
    },
    async update(id, payload) {
        const response = await api.put(`/product-services/${id}`, payload);
        return response.data.data;
    },
    async archive(id) {
        const response = await api.post(`/product-services/${id}/archive`);
        return response.data.data;
    },
    async bulkArchive(ids) {
        const response = await api.post("/product-services/bulk-archive", { ids });
        return response.data.data;
    },
    async getMovements(id) {
        const response = await api.get(`/product-services/${id}/movements`);
        return response.data.data;
    },
    getExportUrl() {
        return `${api.defaults.baseURL}/product-services/export`;
    },
};
