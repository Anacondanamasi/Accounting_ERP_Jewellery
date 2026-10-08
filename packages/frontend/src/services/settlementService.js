import { api } from "@/lib/axios";
export const settlementService = {
    /** Get all active settlements on an invoice or bill */
    getSettlements: (targetType, targetId) => api.get(`/settlements/${targetType}/${targetId}`).then((r) => r.data.data),
    /** Full outstanding summary with linked settlements */
    getSummary: (targetType, targetId) => api.get(`/settlements/summary/${targetType}/${targetId}`).then((r) => r.data.data),
    /** Open invoices or bills for a party (for the apply-note modal) */
    getOpenDocuments: (params) => api.get("/settlements/open-documents", { params }).then((r) => r.data.data),
    /** Apply a credit/debit note to one or more invoices/bills */
    applyNote: (payload) => api.post("/settlements/apply-note", payload).then((r) => r.data),
    /** Apply a payment to invoices/bills (split allocation) */
    applyPayment: (payload) => api.post("/settlements/apply-payment", payload).then((r) => r.data),
    /** Reverse (unlink) a settlement by ID */
    reverse: (settlementId) => api.delete(`/settlements/${settlementId}`).then((r) => r.data),
};
