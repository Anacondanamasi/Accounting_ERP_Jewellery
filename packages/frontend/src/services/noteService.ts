import { api } from "@/lib/axios";

export interface NoteLinePayload {
  description: string;
  quantity: number;
  rate: number;
  gstPct: number;
}

export interface NotePayload {
  date: string;
  partyType: "CUSTOMER" | "SUPPLIER";
  customerId?: number | null;
  supplierId?: number | null;
  referenceNo?: string | null;
  reason?: string | null;
  lines: NoteLinePayload[];
}

const createNoteService = (basePath: "/credit-notes" | "/debit-notes") => ({
  async list() {
    const response = await api.get(basePath);
    return response.data.data;
  },
  async getById(id: number) {
    const response = await api.get(`${basePath}/${id}`);
    return response.data.data;
  },
  async create(payload: NotePayload) {
    const response = await api.post(basePath, payload);
    return response.data.data;
  },
  async update(id: number, payload: NotePayload) {
    const response = await api.put(`${basePath}/${id}`, payload);
    return response.data.data;
  },
});

export const noteService = {
  credit: createNoteService("/credit-notes"),
  debit: createNoteService("/debit-notes"),
};
