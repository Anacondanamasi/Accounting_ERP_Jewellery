import { api } from "@/lib/axios";
export const billService = {
    async list(params = {}) {
        const response = await api.get("/bills", { params });
        return response.data.data;
    },
    async getById(id) {
        const response = await api.get(`/bills/${id}`);
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/bills", payload);
        return response.data.data;
    },
    async update(id, payload) {
        const response = await api.put(`/bills/${id}`, payload);
        return response.data.data;
    },
    async getNextNumber() {
        const response = await api.get("/bills/next-number");
        return response.data.data;
    },
    async post(id) {
        const response = await api.post(`/bills/${id}/post`);
        return response.data.data;
    },
    async void(id) {
        const response = await api.post(`/bills/${id}/void`);
        return response.data.data;
    },
    async duplicate(id) {
        const response = await api.post(`/bills/${id}/duplicate`);
        return response.data.data;
    },
    async recordPayment(id, payload) {
        const response = await api.post(`/bills/${id}/record-payment`, payload);
        return response.data.data;
    },
};
