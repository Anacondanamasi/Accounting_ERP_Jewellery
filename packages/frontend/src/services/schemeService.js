import { api } from "@/lib/axios";
export const schemeService = {
    async list(params = {}) {
        const response = await api.get("/schemes", { params });
        return response.data.data;
    },
    async getById(id) {
        const response = await api.get(`/schemes/${id}`);
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/schemes", payload);
        return response.data.data;
    },
    async update(id, payload) {
        const response = await api.put(`/schemes/${id}`, payload);
        return response.data.data;
    },
    async listMembers() {
        const response = await api.get("/schemes/members/all");
        return response.data.data;
    },
    async enrollMember(payload) {
        const response = await api.post("/schemes/members", payload);
        return response.data.data;
    },
    async payInstallment(memberId) {
        const response = await api.post(`/schemes/members/${memberId}/pay`);
        return response.data.data;
    },
};
