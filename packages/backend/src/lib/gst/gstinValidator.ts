import { STATE_NAMES, STATE_CODES } from "./constants";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const ALPHANUMERIC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Calculates the checksum character for a 14-character GSTIN prefix using Luhn Modulo 36.
 */
export const calculateGstinChecksum = (gstin14: string): string => {
  if (!gstin14 || gstin14.length < 14) return "";
  const chars = gstin14.toUpperCase();
  let factor = 2;
  let sum = 0;

  for (let i = chars.length - 1; i >= 0; i--) {
    const codePoint = ALPHANUMERIC_CHARS.indexOf(chars[i]);
    if (codePoint === -1) return "";

    const addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(addend / 36) + (addend % 36);
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  return ALPHANUMERIC_CHARS[checkCodePoint];
};

export interface GstinValidationResult {
  isValid: boolean;
  gstin: string;
  stateCode: string;
  stateName: string;
  pan: string;
  entityNumber: string;
  checksumValid: boolean;
  error?: string;
}

export const validateGstin = (rawGstin: string | null | undefined): GstinValidationResult => {
  const gstin = String(rawGstin ?? "").trim().toUpperCase();

  if (!gstin) {
    return {
      isValid: false,
      gstin: "",
      stateCode: "",
      stateName: "",
      pan: "",
      entityNumber: "",
      checksumValid: false,
      error: "GSTIN is empty",
    };
  }

  if (gstin.length !== 15) {
    return {
      isValid: false,
      gstin,
      stateCode: "",
      stateName: "",
      pan: "",
      entityNumber: "",
      checksumValid: false,
      error: `GSTIN must be exactly 15 characters (got ${gstin.length})`,
    };
  }

  if (!GSTIN_REGEX.test(gstin)) {
    return {
      isValid: false,
      gstin,
      stateCode: "",
      stateName: "",
      pan: "",
      entityNumber: "",
      checksumValid: false,
      error: "Invalid GSTIN format (e.g. 24AAAAA0000A1Z5)",
    };
  }

  const stateCode = gstin.substring(0, 2);
  const stateName = STATE_NAMES[stateCode] || "Unknown State";
  const pan = gstin.substring(2, 12);
  const entityNumber = gstin[12];
  const expectedChecksum = calculateGstinChecksum(gstin.substring(0, 14));
  const checksumValid = gstin[14] === expectedChecksum;

  return {
    isValid: true,
    gstin,
    stateCode,
    stateName,
    pan,
    entityNumber,
    checksumValid,
    error: checksumValid ? undefined : "Checksum digit does not match standard algorithm",
  };
};

export const extractStateCode = (gstinOrState: string | null | undefined): string => {
  if (!gstinOrState) return "";
  const trimmed = gstinOrState.trim();
  if (/^\d{2}[A-Z0-9]{13}$/i.test(trimmed)) {
    return trimmed.substring(0, 2);
  }
  if (/^\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.toLowerCase();
  return STATE_CODES[normalized] || "";
};
