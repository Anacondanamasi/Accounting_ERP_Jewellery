import { api } from "@/lib/axios";
export const taxService = {
    async getGstr1(params) {
        const response = await api.get("/tax/gst/gstr1", { params });
        return response.data.data;
    },
    async getGstr3b(params) {
        const response = await api.get("/tax/gst/gstr3b", { params });
        return response.data.data;
    },
    async exportGstReturn(params) {
        const response = await api.post("/tax/gst/export", {}, {
            params: {
                return: params.returnType,
                format: params.format,
            },
            responseType: "blob",
        });
        return response.data;
    },
    async getTdsSummary(params) {
        const response = await api.get("/tax/tds", { params });
        return response.data.data;
    },
    async getHsnMaster() {
        const response = await api.get("/tax/hsn");
        return response.data.data;
    },
    async createHsn(payload) {
        const response = await api.post("/tax/hsn", payload);
        return response.data.data;
    },
    async updateHsn(id, payload) {
        const response = await api.put(`/tax/hsn/${id}`, payload);
        return response.data.data;
    },
};
