import { api } from "@/lib/axios";

export interface GstCalendarItem {
  id: number;
  returnType: "GSTR1" | "GSTR3B";
  periodLabel: string;
  dueDate: string;
  status: "UPCOMING" | "FILED" | "OVERDUE";
}

export interface Gstr1B2BRow {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  gstin: string;
  pos: string;
  supplyType: "INTRA" | "INTER";
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  total: number;
  reverseCharge: string;
}

export interface Gstr1B2CLRow {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  pos: string;
  taxableValue: number;
  igst: number;
  taxAmount: number;
  total: number;
}

export interface Gstr1B2CSRow {
  pos: string;
  supplyType: string;
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  count: number;
}

export interface Gstr1HsnRow {
  hsnCode: string;
  description: string;
  uqc: string;
  qty: number;
  taxableValue: number;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalValue: number;
}

export interface Gstr1CdnRow {
  noteNo: string;
  noteType: "CREDIT" | "DEBIT";
  date: string;
  customerName: string;
  gstin: string;
  referenceNo: string;
  pos: string;
  taxableValue: number;
  taxAmount: number;
  total: number;
}

export interface Gstr1DocIssueRow {
  docType: number;
  name: string;
  from: string;
  to: string;
  totalCount: number;
  cancelledCount: number;
  netIssued: number;
}

export interface Gstr1Response {
  period: { month?: number; year?: number; quarter?: string; fp: string; periodLabel: string };
  company: {
    name: string;
    gstin: string;
    state: string;
    stateCode: string;
  };
  calendar: GstCalendarItem[];
  b2b: Gstr1B2BRow[];
  b2cl: Gstr1B2CLRow[];
  b2cs: Gstr1B2CSRow[];
  cdn: Gstr1CdnRow[];
  hsn: Gstr1HsnRow[];
  docIssue: Gstr1DocIssueRow[];
  totals: {
    invoiceCount: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    taxAmount: number;
    grandTotal: number;
  };
}

export interface Gstr3bResponse {
  period: { month?: number; year?: number; quarter?: string; fp: string; periodLabel: string };
  company: {
    name: string;
    gstin: string;
    state: string;
    stateCode: string;
  };
  outward: {
    taxableValue: number;
    taxAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    invoiceCount: number;
  };
  itc: {
    eligible: number;
    cgst: number;
    sgst: number;
    igst: number;
    blocked: number;
    reversed: number;
    net: number;
    purchaseCount: number;
  };
  setOff: {
    payable: { igst: number; cgst: number; sgst: number };
    used: { igst: number; cgst: number; sgst: number };
    carry: { igst: number; cgst: number; sgst: number };
  };
  netTaxPayable: number;
}

export interface PurchaseBillFor2B {
  id: number;
  billNo: string;
  date: string;
  supplierName: string;
  supplierGstin: string;
  supplierState?: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grandTotal: number;
  status: string;
  isInPeriod: boolean;
}

export interface Purchases2BResponse {
  period: { month?: number; year?: number; quarter?: string; fp: string; periodLabel: string };
  purchases: PurchaseBillFor2B[];
  periodPurchases: PurchaseBillFor2B[];
}

export interface TdsSummaryResponse {
  rows: Array<{
    id: number;
    vendorName: string;
    gstin: string;
    section: string;
    thresholdCrossed: boolean;
    purchaseAmount: number;
    threshold: number;
    tdsRate: number;
    tdsAmount: number;
    billCount: number;
    deductedAt: string;
  }>;
  totals: {
    totalPurchases: number;
    totalTds: number;
    vendors: number;
    vendorsOverThreshold: number;
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
  async getGstr1(params: { month?: number; year?: number; quarter?: string }) {
    const response = await api.get("/tax/gst/gstr1", { params });
    return response.data.data as Gstr1Response;
  },
  async getGstr3b(params: { month?: number; year?: number; quarter?: string }) {
    const response = await api.get("/tax/gst/gstr3b", { params });
    return response.data.data as Gstr3bResponse;
  },
  async getPurchasesFor2B(params: { month?: number; year?: number; quarter?: string }) {
    const response = await api.get("/tax/gst/purchases", { params });
    return response.data.data as Purchases2BResponse;
  },
  async exportGstReturn(params: { returnType: "gstr1" | "gstr3b"; format: "json" | "excel"; month?: number; year?: number; quarter?: string }) {
    const response = await api.post(
      "/tax/gst/export",
      {},
      {
        params: {
          return: params.returnType,
          format: params.format,
          month: params.month,
          year: params.year,
          quarter: params.quarter,
        },
        responseType: "blob",
      },
    );
    return response.data as Blob;
  },
  async getTdsSummary(params?: { from?: string; to?: string }) {
    const response = await api.get("/tax/tds", { params });
    return response.data.data as TdsSummaryResponse;
  },
  async getHsnMaster() {
    const response = await api.get("/tax/hsn");
    return response.data.data as HsnMasterRow[];
  },
  async getTaxCodes() {
    const response = await api.get("/tax/codes");
    return response.data.data;
  },
  async validateGstin(gstin: string) {
    const response = await api.post("/tax/validate-gstin", { gstin });
    const data = response.data.data;
    return {
      ...data,
      valid: Boolean(data?.isValid),
    } as {
      isValid: boolean;
      valid: boolean;
      gstin: string;
      stateCode: string;
      stateName: string;
      pan: string;
      entityNumber: string;
      checksumValid: boolean;
      error?: string;
    };
  },
  async calculateTax(payload: {
    documentType?: "INVOICE" | "BILL" | "EXPENSE" | "CREDIT_NOTE" | "DEBIT_NOTE";
    documentNo?: string;
    supplierGstin?: string | null;
    supplierState?: string | null;
    recipientGstin?: string | null;
    recipientState?: string | null;
    placeOfSupply?: string | null;
    treatment?: string | null;
    isExport?: boolean;
    isLut?: boolean;
    isTaxInclusive?: boolean;
    paymentMethodAccountId?: number | null;
    lines: Array<{
      amount: number;
      rate: number;
      cessRate?: number;
      cessAmount?: number;
      discountPct?: number;
      isRcm?: boolean;
      itcEligibility?: string;
    }>;
  }) {
    const response = await api.post("/tax/calculate", payload);
    return response.data.data;
  },
  async postSettlement(payload: { month: number; year: number }) {
    const response = await api.post("/tax/gst/settle", payload);
    return response.data.data;
  },
  async getItcRegister(params?: { from?: string; to?: string }) {
    const response = await api.get("/tax/registers/itc", { params });
    return response.data.data;
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
