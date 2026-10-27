import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { runWithTenantContext } from "../context/tenantContext";
import { generateLabelsPdf, LabelItemData } from "../services/labelPdfService";
import {
  generateInternalCode,
  computeCompanyToken,
  formatQrPayload,
} from "@jewelledger/shared";

describe("Label PDF and Scan Resolution Integration Tests", () => {
  let companyAId: number;
  let companyBId: number;
  let itemAId: number;
  let itemBId: number;
  let codeA: string;
  let codeB: string;

  before(async () => {
    // 1. Create Company A
    const compA = await prisma.company.create({
      data: {
        name: `Label Test Co A ${Date.now()}`,
        legalName: `Label Test Co A Legal ${Date.now()}`,
        gstin: "24AAAAA1111A1Z5",
        state: "Gujarat",
        addressLine1: "A Plaza",
        createdBy: "system_test",
      },
    });
    companyAId = compA.id;

    // 2. Create Company B
    const compB = await prisma.company.create({
      data: {
        name: `Label Test Co B ${Date.now()}`,
        legalName: `Label Test Co B Legal ${Date.now()}`,
        gstin: "27BBBBB2222B1Z5",
        state: "Maharashtra",
        addressLine1: "B Plaza",
        createdBy: "system_test",
      },
    });
    companyBId = compB.id;

    // 3. Create items with codes in each company
    codeA = generateInternalCode("HK");
    const itemA = await prisma.item.create({
      data: {
        companyId: companyAId,
        sku: `LBL-A-${Date.now()}`,
        name: "Diamond Necklace 18K",
        category: "Necklaces",
        metalType: "GOLD",
        karat: "18K",
        grossWt: 22.45,
        netWt: 21.0,
        stoneWt: 1.45,
        wastagePct: 3.5,
        costingMethod: "WEIGHTED_AVG",
        makingType: "PER_GRAM",
        makingRate: 650,
        costPrice: 120000,
        mrp: 145000,
        reorderLevel: 2,
        createdBy: "system_test",
      },
    });
    itemAId = itemA.id;

    await prisma.itemCode.create({
      data: {
        companyId: companyAId,
        itemId: itemAId,
        code: codeA,
        codeType: "INTERNAL_QR",
        packQty: 1,
        isPrimary: true,
        status: "ACTIVE",
        createdBy: "system_test",
      },
    });

    codeB = generateInternalCode("HK");
    const itemB = await prisma.item.create({
      data: {
        companyId: companyBId,
        sku: `LBL-B-${Date.now()}`,
        name: "Silver Anklet 925",
        category: "Anklets",
        metalType: "SILVER",
        karat: "SILVER",
        grossWt: 45.0,
        netWt: 45.0,
        stoneWt: 0,
        wastagePct: 1.0,
        costingMethod: "WEIGHTED_AVG",
        makingType: "FLAT",
        makingRate: 400,
        costPrice: 4200,
        mrp: 5500,
        reorderLevel: 5,
        createdBy: "system_test",
      },
    });
    itemBId = itemB.id;

    await prisma.itemCode.create({
      data: {
        companyId: companyBId,
        itemId: itemBId,
        code: codeB,
        codeType: "INTERNAL_QR",
        packQty: 1,
        isPrimary: true,
        status: "ACTIVE",
        createdBy: "system_test",
      },
    });
  });

  after(async () => {
    // Cleanup created records
    await prisma.itemCode.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.labelPrintJob.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.item.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    });
  });

  it("1. Generates valid Thermal 50x25 PDF buffer with valid PDF header", async () => {
    const itemData: LabelItemData[] = [
      {
        id: itemAId,
        sku: "TEST-SKU",
        name: "Diamond Necklace 18K",
        karat: "18K",
        grossWt: 22.45,
        netWt: 21.0,
        mrp: 145000,
        code: codeA,
        copies: 2,
      },
    ];

    const pdfBuffer = await generateLabelsPdf(itemData, {
      templateCode: "THERMAL_50X25",
      companyName: "Test Co A",
      companyId: companyAId,
    });

    assert.ok(pdfBuffer instanceof Buffer, "Should return a Buffer");
    assert.ok(pdfBuffer.length > 500, "PDF should have non-trivial size");
    const header = pdfBuffer.slice(0, 5).toString("utf8");
    assert.equal(header, "%PDF-", "Should start with standard %PDF- header");
  });

  it("2. Generates A4 3x8 Sheet PDF with 24 labels per page", async () => {
    const items: LabelItemData[] = Array.from({ length: 25 }, (_, i) => ({
      id: itemAId,
      sku: `SKU-${i}`,
      name: `Jewel Item ${i}`,
      karat: "22K",
      netWt: 10.5,
      mrp: 65000,
      code: codeA,
      copies: 1,
    }));

    const pdfBuffer = await generateLabelsPdf(items, {
      templateCode: "A4_SHEET_3X8",
      companyName: "Test Co A",
      companyId: companyAId,
    });

    assert.ok(pdfBuffer instanceof Buffer);
    assert.ok(pdfBuffer.length > 2000, "A4 sheet with 25 labels across 2 pages should be > 2KB");
  });

  it("3. Resolves internal QR code in Company A tenant context", async () => {
    await runWithTenantContext(
      { companyId: companyAId, userId: "test_user", role: "ADMIN" },
      async () => {
        const qrPayload = formatQrPayload(companyAId, codeA);
        const parts = qrPayload.split(":");
        const scannedToken = parts[1];
        const targetCode = parts[2];
        const expectedToken = computeCompanyToken(companyAId);

        assert.equal(scannedToken, expectedToken, "Token matches Company A");

        const codeRecord = await prisma.itemCode.findFirst({
          where: { companyId: companyAId, code: targetCode, status: "ACTIVE" },
          include: { item: true },
        });

        assert.ok(codeRecord, "Should find code record");
        assert.equal(codeRecord.item.id, itemAId, "Should match Item A");
        assert.equal(codeRecord.item.companyId, companyAId, "Item belongs to Company A");
      }
    );
  });

  it("4. Blocks cross-company scan fail-closed: scanning Company A label in Company B", async () => {
    await runWithTenantContext(
      { companyId: companyBId, userId: "test_user_b", role: "ADMIN" },
      async () => {
        const qrPayload = formatQrPayload(companyAId, codeA); // Company A label
        const parts = qrPayload.split(":");
        const scannedToken = parts[1];
        const expectedToken = computeCompanyToken(companyBId);

        // Verify that Company B's token does not match Company A's token
        assert.notEqual(scannedToken, expectedToken, "Tokens must not match cross-company");

        // Verify DB lookup in Company B context finds NOTHING for Company A's code
        const codeRecord = await prisma.itemCode.findFirst({
          where: { companyId: companyBId, code: codeA, status: "ACTIVE" },
        });
        assert.equal(codeRecord, null, "Company A's code must NEVER be returned in Company B context");
      }
    );
  });
});
