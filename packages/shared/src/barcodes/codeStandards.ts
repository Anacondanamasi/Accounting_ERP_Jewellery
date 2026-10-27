/**
 * Item QR & Barcode Standards
 * 
 * Crockford Base32 Code Generation, Check Digit, Symbology Classification,
 * EAN/UPC Checksums, and Multi-Tenant QR Payload Formats.
 */

// Crockford Base32 Alphabet (32 chars)
// Excludes I, L, O, U to prevent visual ambiguity and accidental words
export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Normalizes user-typed or scanned code:
 * Converts lowercase to uppercase, trims whitespace,
 * maps visually ambiguous characters: I, L -> 1; O -> 0.
 */
export function normalizeCodeString(input: string): string {
  if (!input) return "";
  let clean = input.trim().toUpperCase();
  // Strip common scanner prefix/suffix (STX, ETX, CR, LF, Tab)
  clean = clean.replace(/[\x02\x03\r\n\t]/g, "").trim();
  // Map ambiguous chars for internal codes
  clean = clean.replace(/I|L/g, "1").replace(/O/g, "0");
  return clean;
}

/**
 * Computes a weighted Mod-32 check character for Crockford Base32 payload.
 * Guarantees every check character is strictly alphanumeric [0-9A-Z],
 * scanner-safe with no symbols.
 */
export function computeCheckChar(payload: string): string {
  const clean = payload.toUpperCase().replace(/[^0-9A-Z]/g, "");
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    const val = CROCKFORD_ALPHABET.indexOf(clean[i]);
    const weight = (i % 3) + 1; // 1, 2, 3 cyclical weighting
    if (val >= 0) {
      sum = (sum + val * weight) % 32;
    }
  }
  return CROCKFORD_ALPHABET[sum % 32] || "0";
}

/**
 * Verifies if an internal code has a valid Mod-32 check character.
 */
export function verifyCheckChar(fullCode: string): boolean {
  const clean = fullCode.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (clean.length < 3) return false;
  const payload = clean.slice(0, -1);
  const checkChar = clean.slice(-1);
  return computeCheckChar(payload) === checkChar;
}

/**
 * Generates an internal Crockford Base32 code with format: HK-XXXX-XXXX
 * 7 random base32 chars + 1 check character (8 characters total payload).
 */
export function generateInternalCode(prefix: string = "HK"): string {
  let body = "";
  for (let i = 0; i < 7; i++) {
    const idx = Math.floor(Math.random() * CROCKFORD_ALPHABET.length);
    body += CROCKFORD_ALPHABET[idx];
  }
  const cleanPrefix = prefix.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  const check = computeCheckChar(cleanPrefix + body);
  const full = body + check;
  return `${prefix}-${full.slice(0, 4)}-${full.slice(4)}`;
}

/**
 * Creates a deterministic, non-sensitive 6-character hex token for a company.
 * Prevents exposing company ID while enabling cross-tenant scan detection.
 */
export function computeCompanyToken(companyId: number): string {
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset
  const str = `hks_co_${companyId}_tenant_token`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV-1a prime
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return hex.slice(0, 6);
}

/**
 * Formats a scannable QR payload: ITM1:<company_token>:<code>
 */
export function formatQrPayload(companyId: number, code: string): string {
  const token = computeCompanyToken(companyId);
  return `ITM1:${token}:${code.trim().toUpperCase()}`;
}

export interface ParsedQrPayload {
  raw: string;
  isInternalQr: boolean;
  companyToken?: string;
  code: string;
  batch?: string;
}

/**
 * Parses any raw scan string.
 * Supports:
 * - ITM1:<token>:<code>
 * - ITM1:<token>:<code>:B<batch>
 * - Plain <code> (e.g. HK-7X9K-2M or EAN/UPC/SKU)
 */
export function parseScanPayload(raw: string): ParsedQrPayload {
  const clean = raw.trim();
  if (clean.startsWith("ITM1:")) {
    const parts = clean.split(":");
    // parts[0] = ITM1, parts[1] = token, parts[2] = code, parts[3] = optional batch
    const token = parts[1] || "";
    const code = parts[2] || "";
    let batch: string | undefined;
    if (parts[3] && parts[3].startsWith("B")) {
      batch = parts[3].slice(1);
    }
    return {
      raw: clean,
      isInternalQr: true,
      companyToken: token,
      code: code.toUpperCase(),
      batch,
    };
  }

  return {
    raw: clean,
    isInternalQr: false,
    code: clean.toUpperCase(),
  };
}

