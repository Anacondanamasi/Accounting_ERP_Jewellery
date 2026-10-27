import { generateInternalCode } from "@jewelledger/shared";
import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

const itemSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  category: z.string().min(2),
  subCategory: z.string().optional(),
  collection: z.string().optional(),
  metalType: z.string().min(2),
  karat: z.string().min(2),
  grossWt: z.coerce.number().nonnegative(),
  netWt: z.coerce.number().nonnegative(),
  stoneWt: z.coerce.number().nonnegative(),
  wastagePct: z.coerce.number().nonnegative(),
  costingMethod: z.string().default("FIFO"),
  makingType: z.string().min(2),
  makingRate: z.coerce.number().nonnegative(),
  costPrice: z.coerce.number().nonnegative(),
  mrp: z.coerce.number().nonnegative(),
  reorderLevel: z.coerce.number().nonnegative(),
  isActive: z.boolean().default(true),
});

export const listItems = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const category = req.query.category ? String(req.query.category) : undefined;
  const karat = req.query.karat ? String(req.query.karat).toUpperCase() : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const rows = await prisma.item.findMany({
    where: {
      companyId,
      ...(category ? { category: { contains: category } } : {}),
      ...(karat ? { karat } : {}),
      ...(search
        ? {
            OR: [
              { sku: { contains: search } },
              { name: { contains: search } },
              { codes: { some: { code: { contains: search }, status: "ACTIVE" } } },
            ],
          }
        : {}),
    },
    include: {
      codes: {
        where: { status: "ACTIVE" },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(res, rows);
};

export const getItemById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const row = await prisma.item.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: {
      codes: {
        where: { status: "ACTIVE" },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!row) return fail(res, 404, "ITEM_NOT_FOUND", "Item not found");
  return ok(res, row);
};

export const getItemStockLedger = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const rows = await prisma.stockLedger.findMany({
    where: {
      companyId,
      itemId: Number(req.params.id),
      ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, rows);
};

export const createItem = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid item payload", parsed.error.issues);
  }

  const existing = await prisma.item.findFirst({
    where: { companyId, sku: parsed.data.sku }
  });
  if (existing) {
    return fail(res, 409, "SKU_EXISTS", "SKU already exists");
  }

  const actor = getActor(req);
  const row = await prisma.item.create({
    data: {
      ...parsed.data,
      companyId,
      createdBy: actor,
      codes: {
        create: {
          companyId,
          code: generateInternalCode("HK"),
          codeType: "INTERNAL_QR",
          packQty: 1,
          isPrimary: true,
          status: "ACTIVE",
          createdBy: actor,
        },
      },
    },
    include: {
      codes: true,
    },
  });

  return created(res, row, "Item created");
};

export const updateItem = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = itemSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid item update payload", parsed.error.issues);
  }

  try {
    const row = await prisma.item.update({
      where: { id: Number(req.params.id), companyId },
      data: parsed.data,
    });
    return ok(res, row, "Item updated");
  } catch {
    return fail(res, 404, "ITEM_NOT_FOUND", "Item not found");
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    await prisma.item.update({
      where: { id: Number(req.params.id), companyId },
      data: { isActive: false },
    });
    return ok(res, true, "Item deactivated");
  } catch {
    return fail(res, 404, "ITEM_NOT_FOUND", "Item not found");
  }
};

export const importItems = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  let imported = 0;
  let duplicates = 0;

  for (const source of rows) {
    const parsed = itemSchema.safeParse(source);
    if (!parsed.success) continue;
    const existing = await prisma.item.findFirst({ where: { companyId, sku: parsed.data.sku } });
    if (existing) {
      duplicates += 1;
      continue;
    }
    await prisma.item.create({
      data: { ...parsed.data, companyId, createdBy: getActor(req) },
    });
    imported += 1;
  }

  ok(res, { imported, duplicates }, "Items imported");
};

export const exportItems = async (_req: Request, res: Response) =>
  ok(res, { url: "/export/items.xlsx" });

export const getItemBarcode = async (req: Request, res: Response) => {
  return ok(res, {
    format: "SVG",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><text x='10' y='30'>${req.params.id}</text></svg>`,
  });
};

export const uploadItemImages = async (_req: Request, res: Response) =>
  ok(res, [{ id: `img-${Date.now()}`, url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&q=80" }], "Image uploaded");

export const deleteItemImage = async (_req: Request, res: Response) =>
  ok(res, true, "Image removed");


