import { api } from "@/lib/axios";
export const advanceService = {
    async list() {
        const response = await api.get("/advances");
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/advances", payload);
        return response.data.data;
    },
    async apply(id, payload) {
        const response = await api.post(`/advances/${id}/apply`, payload);
        return response.data.data;
    },
};
