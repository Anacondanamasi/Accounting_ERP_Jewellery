import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateInternalCode,
  verifyCheckChar,
  computeCheckChar,
  computeCompanyToken,
  formatQrPayload,
  parseScanPayload,
  isValidEan13,
  isValidUpcA,
  isValidEan8,
  classifyScanInput,
  normalizeCodeString,
} from "@jewelledger/shared";

describe("Item QR & Barcode Standards Unit Tests", () => {
  it("generates valid internal Crockford Base32 codes with verifiable check characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInternalCode("HK");
      assert.match(code, /^HK-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
      assert.equal(verifyCheckChar(code), true);
    }
  });

  it("detects corrupted or typoed check characters", () => {
    const code = generateInternalCode("HK");
    assert.equal(verifyCheckChar(code), true);

    // Corrupt check character
    const lastChar = code.slice(-1);
    const corruptedCheck = lastChar === "A" ? "B" : "A";
    const corrupted = `${code.slice(0, -1)}${corruptedCheck}`;
    assert.equal(verifyCheckChar(corrupted), false);

    // Corrupt body character
    const bodyChar = code[3];
    const corruptedBodyChar = bodyChar === "X" ? "Y" : "X";
    const corruptedBody = `${code.slice(0, 3)}${corruptedBodyChar}${code.slice(4)}`;
    assert.equal(verifyCheckChar(corruptedBody), false);
  });

  it("normalizes visually ambiguous characters (I/L -> 1, O -> 0)", () => {
    assert.equal(normalizeCodeString("  hk-7xil-3mo2 \r\n"), "HK-7X11-3M02");
  });

  it("computes deterministic company token and formats QR payload", () => {
    const token1 = computeCompanyToken(1);
    const token2 = computeCompanyToken(1);
    const tokenOther = computeCompanyToken(2);

    assert.equal(token1, token2);
    assert.notEqual(token1, tokenOther);
    assert.equal(token1.length, 6);

    const payload = formatQrPayload(1, "HK-7X9K-3M2P");
    assert.equal(payload, `ITM1:${token1}:HK-7X9K-3M2P`);

    const parsed = parseScanPayload(payload);
    assert.equal(parsed.isInternalQr, true);
    assert.equal(parsed.companyToken, token1);
    assert.equal(parsed.code, "HK-7X9K-3M2P");
  });

  it("validates standard manufacturer EAN-13, UPC-A, and EAN-8 barcodes", () => {
    // Standard valid EAN-13 codes
    assert.equal(isValidEan13("4006381333931"), true);
    assert.equal(isValidEan13("8901030383458"), true);
    // Invalid checksums
    assert.equal(isValidEan13("4006381333932"), false);
    assert.equal(isValidEan13("123"), false);

    // Standard valid UPC-A
    assert.equal(isValidUpcA("012345678905"), true);
    assert.equal(isValidUpcA("012345678906"), false);

    // Standard valid EAN-8
    assert.equal(isValidEan8("96385074"), true);
    assert.equal(isValidEan8("96385075"), false);
  });

  it("classifies incoming scans and rejects payment QRs and external URLs", () => {
    // Payment QR
    const upi = classifyScanInput("upi://pay?pa=merchant@upi&pn=Store&am=500");
    assert.equal(upi.symbology, "PAYMENT_QR");
    assert.equal(upi.isItemCode, false);

    // GST E-Invoice IRN
    const irn = classifyScanInput("IRN:a1b2c3d4e5f6a7b8c9d0");
    assert.equal(irn.symbology, "E_INVOICE_QR");
    assert.equal(irn.isItemCode, false);

    // Web URL
    const url = classifyScanInput("https://example.com/item/123");
    assert.equal(url.symbology, "URL");
    assert.equal(url.isItemCode, false);

    // Internal QR
    const qr = classifyScanInput("ITM1:e4a1b2:HK-7X9K-3M2P");
    assert.equal(qr.symbology, "INTERNAL_QR");
    assert.equal(qr.isItemCode, true);
    assert.equal(qr.parsed.code, "HK-7X9K-3M2P");

    // EAN-13
    const ean = classifyScanInput("8901030383458");
    assert.equal(ean.symbology, "EAN13");
    assert.equal(ean.isItemCode, true);

    // 1D Barcode / SKU
    const sku = classifyScanInput("SKU-RING-001");
    assert.equal(sku.symbology, "CODE128");
    assert.equal(sku.isItemCode, true);
  });
});
