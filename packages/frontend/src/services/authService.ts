import type { ForgotPasswordInput, LoginInput, LoginResponse, RegisterInput } from "@jewelledger/shared";
import { api } from "@/lib/axios";

export const authService = {
  async login(payload: LoginInput): Promise<LoginResponse> {
    const response = await api.post("/auth/login", payload);
    return response.data.data;
  },
  async forgotPassword(payload: ForgotPasswordInput): Promise<void> {
    await api.post("/auth/forgot-password", payload);
  },
  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
  async me(): Promise<{ user: LoginResponse["user"]; companies: LoginResponse["companies"] }> {
    const response = await api.get("/auth/me");
    return response.data.data;
  },
  async register(payload: RegisterInput): Promise<{ user: { id: string; email: string }; verificationLinkPreview?: string }> {
    const response = await api.post("/auth/register", payload);
    return response.data.data;
  },
  async verifyEmail(token: string): Promise<LoginResponse> {
    const response = await api.post("/auth/verify-email", null, { params: { token } });
    return response.data.data;
  },
  async resendVerification(email: string): Promise<{ verificationLinkPreview?: string }> {
    const response = await api.post("/auth/resend-verification", { email });
    return response.data.data;
  },
};
