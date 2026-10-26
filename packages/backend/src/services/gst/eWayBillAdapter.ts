export interface EWayBillInput {
  documentType: "INV" | "BIL" | "BOE" | "CHL";
  documentNumber: string;
  documentDate: string;
  supplyType: "OUTWARD" | "INWARD";
  subSupplyType: "SUPPLY" | "EXPORT" | "JOB_WORK" | "SKD_CKD" | "RECIPIENT_NOT_KNOWN" | "OTHERS";
  supplier: {
    gstin: string;
    stateCode: string;
    pincode: number;
    address: string;
  };
  recipient: {
    gstin: string;
    stateCode: string;
    pincode: number;
    address: string;
  };
  totalValue: number;
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  cessValue: number;
  transporterId?: string;
  transporterName?: string;
  transportMode: "ROAD" | "RAIL" | "AIR" | "SHIP";
  distanceKm: number;
  vehicleNumber?: string;
  vehicleType?: "REGULAR" | "OVER_DIMENSIONAL";
}

export interface EWayBillResult {
  success: boolean;
  ewayBillNo?: string;
  ewayBillDate?: string;
  validUpto?: string;
  error?: string;
}

export interface IEWayBillAdapter {
  generate(payload: EWayBillInput): Promise<EWayBillResult>;
  cancel(ewbNo: string, reasonCode: string, remarks: string): Promise<{ success: boolean; cancelDate?: string; error?: string }>;
  updateVehicle(ewbNo: string, vehicleNo: string, fromPlace: string, fromState: string, reasonCode: string): Promise<any>;
}

export class NicGspEWayBillAdapter implements IEWayBillAdapter {
  private isSandbox: boolean;

  constructor(isSandbox = true) {
    this.isSandbox = isSandbox;
  }

  async generate(payload: EWayBillInput): Promise<EWayBillResult> {
    // Statutory Threshold Check: E-Way bill mandatory if consignment value > ₹50,000 (Rule 138)
    const isInterstate = payload.supplier.stateCode !== payload.recipient.stateCode;
    if (payload.totalValue < 50000 && !isInterstate) {
      // Voluntary generation permitted under GST Rule 138
    }

    const ewbNo = `32${String(Date.now()).slice(-10)}`;
    const now = new Date();
    // Validity: 1 day per 200 km for regular cargo
    const validityDays = Math.max(1, Math.ceil(payload.distanceKm / 200));
    const validUpto = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    return {
      success: true,
      ewayBillNo: ewbNo,
      ewayBillDate: now.toISOString(),
      validUpto,
    };
  }

  async cancel(ewbNo: string, reasonCode: string, remarks: string) {
    return {
      success: true,
      cancelDate: new Date().toISOString(),
    };
  }

  async updateVehicle(ewbNo: string, vehicleNo: string, fromPlace: string, fromState: string, reasonCode: string) {
    return {
      success: true,
      ewbNo,
      vehicleNo,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const defaultEWayBillAdapter = new NicGspEWayBillAdapter(true);
