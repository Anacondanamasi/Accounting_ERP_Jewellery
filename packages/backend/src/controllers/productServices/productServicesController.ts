import type { Request, Response } from "express";
import { ok, created, fail } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

// ─── List Products & Services ─────────────────────────────────────────────────
export const listProductServices = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const search = req.query.search ? String(req.query.search) : undefined;
  const type = req.query.type ? String(req.query.type).toUpperCase() : undefined;
  const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
  const tracked = req.query.tracked === "true" ? true : req.query.tracked === "false" ? false : undefined;

  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
  const skip = (page - 1) * limit;

  const where: any = {
    companyId,
    ...(type ? { type } : {}),
    ...(status ? { status } : { status: { not: "DELETED" } }),
    ...(tracked !== undefined ? { isTracked: tracked } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search } },
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.productService.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.productService.count({ where }),
  ]);

  return ok(res, {
    rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

// ─── Get by ID ────────────────────────────────────────────────────────────────
export const getProductServiceById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const product = await prisma.productService.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: {
      stockMovements: {
        orderBy: { date: "desc" },
        take: 20,
      },
    },
  });

  if (!product) return fail(res, 404, "PRODUCT_NOT_FOUND", "Product / Service not found");
  return ok(res, product);
};

// ─── Create ───────────────────────────────────────────────────────────────────
export const createProductService = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  const {
    code,
    name,
    description,
    type = "PRODUCT",
    isTracked = false,
    isSold = true,
    salesDescription,
    salesPrice = 0,
    salesAccountId,
    salesTaxRate = 0,
    isPurchased = true,
    purchaseDescription,
    purchasePrice = 0,
    purchaseAccountId,
    purchaseTaxRate = 0,
    inventoryAssetAccountId,
    openingQuantity = 0,
    openingValue = 0,
    reorderLevel = 0,
    unit = "pcs",
    status = "ACTIVE",
  } = req.body;

  if (!code || !name) {
    return fail(res, 400, "VALIDATION_ERROR", "Code and name are required");
  }

  // Check duplicate code
  const existing = await prisma.productService.findFirst({
    where: { companyId, code: String(code) },
  });
  if (existing) {
    return fail(res, 409, "DUPLICATE_CODE", `Item code '${code}' already exists`);
  }

  const averageCost =
    isTracked && openingQuantity > 0 ? openingValue / openingQuantity : 0;

  const product = await prisma.$transaction(async (tx) => {
    const record = await tx.productService.create({
      data: {
        companyId,
        code: String(code),
        name: String(name),
        description: description ? String(description) : null,
        type: String(type).toUpperCase(),
        isTracked: Boolean(isTracked),
        isSold: Boolean(isSold),
        salesDescription: salesDescription ? String(salesDescription) : null,
        salesPrice: Number(salesPrice),
        salesAccountId: salesAccountId ? Number(salesAccountId) : null,
        salesTaxRate: Number(salesTaxRate),
        isPurchased: Boolean(isPurchased),
        purchaseDescription: purchaseDescription ? String(purchaseDescription) : null,
        purchasePrice: Number(purchasePrice),
        purchaseAccountId: purchaseAccountId ? Number(purchaseAccountId) : null,
        purchaseTaxRate: Number(purchaseTaxRate),
        inventoryAssetAccountId: inventoryAssetAccountId ? Number(inventoryAssetAccountId) : null,
        openingQuantity: Number(openingQuantity),
        openingValue: Number(openingValue),
        quantityOnHand: isTracked ? Number(openingQuantity) : 0,
        averageCost,
        reorderLevel: Number(reorderLevel),
        unit: unit ? String(unit) : "pcs",
        status: String(status).toUpperCase(),
        createdBy: actor,
      },
    });

    // Create opening stock movement if tracked and has opening qty
    if (isTracked && Number(openingQuantity) > 0) {
      await tx.itemStockMovement.create({
        data: {
          companyId,
          productId: record.id,
          date: new Date(),
          movementType: "OPENING",
          quantityIn: Number(openingQuantity),
          balanceQty: Number(openingQuantity),
          unitCost: averageCost,
          totalValue: Number(openingValue),
          narration: "Opening stock balance",
          createdBy: actor,
        },
      });
    }

    return record;
  });

  return created(res, product, "Product / Service created");
};

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateProductService = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);

  const existing = await prisma.productService.findFirst({
    where: { id, companyId },
  });
  if (!existing) return fail(res, 404, "PRODUCT_NOT_FOUND", "Product / Service not found");

  const {
    code,
    name,
    description,
    type,
    isTracked,
    isSold,
    salesDescription,
    salesPrice,
    salesAccountId,
    salesTaxRate,
    isPurchased,
    purchaseDescription,
    purchasePrice,
    purchaseAccountId,
    purchaseTaxRate,
    inventoryAssetAccountId,
    reorderLevel,
    unit,
    status,
  } = req.body;

  // Check for duplicate code if code is being changed
  if (code && code !== existing.code) {
    const codeConflict = await prisma.productService.findFirst({
      where: { companyId, code: String(code), id: { not: id } },
    });
    if (codeConflict) {
      return fail(res, 409, "DUPLICATE_CODE", `Item code '${code}' already exists`);
    }
  }

  const updated = await prisma.productService.update({
    where: { id },
    data: {
      ...(code !== undefined ? { code: String(code) } : {}),
      ...(name !== undefined ? { name: String(name) } : {}),
      ...(description !== undefined ? { description: description ? String(description) : null } : {}),
      ...(type !== undefined ? { type: String(type).toUpperCase() } : {}),
      ...(isTracked !== undefined ? { isTracked: Boolean(isTracked) } : {}),
      ...(isSold !== undefined ? { isSold: Boolean(isSold) } : {}),
      ...(salesDescription !== undefined ? { salesDescription: salesDescription ? String(salesDescription) : null } : {}),
      ...(salesPrice !== undefined ? { salesPrice: Number(salesPrice) } : {}),
      ...(salesAccountId !== undefined ? { salesAccountId: salesAccountId ? Number(salesAccountId) : null } : {}),
      ...(salesTaxRate !== undefined ? { salesTaxRate: Number(salesTaxRate) } : {}),
      ...(isPurchased !== undefined ? { isPurchased: Boolean(isPurchased) } : {}),
      ...(purchaseDescription !== undefined ? { purchaseDescription: purchaseDescription ? String(purchaseDescription) : null } : {}),
      ...(purchasePrice !== undefined ? { purchasePrice: Number(purchasePrice) } : {}),
      ...(purchaseAccountId !== undefined ? { purchaseAccountId: purchaseAccountId ? Number(purchaseAccountId) : null } : {}),
      ...(purchaseTaxRate !== undefined ? { purchaseTaxRate: Number(purchaseTaxRate) } : {}),
      ...(inventoryAssetAccountId !== undefined ? { inventoryAssetAccountId: inventoryAssetAccountId ? Number(inventoryAssetAccountId) : null } : {}),
      ...(reorderLevel !== undefined ? { reorderLevel: Number(reorderLevel) } : {}),
      ...(unit !== undefined ? { unit: unit ? String(unit) : "pcs" } : {}),
      ...(status !== undefined ? { status: String(status).toUpperCase() } : {}),
    },
  });

  return ok(res, updated, "Product / Service updated");
};

