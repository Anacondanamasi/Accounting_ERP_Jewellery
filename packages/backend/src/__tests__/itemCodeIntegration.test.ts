import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { runWithTenantContext } from "../context/tenantContext";
import {
  generateInternalCode,
  verifyCheckChar,
  computeCompanyToken,
  formatQrPayload,
} from "@jewelledger/shared";

describe("ItemCode Multi-Tenant Integration Tests", () => {
  let companyAId: number;
  let companyBId: number;
  let itemAId: number;
  let itemBId: number;

  before(async () => {
    // 1. Create Company A
    const compA = await prisma.company.create({
      data: {
        name: `Test Tenant A - ${Date.now()}`,
        legalName: `Test Tenant A Corp ${Date.now()}`,
        gstin: "24AAAAA0000A1Z5",
        state: "Gujarat",
        addressLine1: "Arcade A",
        createdBy: "system_test",
      },
    });
    companyAId = compA.id;

    // 2. Create Company B
    const compB = await prisma.company.create({
      data: {
        name: `Test Tenant B - ${Date.now()}`,
        legalName: `Test Tenant B Corp ${Date.now()}`,
        gstin: "27BBBBB0000B1Z5",
        state: "Maharashtra",
        addressLine1: "Tower B",
        createdBy: "system_test",
      },
    });
    companyBId = compB.id;

    // 3. Create Item in Company A with auto-generated code
    const codeA = generateInternalCode("HK");
    const itemA = await prisma.item.create({
      data: {
        companyId: companyAId,
        sku: `SKU-A-${Date.now()}`,
        name: "Gold Ring 22K 5g",
        category: "Rings",
        metalType: "GOLD",
        karat: "22K",
        grossWt: 5.5,
        netWt: 5.0,
        stoneWt: 0.5,
        wastagePct: 2.0,
        costingMethod: "FIFO",
        makingType: "PER_GRAM",
        makingRate: 450,
        costPrice: 28000,
        mrp: 32000,
        reorderLevel: 2,
        createdBy: "system_test",
        codes: {
          create: {
            companyId: companyAId,
            code: codeA,
            codeType: "INTERNAL_QR",
            packQty: 1,
            isPrimary: true,
            status: "ACTIVE",
            createdBy: "system_test",
          },
        },
      },
      include: { codes: true },
    });
    itemAId = itemA.id;

    // 4. Create Item in Company B with auto-generated code
    const codeB = generateInternalCode("HK");
    const itemB = await prisma.item.create({
      data: {
        companyId: companyBId,
        sku: `SKU-B-${Date.now()}`,
        name: "Diamond Pendant 18K",
        category: "Pendants",
        metalType: "GOLD",
        karat: "18K",
        grossWt: 3.2,
        netWt: 3.0,
        stoneWt: 0.2,
        wastagePct: 1.5,
        costingMethod: "FIFO",
        makingType: "FLAT",
        makingRate: 2500,
        costPrice: 42000,
        mrp: 50000,
        reorderLevel: 1,
        createdBy: "system_test",
        codes: {
          create: {
            companyId: companyBId,
            code: codeB,
            codeType: "INTERNAL_QR",
            packQty: 1,
            isPrimary: true,
            status: "ACTIVE",
            createdBy: "system_test",
          },
        },
      },
      include: { codes: true },
    });
    itemBId = itemB.id;
  });

  after(async () => {
    // Cleanup test data
    if (itemAId) await prisma.item.deleteMany({ where: { id: itemAId } });
    if (itemBId) await prisma.item.deleteMany({ where: { id: itemBId } });
    if (companyAId) await prisma.company.deleteMany({ where: { id: companyAId } });
    if (companyBId) await prisma.company.deleteMany({ where: { id: companyBId } });
  });

  it("assigns valid primary internal QR code to created item", async () => {
    const codes = await prisma.itemCode.findMany({
      where: { companyId: companyAId, itemId: itemAId },
    });
    assert.equal(codes.length, 1);
    assert.equal(codes[0].isPrimary, true);
    assert.equal(codes[0].status, "ACTIVE");
    assert.equal(codes[0].codeType, "INTERNAL_QR");
    assert.equal(verifyCheckChar(codes[0].code), true);
  });

  it("adds secondary manufacturer barcode and preserves primary code", async () => {
    const eanCode = "4006381333931";
    await prisma.itemCode.create({
      data: {
        companyId: companyAId,
        itemId: itemAId,
        code: eanCode,
        codeType: "EAN13",
        packQty: 1,
        isPrimary: false,
        status: "ACTIVE",
        createdBy: "test_user",
      },
    });

    const allCodes = await prisma.itemCode.findMany({
      where: { companyId: companyAId, itemId: itemAId },
      orderBy: [{ isPrimary: "desc" }],
    });

    assert.equal(allCodes.length, 2);
    assert.equal(allCodes[0].isPrimary, true);
    assert.equal(allCodes[1].code, eanCode);
    assert.equal(allCodes[1].isPrimary, false);
  });

  it("enforces tenant isolation: Company B cannot query Company A's codes under tenant context", async () => {
    await runWithTenantContext(
      { companyId: companyBId, userId: "user_b", role: "ADMIN" },
      async () => {
        // Querying with Company B context should return 0 rows for Item A
        const bViewOfA = await prisma.itemCode.findMany({
          where: { itemId: itemAId },
        });
        assert.equal(bViewOfA.length, 0);

        // Querying for Item B's code returns only Item B
        const bViewOfB = await prisma.itemCode.findMany({
          where: { itemId: itemBId },
        });
        assert.equal(bViewOfB.length, 1);
        assert.equal(bViewOfB[0].companyId, companyBId);
      }
    );
  });

  it("handles regeneration: revokes old primary code and promotes new code", async () => {
    const oldPrimary = await prisma.itemCode.findFirst({
      where: { companyId: companyAId, itemId: itemAId, isPrimary: true },
    });
    assert.ok(oldPrimary);

    const newCode = generateInternalCode("HK");

    // Perform regeneration
    await prisma.$transaction(async (tx) => {
      await tx.itemCode.updateMany({
        where: { companyId: companyAId, itemId: itemAId, isPrimary: true },
        data: {
          isPrimary: false,
          status: "REVOKED",
          revokedAt: new Date(),
          revokedBy: "test_admin",
          revokedReason: "Damaged physical label",
        },
      });

      await tx.itemCode.create({
        data: {
          companyId: companyAId,
          itemId: itemAId,
          code: newCode,
          codeType: "INTERNAL_QR",
          packQty: 1,
          isPrimary: true,
          status: "ACTIVE",
          createdBy: "test_admin",
        },
      });
    });

    // Verify status
    const previous = await prisma.itemCode.findUnique({
      where: { id: oldPrimary.id },
    });
    assert.equal(previous?.status, "REVOKED");
    assert.equal(previous?.isPrimary, false);
    assert.equal(previous?.revokedReason, "Damaged physical label");

    const current = await prisma.itemCode.findFirst({
      where: { companyId: companyAId, itemId: itemAId, isPrimary: true },
    });
    assert.equal(current?.code, newCode);
    assert.equal(current?.status, "ACTIVE");
  });
});
