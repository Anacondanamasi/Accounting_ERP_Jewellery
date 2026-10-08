import { api } from "@/lib/axios";
export const expenseService = {
    async list(params = {}) {
        const response = await api.get("/expenses", { params });
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/expenses", payload);
        return response.data.data;
    },
};
