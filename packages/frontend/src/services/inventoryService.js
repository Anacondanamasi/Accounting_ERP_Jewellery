import { api } from "@/lib/axios";
export const inventoryService = {
    async listItems(params = {}) {
        const response = await api.get("/items", { params });
        return response.data.data;
    },
    async getItemById(id) {
        const response = await api.get(`/items/${id}`);
        return response.data.data;
    },
    async createItem(payload) {
        const response = await api.post("/items", payload);
        return response.data.data;
    },
    async updateItem(id, payload) {
        const response = await api.put(`/items/${id}`, payload);
        return response.data.data;
    },
    async listStockLedger(itemId, params = {}) {
        const response = await api.get(`/items/${itemId}/stock-ledger`, { params });
        return response.data.data;
    },
    async listAdjustments(params = {}) {
        const response = await api.get("/inventory/adjustments", { params });
        return response.data.data;
    },
    async getAdjustmentById(id) {
        const response = await api.get(`/inventory/adjustments/${id}`);
        return response.data.data;
    },
    async createAdjustment(payload) {
        const response = await api.post("/inventory/adjustments", payload);
        return response.data.data;
    },
    async updateAdjustment(id, payload) {
        const response = await api.put(`/inventory/adjustments/${id}`, payload);
        return response.data.data;
    },
    async submitAdjustment(id) {
        const response = await api.post(`/inventory/adjustments/${id}/submit`);
        return response.data.data;
    },
    async approveAdjustment(id) {
        const response = await api.post(`/inventory/adjustments/${id}/approve`);
        return response.data.data;
    },
    async postAdjustment(id) {
        const response = await api.post(`/inventory/adjustments/${id}/post`);
        return response.data.data;
    },
    async createRevaluation(payload) {
        const response = await api.post("/inventory/adjustments/revaluation", payload);
        return response.data.data;
    },
    async getTodayRates() {
        const response = await api.get("/metal-rates/today");
        return response.data.data;
    },
    async getRateHistory(params = {}) {
        const response = await api.get("/metal-rates/history", { params });
        return response.data.data;
    },
    async getRateChart(params = {}) {
        const response = await api.get("/metal-rates/chart", { params });
        return response.data.data;
    },
    async createRateEntry(payload) {
        const response = await api.post("/metal-rates", payload);
        return response.data.data;
    },
    async refreshRates() {
        const response = await api.post("/metal-rates/refresh");
        return response.data.data;
    },
    async listKarigars() {
        const response = await api.get("/karigar");
        return response.data.data;
    },
    async createKarigar(payload) {
        const response = await api.post("/karigar", payload);
        return response.data.data;
    },
    async updateKarigar(id, payload) {
        const response = await api.put(`/karigar/${id}`, payload);
        return response.data.data;
    },
    async listJobWorkOrders(params = {}) {
        const response = await api.get("/job-work", { params });
        return response.data.data;
    },
    async createJobWorkOrder(payload) {
        const response = await api.post("/job-work", payload);
        return response.data.data;
    },
    async returnJobWork(id, payload) {
        const response = await api.post(`/job-work/${id}/return`, payload);
        return response.data.data;
    },
    async createJobWorkBill(id) {
        const response = await api.post(`/job-work/${id}/bill`);
        return response.data.data;
    },
};
