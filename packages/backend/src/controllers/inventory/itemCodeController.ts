import type { Request, Response } from "express";
import { z } from "zod";
import QRCode from "qrcode";
import { ok, created, fail } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import {
  generateInternalCode,
  formatQrPayload,
  computeCompanyToken,
  isValidEan13,
  isValidUpcA,
  isValidEan8,
  verifyCheckChar,
  normalizeCodeString,
} from "@jewelledger/shared";

const addCodeSchema = z.object({
  code: z.string().min(2).max(64),
  codeType: z.enum([
    "INTERNAL_QR",
    "INTERNAL_128",
    "EAN13",
    "UPCA",
    "EAN8",
    "CODE128",
    "GS1",
    "MANUFACTURER",
    "SUPPLIER",
    "CUSTOM",
  ]).default("CUSTOM"),
  packQty: z.coerce.number().positive().default(1),
  isPrimary: z.boolean().default(false),
});

/**
 * List all codes for an inventory item (active and revoked).
 */
export const getItemCodes = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const itemId = Number(req.params.id);

  const item = await prisma.item.findFirst({
    where: { id: itemId, companyId },
  });
  if (!item) return fail(res, 404, "ITEM_NOT_FOUND", "Item not found");

  const codes = await prisma.itemCode.findMany({
    where: { companyId, itemId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });

  const companyToken = computeCompanyToken(companyId);

  // Attach formatted QR payload to internal QR codes
  const formattedCodes = codes.map((c) => ({
    ...c,
    qrPayload: c.codeType === "INTERNAL_QR" ? formatQrPayload(companyId, c.code) : c.code,
    companyToken,
  }));

  return ok(res, formattedCodes);
};

/**
 * Add a secondary/alternate barcode (e.g. Manufacturer EAN-13, Supplier code, Pack code).
 */
