import { api } from "@/lib/axios";

export interface GstCalendarItem {
  id: number;
  returnType: "GSTR1" | "GSTR3B";
  periodLabel: string;
  dueDate: string;
  status: "UPCOMING" | "FILED" | "OVERDUE";
}

export interface Gstr1Response {
  period: { month: number; year: number };
  calendar: GstCalendarItem[];
  b2b: Array<{
    invoiceNo: string;
    invoiceDate: string;
    customerName: string;
    gstin: string;
    taxableValue: number;
    gstRate: number;
    taxAmount: number;
    total: number;
  }>;
  b2c: Array<{
    rate: number;
    taxableValue: number;
    taxAmount: number;
    invoiceCount: number;
  }>;
  hsn: Array<{
    hsnCode: string;
    description: string;
    qty: number;
    taxableValue: number;
    gstRate: number;
    taxAmount: number;
  }>;
  cdn: Array<{
    noteNo: string;
    noteType: "CREDIT" | "DEBIT";
    customerName: string;
    taxableValue: number;
    gstRate: number;
    taxAmount: number;
  }>;
  totals: {
    taxableValue: number;
    taxAmount: number;
    invoiceCount: number;
  };
}

export interface Gstr3bResponse {
  period: { month: number; year: number };
  outward: {
    taxableValue: number;
    taxAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
  };
  itc: {
    eligible: number;
    blocked: number;
    reversed: number;
    net: number;
  };
  netTaxPayable: number;
}

export interface TdsSummaryResponse {
  from: string | null;
  to: string | null;
  rows: Array<{
    id: number;
    vendorName: string;
    section: string;
    thresholdCrossed: boolean;
    purchaseAmount: number;
    tdsRate: number;
    tdsAmount: number;
    deductedAt: string;
    filedAt?: string;
  }>;
  totals: {
    totalPurchases: number;
    totalTds: number;
    vendors: number;
  };
}

export interface HsnMasterRow {
  id: number;
  code: string;
  description: string;
  gstRate: number;
  cessRate: number;
  isActive: boolean;
}

export interface HsnPayload {
  code: string;
  description: string;
  gstRate: number;
  cessRate: number;
  isActive: boolean;
}

export const taxService = {
  async getGstr1(params: { month: number; year: number }) {
    const response = await api.get("/tax/gst/gstr1", { params });
    return response.data.data as Gstr1Response;
  },
  async getGstr3b(params: { month: number; year: number }) {
    const response = await api.get("/tax/gst/gstr3b", { params });
    return response.data.data as Gstr3bResponse;
  },
  async exportGstReturn(params: { returnType: "gstr1" | "gstr3b"; format: "json" | "excel" }) {
    const response = await api.post(
      "/tax/gst/export",
      {},
      {
        params: {
          return: params.returnType,
          format: params.format,
        },
        responseType: "blob",
      },
    );
    return response.data as Blob;
  },
  async getTdsSummary(params: { from?: string; to?: string }) {
    const response = await api.get("/tax/tds", { params });
    return response.data.data as TdsSummaryResponse;
  },
  async getHsnMaster() {
    const response = await api.get("/tax/hsn");
    return response.data.data as HsnMasterRow[];
  },
  async createHsn(payload: HsnPayload) {
    const response = await api.post("/tax/hsn", payload);
    return response.data.data as HsnMasterRow;
  },
  async updateHsn(id: number, payload: Partial<HsnPayload>) {
    const response = await api.put(`/tax/hsn/${id}`, payload);
    return response.data.data as HsnMasterRow;
  },
};
