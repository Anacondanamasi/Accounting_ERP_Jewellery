import { api } from "@/lib/axios";

export const settlementService = {
  /** Get all active settlements on an invoice or bill */
  getSettlements: (targetType: "invoice" | "bill", targetId: number | string) =>
    api.get(`/settlements/${targetType}/${targetId}`).then((r) => r.data.data),

  /** Full outstanding summary with linked settlements */
  getSummary: (targetType: "invoice" | "bill", targetId: number | string) =>
    api.get(`/settlements/summary/${targetType}/${targetId}`).then((r) => r.data.data),

  /** Open invoices or bills for a party (for the apply-note modal) */
  getOpenDocuments: (params: { partyType: string; partyId: number; docType: "invoice" | "bill" }) =>
    api.get("/settlements/open-documents", { params }).then((r) => r.data.data),

  /** Apply a credit/debit note to one or more invoices/bills */
  applyNote: (payload: {
    sourceNoteId: number;
    allocations: { targetId: number; amount: number }[];
    settledAt?: string;
    notes?: string;
  }) => api.post("/settlements/apply-note", payload).then((r) => r.data),

  /** Apply a payment to invoices/bills (split allocation) */
  applyPayment: (payload: {
    sourcePaymentId: number;
    allocations: { targetId: number; targetType: "INVOICE" | "BILL"; amount: number }[];
    settledAt?: string;
    notes?: string;
  }) => api.post("/settlements/apply-payment", payload).then((r) => r.data),

  /** Reverse (unlink) a settlement by ID */
  reverse: (settlementId: number) =>
    api.delete(`/settlements/${settlementId}`).then((r) => r.data),
};