// ─── Archive / Restore ────────────────────────────────────────────────────────
export const archiveProductService = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const id = Number(req.params.id);

  const existing = await prisma.productService.findFirst({ where: { id, companyId } });
  if (!existing) return fail(res, 404, "PRODUCT_NOT_FOUND", "Product / Service not found");

  const newStatus = existing.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
  const updated = await prisma.productService.update({
    where: { id },
    data: { status: newStatus },
  });

  return ok(res, updated, newStatus === "ARCHIVED" ? "Item archived" : "Item restored");
};

// ─── Stock Movements ─────────────────────────────────────────────────────────
export const getStockMovements = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const productId = Number(req.params.id);

  const product = await prisma.productService.findFirst({ where: { id: productId, companyId } });
  if (!product) return fail(res, 404, "PRODUCT_NOT_FOUND", "Product not found");

  const movements = await prisma.itemStockMovement.findMany({
    where: { companyId, productId },
    orderBy: { date: "desc" },
  });

  return ok(res, movements);
};

// ─── Bulk Archive ─────────────────────────────────────────────────────────────
export const bulkArchive = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const ids: number[] = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];

  if (ids.length === 0) {
    return fail(res, 400, "NO_IDS", "No item IDs provided");
  }

  const result = await prisma.productService.updateMany({
    where: { id: { in: ids }, companyId },
    data: { status: "ARCHIVED" },
  });

  return ok(res, { updated: result.count }, `${result.count} item(s) archived`);
};

// ─── Export CSV data ──────────────────────────────────────────────────────────
export const exportProductServices = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const rows = await prisma.productService.findMany({
    where: { companyId, status: { not: "DELETED" } },
    orderBy: { name: "asc" },
  });

  const headers = [
    "Code", "Name", "Type", "Is Tracked", "Is Sold", "Sales Price",
    "Is Purchased", "Purchase Price", "Sales Tax Rate", "Purchase Tax Rate",
    "Qty On Hand", "Reorder Level", "Unit", "Status",
  ].join(",");

  const csvRows = rows.map((r) =>
    [
      `"${r.code}"`,
      `"${r.name}"`,
      r.type,
      r.isTracked ? "Yes" : "No",
      r.isSold ? "Yes" : "No",
      r.salesPrice,
      r.isPurchased ? "Yes" : "No",
      r.purchasePrice,
      r.salesTaxRate,
      r.purchaseTaxRate,
      r.quantityOnHand,
      r.reorderLevel,
      `"${r.unit ?? ""}"`,
      r.status,
    ].join(",")
  );

  const csv = [headers, ...csvRows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"products-services.csv\"");
  return res.status(200).send(csv);
};