export const addItemCode = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const itemId = Number(req.params.id);

  const parsed = addCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid code payload", parsed.error.issues);
  }

  const item = await prisma.item.findFirst({
    where: { id: itemId, companyId },
  });
  if (!item) return fail(res, 404, "ITEM_NOT_FOUND", "Item not found");

  const normalizedCode = normalizeCodeString(parsed.data.code);

  // Validate standard checksums
  if (parsed.data.codeType === "EAN13" && !isValidEan13(normalizedCode)) {
    return fail(res, 400, "INVALID_EAN13_CHECKSUM", "Invalid EAN-13 barcode checksum");
  }
  if (parsed.data.codeType === "UPCA" && !isValidUpcA(normalizedCode)) {
    return fail(res, 400, "INVALID_UPCA_CHECKSUM", "Invalid UPC-A barcode checksum");
  }
  if (parsed.data.codeType === "EAN8" && !isValidEan8(normalizedCode)) {
    return fail(res, 400, "INVALID_EAN8_CHECKSUM", "Invalid EAN-8 barcode checksum");
  }

  // Check uniqueness within company
  const existing = await prisma.itemCode.findFirst({
    where: { companyId, code: normalizedCode, status: "ACTIVE" },
    include: { item: { select: { id: true, name: true, sku: true } } },
  });

  if (existing) {
    return fail(
      res,
      409,
      "CODE_ALREADY_EXISTS",
      `Barcode "${normalizedCode}" is already assigned to item "${existing.item.name}" (${existing.item.sku})`
    );
  }

  // Create new code within transaction
  const result = await prisma.$transaction(async (tx) => {
    if (parsed.data.isPrimary) {
      await tx.itemCode.updateMany({
        where: { companyId, itemId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return tx.itemCode.create({
      data: {
        companyId,
        itemId,
        code: normalizedCode,
        codeType: parsed.data.codeType,
        packQty: parsed.data.packQty,
        isPrimary: parsed.data.isPrimary,
        status: "ACTIVE",
        createdBy: actor,
      },
    });
  });

  return created(res, result, "Barcode added");
};

export async function createPrimaryCodeForItem(companyId: number, itemId: number, actor: string = "system") {
  const existing = await prisma.itemCode.findFirst({
    where: { companyId, itemId, status: "ACTIVE", isPrimary: true },
  });
  if (existing) return existing;

  let newCode = "";
  let attempts = 0;
  while (attempts < 10) {
    const candidate = generateInternalCode("HK");
    const collision = await prisma.itemCode.findFirst({
      where: { companyId, code: candidate },
    });
    if (!collision) {
      newCode = candidate;
      break;
    }
    attempts++;
  }

  if (!newCode) throw new Error("Unable to allocate unique code");

  return prisma.itemCode.create({
    data: {
      companyId,
      itemId,
      code: newCode,
      codeType: "INTERNAL_QR",
      packQty: 1,
      isPrimary: true,
      status: "ACTIVE",
      createdBy: actor,
    },
  });
}

/**
 * Generates or regenerates an opaque internal Crockford Base32 QR code for an item.
 * If a primary code already existed, it is retired/revoked with an audit trail.
 */
export const generatePrimaryItemCode = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const itemId = Number(req.params.id);
  const reason = String(req.body?.reason || "System generated");

  const item = await prisma.item.findFirst({
    where: { id: itemId, companyId },
  });
  if (!item) return fail(res, 404, "ITEM_NOT_FOUND", "Item not found");

  // Generate a unique Crockford Base32 code
  let newCode = "";
  let attempts = 0;
  while (attempts < 10) {
    const candidate = generateInternalCode("HK");
    const collision = await prisma.itemCode.findFirst({
      where: { companyId, code: candidate },
    });
    if (!collision) {
      newCode = candidate;
      break;
    }
    attempts++;
  }

  if (!newCode) {
    return fail(res, 500, "CODE_GEN_EXHAUSTION", "Unable to allocate unique code");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Revoke previous primary code if regenerating
    await tx.itemCode.updateMany({
      where: { companyId, itemId, isPrimary: true },
      data: {
        isPrimary: false,
        status: "REVOKED",
        revokedAt: new Date(),
        revokedBy: actor,
        revokedReason: reason,
      },
    });

    return tx.itemCode.create({
      data: {
        companyId,
        itemId,
        code: newCode,
        codeType: "INTERNAL_QR",
        packQty: 1,
        isPrimary: true,
        status: "ACTIVE",
        createdBy: actor,
      },
    });
  });

  const payload = formatQrPayload(companyId, result.code);
  const qrSvg = await QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 200,
  });

  return created(
    res,
    {
      ...result,
      qrPayload: payload,
      qrSvg,
    },
    "Internal code generated"
  );
};

/**
 * Revoke an existing code.
 */
export const revokeItemCode = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const itemId = Number(req.params.id);
  const codeId = Number(req.params.codeId);
  const reason = String(req.body?.reason || "Manually revoked");

  const codeRecord = await prisma.itemCode.findFirst({
    where: { id: codeId, itemId, companyId },
  });
  if (!codeRecord) return fail(res, 404, "CODE_NOT_FOUND", "Item code not found");

  const updated = await prisma.itemCode.update({
    where: { id: codeId, companyId },
    data: {
      status: "REVOKED",
      isPrimary: false,
      revokedAt: new Date(),
      revokedBy: actor,
      revokedReason: reason,
    },
  });

  return ok(res, updated, "Code revoked");
};

/**
 * Returns a high-density, print-ready SVG for an item's primary or specific code.
 */
export const getItemQrSvg = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const itemId = Number(req.params.id);

  let codeRecord = await prisma.itemCode.findFirst({
    where: { companyId, itemId, isPrimary: true, status: "ACTIVE" },
  });

  // If no primary code exists yet, auto-generate one on the fly
  if (!codeRecord) {
    const candidate = generateInternalCode("HK");
    codeRecord = await prisma.itemCode.create({
      data: {
        companyId,
        itemId,
        code: candidate,
        codeType: "INTERNAL_QR",
        packQty: 1,
        isPrimary: true,
        status: "ACTIVE",
        createdBy: getActor(req),
      },
    });
  }

  const payload = formatQrPayload(companyId, codeRecord.code);
  const svg = await QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
  });

  return ok(res, {
    code: codeRecord.code,
    codeType: codeRecord.codeType,
    payload,
    svg,
  });
};

/**
 * Idempotent backfill: Generates primary internal QR codes for all items without one.
 */
