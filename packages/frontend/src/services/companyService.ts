import { api } from "@/lib/axios";

export const companyService = {
  async list() {
    const response = await api.get("/companies");
    return response.data.data as Array<{
      id: string;
      name: string;
      logoUrl?: string | null;
      status: "active" | "suspended" | "trial" | "cancelled";
      trialEndsAt?: string | null;
      planName: string;
      role: string;
      membershipStatus: "pending" | "active" | "suspended" | "revoked";
    }>;
  },
  async create(payload: {
    name: string;
    legalName?: string;
    countryCode: string;
    currencyCode: string;
    timezone: string;
    fiscalYearStart: string;
  }) {
    const response = await api.post("/companies", payload);
    return response.data.data as { id: string; name: string };
  },
};

