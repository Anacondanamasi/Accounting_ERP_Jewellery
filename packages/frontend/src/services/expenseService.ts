import { api } from "@/lib/axios";

export const expenseService = {
  async list(params: Record<string, unknown> = {}) {
    const response = await api.get("/expenses", { params });
    return response.data.data as any[];
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post("/expenses", payload);
    return response.data.data;
  },
};
