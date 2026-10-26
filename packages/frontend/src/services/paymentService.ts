import { api } from "@/lib/axios";

export interface PaymentData {
  id: number;
  date: string;
  mode: string;
  amount: number;
  reference?: string | null;
  notes?: string | null;
  invoiceId?: number | null;
  billId?: number | null;
  customerId?: number | null;
  customer?: { id: number; name: string };
  invoice?: { id: number; invoiceNo: string; grandTotal: number };
}

export interface PaymentUpdateInput {
  date: string;
  mode: string;
  amount: number;
  reference?: string | null;
  notes?: string | null;
  accountId?: number | string | null;
}

export const paymentService = {
  async listSupplierPayments(params: Record<string, unknown> = {}) {
    const response = await api.get("/payments/suppliers", { params });
    return response.data.data;
  },

  async createSupplierPayment(payload: {
    supplierId: number;
    accountId: number | string;
    billId?: number | string | null;
    date: string;
    amount: number;
    mode: string;
    reference?: string;
    notes?: string;
  }) {
    const response = await api.post("/payments/suppliers", payload);
    return response.data.data;
  },

  async getById(id: number): Promise<PaymentData> {
    const response = await api.get(`/payments/${id}`);
    return response.data.data;
  },

  async update(id: number, payload: PaymentUpdateInput): Promise<PaymentData> {
    const response = await api.put(`/payments/${id}`, payload);
    return response.data.data;
  },

  async delete(id: number): Promise<{ id: number }> {
    const response = await api.delete(`/payments/${id}`);
    return response.data.data;
  },
};
