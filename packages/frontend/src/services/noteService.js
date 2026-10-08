import { api } from "@/lib/axios";
const createNoteService = (basePath) => ({
    async list() {
        const response = await api.get(basePath);
        return response.data.data;
    },
    async getById(id) {
        const response = await api.get(`${basePath}/${id}`);
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post(basePath, payload);
        return response.data.data;
    },
    async update(id, payload) {
        const response = await api.put(`${basePath}/${id}`, payload);
        return response.data.data;
    },
});
export const noteService = {
    credit: createNoteService("/credit-notes"),
    debit: createNoteService("/debit-notes"),
};
