import { STATE_NAMES, STATE_CODES, type SupplyType, type GstTreatment } from "./constants";
import { extractStateCode } from "./gstinValidator";

export interface PosEvaluationInput {
  supplierGstin?: string | null;
  supplierState?: string | null;
  recipientGstin?: string | null;
  recipientState?: string | null;
  placeOfSupply?: string | null; // Can be 2-digit code or state name
  treatment?: GstTreatment | null;
  isExport?: boolean;
  isImport?: boolean;
  isLut?: boolean;
}

export interface PosEvaluationResult {
  supplierStateCode: string;
  posStateCode: string;
  supplyType: SupplyType;
  isInterstate: boolean;
  isSez: boolean;
  isExport: boolean;
  isImport: boolean;
  isZeroRated: boolean;
  description: string;
}

export const evaluatePlaceOfSupply = (input: PosEvaluationInput): PosEvaluationResult => {
  // 1. Resolve Supplier State Code
  let supplierStateCode = extractStateCode(input.supplierGstin) || extractStateCode(input.supplierState);
  if (!supplierStateCode) {
    supplierStateCode = "24"; // Default Gujarat if unspecified
  }

  // 2. Resolve Place of Supply State Code
  let posStateCode =
    extractStateCode(input.placeOfSupply) ||
    extractStateCode(input.recipientGstin) ||
    extractStateCode(input.recipientState) ||
    supplierStateCode;

  const treatment = input.treatment ?? "REGULAR";
  const isSez = treatment === "SEZ_WITH_PAY" || treatment === "SEZ_WITHOUT_PAY";
  const isExport = Boolean(input.isExport || treatment === "OVERSEAS");
  const isImport = Boolean(input.isImport);

  // IGST Act Section 7(5)(b): Supply of goods or services to or by a Special Economic Zone developer or unit is INTER-STATE
  if (isSez) {
    return {
      supplierStateCode,
      posStateCode: "97", // Other Territory or special economic zone
      supplyType: "SEZ",
      isInterstate: true,
      isSez: true,
      isExport: false,
      isImport: false,
      isZeroRated: true,
      description: `SEZ Supply (${treatment === "SEZ_WITHOUT_PAY" ? "Without tax payment under LUT" : "With payment of IGST"})`,
    };
  }

  // IGST Act Section 16: Zero-rated export
  if (isExport) {
    return {
      supplierStateCode,
      posStateCode: "96", // Foreign
      supplyType: "EXPORT",
      isInterstate: true,
      isSez: false,
      isExport: true,
      isImport: false,
      isZeroRated: true,
      description: input.isLut ? "Export under LUT / Bond (Zero-Rated)" : "Export with payment of IGST",
    };
  }

  if (isImport) {
    return {
      supplierStateCode: "96",
      posStateCode: supplierStateCode,
      supplyType: "IMPORT",
      isInterstate: true,
      isSez: false,
      isExport: false,
      isImport: true,
      isZeroRated: false,
      description: "Import of Goods/Services (IGST applicable at customs/RCM)",
    };
  }

  // Normal domestic transaction: Compare Supplier State with POS State
  const isInterstate = supplierStateCode !== posStateCode;
  const supplyType: SupplyType = isInterstate ? "INTER_STATE" : "INTRA_STATE";

  const supplierStateName = STATE_NAMES[supplierStateCode] || supplierStateCode;
  const posStateName = STATE_NAMES[posStateCode] || posStateCode;

  return {
    supplierStateCode,
    posStateCode,
    supplyType,
    isInterstate,
    isSez: false,
    isExport: false,
    isImport: false,
    isZeroRated: false,
    description: isInterstate
      ? `Inter-State Supply (${supplierStateName} -> ${posStateName}): IGST applies`
      : `Intra-State Supply (${supplierStateName}): CGST + SGST applies`,
  };
};
