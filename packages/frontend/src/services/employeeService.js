import { api } from "@/lib/axios";
export const employeeService = {
    async list(params = {}) {
        const response = await api.get("/employees", { params });
        return response.data.data;
    },
    async create(payload) {
        const response = await api.post("/employees", payload);
        return response.data.data;
    },
    async update(id, payload) {
        const response = await api.put(`/employees/${id}`, payload);
        return response.data.data;
    },
};