/**
 * EAN-13 Checksum validator (Modulo 10 with 1/3 alternating weights).
 */
export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[12], 10);
}

/**
 * UPC-A Checksum validator (12 digits, Modulo 10 with 3/1 alternating weights).
 */
export function isValidUpcA(code: string): boolean {
  if (!/^\d{12}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[11], 10);
}

/**
 * EAN-8 Checksum validator (8 digits).
 */
export function isValidEan8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[7], 10);
}

export type SymbologyClassification =
  | "INTERNAL_QR"
  | "INTERNAL_CODE"
  | "EAN13"
  | "UPCA"
  | "EAN8"
  | "CODE128"
  | "PAYMENT_QR"
  | "E_INVOICE_QR"
  | "URL"
  | "UNKNOWN";

export interface ScanClassification {
  symbology: SymbologyClassification;
  parsed: ParsedQrPayload;
  isItemCode: boolean;
  message?: string;
}

/**
 * Classifies an incoming scan before database lookup.
 * Rejects non-item QR codes (UPI payment QR, e-Invoice QR, generic web URLs).
 */
export function classifyScanInput(rawInput: string): ScanClassification {
  const trimmed = rawInput.trim();

  // 1. UPI Payment QR: upi://pay?pa=...
  if (/^upi:\/\//i.test(trimmed)) {
    return {
      symbology: "PAYMENT_QR",
      parsed: { raw: trimmed, isInternalQr: false, code: trimmed },
      isItemCode: false,
      message: "Scanned code is a UPI payment QR, not an inventory item.",
    };
  }

  // 2. GST E-Invoice / IRN QR
  if (trimmed.includes("IRN:") || (trimmed.startsWith("{") && trimmed.includes("Irn"))) {
    return {
      symbology: "E_INVOICE_QR",
      parsed: { raw: trimmed, isInternalQr: false, code: trimmed },
      isItemCode: false,
      message: "Scanned code is a GST e-Invoice QR, not an inventory item.",
    };
  }

  // 3. Generic Web URLs
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      symbology: "URL",
      parsed: { raw: trimmed, isInternalQr: false, code: trimmed },
      isItemCode: false,
      message: "Scanned code is an external web link, not an item code.",
    };
  }

  // 4. Internal Scannable QR: ITM1:<token>:<code>
  if (trimmed.startsWith("ITM1:")) {
    const parsed = parseScanPayload(trimmed);
    return {
      symbology: "INTERNAL_QR",
      parsed,
      isItemCode: true,
    };
  }

  // 5. Standard EAN-13
  if (/^\d{13}$/.test(trimmed) && isValidEan13(trimmed)) {
    return {
      symbology: "EAN13",
      parsed: { raw: trimmed, isInternalQr: false, code: trimmed },
      isItemCode: true,
    };
  }

  // 6. Standard UPC-A
  if (/^\d{12}$/.test(trimmed) && isValidUpcA(trimmed)) {
    return {
      symbology: "UPCA",
      parsed: { raw: trimmed, isInternalQr: false, code: trimmed },
      isItemCode: true,
    };
  }

  // 7. Standard EAN-8
  if (/^\d{8}$/.test(trimmed) && isValidEan8(trimmed)) {
    return {
      symbology: "EAN8",
      parsed: { raw: trimmed, isInternalQr: false, code: trimmed },
      isItemCode: true,
    };
  }

  // 8. Internal Formatted Code: HK-XXXX-XXXX
  if (/^[A-Z]{2}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(trimmed.toUpperCase())) {
    return {
      symbology: "INTERNAL_CODE",
      parsed: { raw: trimmed, isInternalQr: false, code: trimmed.toUpperCase() },
      isItemCode: true,
    };
  }

  // 9. Standard 1D Barcode / Alphanumeric SKU
  if (/^[A-Za-z0-9\-_./]{2,40}$/.test(trimmed)) {
    return {
      symbology: "CODE128",
      parsed: { raw: trimmed, isInternalQr: false, code: trimmed.toUpperCase() },
      isItemCode: true,
    };
  }

  return {
    symbology: "UNKNOWN",
    parsed: { raw: trimmed, isInternalQr: false, code: trimmed },
    isItemCode: false,
    message: "Unrecognized barcode or QR format.",
  };
}
