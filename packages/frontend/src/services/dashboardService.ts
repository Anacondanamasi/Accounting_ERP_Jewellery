import { api } from "@/lib/axios";

export interface DashboardSummary {
  revenueMtd: number;
  receivables: number;
  payables: number;
  bankBalance: number;
  stockValue: number;
  revenueChart: Array<{ month: string; revenue: number; expense: number }>;
  categoryChart: Array<{ category: string; value: number }>;
  recentTransactions: Array<{
    id: number;
    date: string;
    type: string;
    narration: string;
    amount: number;
    balance: number;
  }>;
  alerts: Array<{ id: number; message: string; type: "info" | "warn" | "critical" }>;
}

export const dashboardService = {
  async getSummary() {
    const response = await api.get<{ data: DashboardSummary }>("/dashboard/summary");
    return response.data.data;
  },
};
