import { api } from "@/lib/axios";
export const companyService = {
    async list() {
        const response = await api.get("/companies");
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/companies", payload);
        return response.data.data;
    },
};