export const backfillCompanyCodes = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  const items = await prisma.item.findMany({
    where: { companyId, isActive: true },
    select: { id: true, sku: true },
  });

  const existingCodes = await prisma.itemCode.findMany({
    where: { companyId, status: "ACTIVE" },
    select: { itemId: true, codeType: true, isPrimary: true },
  });

  const itemsWithPrimary = new Set(
    existingCodes.filter((c) => c.isPrimary).map((c) => c.itemId)
  );

  const toCreate: Array<{
    companyId: number;
    itemId: number;
    code: string;
    codeType: string;
    packQty: number;
    isPrimary: boolean;
    status: string;
    createdBy: string;
  }> = [];

  for (const item of items) {
    if (!itemsWithPrimary.has(item.id)) {
      toCreate.push({
        companyId,
        itemId: item.id,
        code: generateInternalCode("HK"),
        codeType: "INTERNAL_QR",
        packQty: 1,
        isPrimary: true,
        status: "ACTIVE",
        createdBy: actor,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.itemCode.createMany({
      data: toCreate,
    });
  }

  return ok(res, {
    totalItems: items.length,
    alreadyHadCodes: items.length - toCreate.length,
    codesGenerated: toCreate.length,
  }, `Generated ${toCreate.length} new QR codes`);
};

/**
 * Resolves a scan string (QR payload, Crockford Base32 internal code, EAN/UPC barcode, or SKU).
 * Strictly enforces company isolation:
 * - If the QR payload has a company token belonging to another company, rejects with CROSS_COMPANY_SCAN error.
 * - Always scopes queries to companyId.
 */
export const resolveScanCode = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { scanString } = req.body;
  if (!scanString || typeof scanString !== "string" || !scanString.trim()) {
    return fail(res, 400, "INVALID_SCAN", "Scanned code cannot be empty");
  }

  const raw = scanString.trim();
  let lookupCode = raw;

  // Check for ITM1 format: ITM1:<company_token>:<code>
  if (raw.startsWith("ITM1:")) {
    const parts = raw.split(":");
    if (parts.length >= 3) {
      const scannedToken = parts[1];
      const targetCode = parts.slice(2).join(":");
      const expectedToken = computeCompanyToken(companyId);

      if (scannedToken.toUpperCase() !== expectedToken.toUpperCase()) {
        return fail(
          res,
          404,
          "CROSS_COMPANY_SCAN",
          "This label belongs to a different company or organization."
        );
      }
      lookupCode = targetCode;
    }
  }

  const normalized = normalizeCodeString(lookupCode);

  // 1. First look up by active ItemCode
  const codeRecord = await prisma.itemCode.findFirst({
    where: {
      companyId,
      code: { in: [lookupCode, normalized] },
      status: "ACTIVE",
    },
    include: {
      item: true,
    },
  });

  if (codeRecord && codeRecord.item) {
    return ok(res, {
      item: codeRecord.item,
      codeRecord: {
        id: codeRecord.id,
        code: codeRecord.code,
        codeType: codeRecord.codeType,
        packQty: codeRecord.packQty,
        isPrimary: codeRecord.isPrimary,
      },
      packQty: codeRecord.packQty || 1,
    });
  }

  // 2. If not found in ItemCode, search by SKU or HUID
  const itemBySku = await prisma.item.findFirst({
    where: {
      companyId,
      OR: [
        { sku: { equals: lookupCode, mode: "insensitive" } },
        { sku: { equals: normalized, mode: "insensitive" } },
      ],
    },
    include: {
      codes: {
        where: { status: "ACTIVE" },
        orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
      },
    },
  });

  if (itemBySku) {
    return ok(res, {
      item: itemBySku,
      codeRecord: itemBySku.codes[0]
        ? {
            id: itemBySku.codes[0].id,
            code: itemBySku.codes[0].code,
            codeType: itemBySku.codes[0].codeType,
            packQty: itemBySku.codes[0].packQty,
            isPrimary: itemBySku.codes[0].isPrimary,
          }
        : null,
      packQty: itemBySku.codes[0]?.packQty || 1,
    });
  }

  return fail(res, 404, "ITEM_NOT_FOUND", `No item found for scanned code: ${lookupCode}`);
};
