import { api } from "@/lib/axios";
export const invoiceService = {
    async list(params = {}) {
        const response = await api.get("/invoices", { params });
        return response.data.data;
    },
    async getById(id) {
        const response = await api.get(`/invoices/${id}`);
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/invoices", payload);
        return response.data.data;
    },
    async update(id, payload) {
        const response = await api.put(`/invoices/${id}`, payload);
        return response.data.data;
    },
    async getNextNumber() {
        const response = await api.get("/invoices/next-number");
        return response.data.data;
    },
    async post(id) {
        const response = await api.post(`/invoices/${id}/post`);
        return response.data.data;
    },
    async void(id) {
        const response = await api.post(`/invoices/${id}/void`);
        return response.data.data;
    },
    async duplicate(id) {
        const response = await api.post(`/invoices/${id}/duplicate`);
        return response.data.data;
    },
    async recordPayment(id, payload) {
        const response = await api.post(`/invoices/${id}/record-payment`, payload);
        return response.data.data;
    },
    async getPdf(id) {
        const response = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
        return response.data;
    },
    async sendEmail(id, payload) {
        const response = await api.post(`/invoices/${id}/send-email`, payload);
        return response.data.data;
    },
};
