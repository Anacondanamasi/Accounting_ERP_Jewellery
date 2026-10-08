import { api } from "@/lib/axios";
export const authService = {
    async login(payload) {
        const response = await api.post("/auth/login", payload);
        return response.data.data;
    },
    async forgotPassword(payload) {
        await api.post("/auth/forgot-password", payload);
    },
    async logout() {
        await api.post("/auth/logout");
    },
    async me() {
        const response = await api.get("/auth/me");
        return response.data.data;
    },
    async register(payload) {
        const response = await api.post("/auth/register", payload);
        return response.data.data;
    },
    async verifyEmail(token) {
        const response = await api.post("/auth/verify-email", null, { params: { token } });
        return response.data.data;
    },
    async resendVerification(email) {
        const response = await api.post("/auth/resend-verification", { email });
        return response.data.data;
    },
};
