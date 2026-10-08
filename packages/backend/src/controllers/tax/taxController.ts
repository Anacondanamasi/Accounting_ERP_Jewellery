import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

const monthYearSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

const hsnCreateSchema = z.object({
  code: z.string().min(4).max(8),
  description: z.string().min(3),
  gstRate: z.coerce.number().min(0).max(28),
  cessRate: z.coerce.number().min(0).max(28).default(0),
  isActive: z.boolean().optional().default(true),
});

const hsnUpdateSchema = hsnCreateSchema.partial();

export const getGstr1 = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid GST period", parsed.error.issues);
  const from = new Date(parsed.data.year, parsed.data.month - 1, 1);
  const to = new Date(parsed.data.year, parsed.data.month, 1);

  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { in: ["POSTED", "APPROVED"] }, date: { gte: from, lt: to } },
    include: { customer: true, lines: true },
  });

  const hsnMap = new Map<string, { hsnCode: string; taxableValue: number; taxAmount: number }>();
  for (const invoice of invoices) {
    for (const line of invoice.lines) {
      const current = hsnMap.get(line.hsnCode || "NA") ?? { hsnCode: line.hsnCode || "NA", taxableValue: 0, taxAmount: 0 };
      current.taxableValue += Number(line.amount);
      current.taxAmount += Number(line.total) - Number(line.amount);
      hsnMap.set(line.hsnCode || "NA", current);
    }
  }

  return ok(res, {
    period: parsed.data,
    calendar: [],
    b2b: invoices.filter((row) => row.customer?.category === "B2B"),
    b2c: invoices.filter((row) => row.customer?.category !== "B2B"),
    hsn: Array.from(hsnMap.values()).map((row) => ({
      ...row,
      taxableValue: Number(row.taxableValue.toFixed(2)),
      taxAmount: Number(row.taxAmount.toFixed(2)),
    })),
    cdn: [],
    totals: {
      taxableValue: invoices.reduce((sum, row) => sum + Number(row.taxableAmount), 0),
      taxAmount: invoices.reduce((sum, row) => sum + Number(row.cgst) + Number(row.sgst) + Number(row.igst), 0),
      invoiceCount: invoices.length,
    },
  });
};

export const getGstr3b = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid GST period", parsed.error.issues);
  const from = new Date(parsed.data.year, parsed.data.month - 1, 1);
  const to = new Date(parsed.data.year, parsed.data.month, 1);

  const [outward, inward] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, status: { in: ["POSTED", "APPROVED"] }, date: { gte: from, lt: to } },
      _sum: { taxableAmount: true, cgst: true, sgst: true, igst: true },
    }),
    prisma.bill.aggregate({
      where: { companyId, status: { in: ["POSTED", "APPROVED"] }, date: { gte: from, lt: to } },
      _sum: { taxableAmount: true, cgst: true, sgst: true, igst: true },
    }),
  ]);

  const outwardTax = Number(outward._sum?.cgst || 0) + Number(outward._sum?.sgst || 0) + Number(outward._sum?.igst || 0);
  const inwardTax = Number(inward._sum?.cgst || 0) + Number(inward._sum?.sgst || 0) + Number(inward._sum?.igst || 0);

  return ok(res, {
    period: parsed.data,
    outward: {
      taxableValue: Number(outward._sum?.taxableAmount || 0),
      taxAmount: outwardTax,
      cgst: Number(outward._sum?.cgst || 0),
      sgst: Number(outward._sum?.sgst || 0),
      igst: Number(outward._sum?.igst || 0),
    },
    itc: { eligible: inwardTax, blocked: 0, reversed: 0, net: inwardTax },
    netTaxPayable: outwardTax - inwardTax,
  });
};

export const exportGstReturn = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const stamp = new Date().toISOString();
  return ok(res, { message: "GST export generated", generatedAt: stamp });
};

export const getTdsSummary = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const bills = await prisma.bill.findMany({
    where: { companyId, status: { not: "VOID" } },
    include: { supplier: true },
  });
  const rows = bills.map((bill) => ({
    supplierId: bill.supplierId,
    supplierName: bill.supplier.name,
    billNo: bill.billNo,
    date: bill.date,
    purchaseAmount: Number(bill.grandTotal),
    tdsAmount: 0,
  }));
  return ok(res, {
    rows,
    totals: {
      totalPurchases: rows.reduce((sum, row) => sum + row.purchaseAmount, 0),
      totalTds: 0,
      vendors: new Set(rows.map((row) => row.supplierId)).size,
    },
  });
};

export const getHsnMaster = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const rows = await prisma.hSNMaster.findMany({
    where: { companyId },
    orderBy: { code: "asc" }
  });
  
  return ok(res, rows);
};

export const createHsnMaster = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = hsnCreateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid HSN payload", parsed.error.issues);

  const existing = await prisma.hSNMaster.findFirst({
    where: { companyId, code: parsed.data.code }
  });
  if (existing) {
    return fail(res, 409, "HSN_EXISTS", "HSN code already exists");
  }

  const row = await prisma.hSNMaster.create({
    data: {
      ...parsed.data,
      companyId,
      createdBy: getActor(req),
    }
  });

  return created(res, row, "HSN added");
};

export const updateHsnMaster = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = hsnUpdateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid HSN update payload", parsed.error.issues);

  try {
    const row = await prisma.hSNMaster.update({
      where: { id: Number(req.params.id), companyId },
      data: parsed.data,
    });
    return ok(res, row, "HSN updated");
  } catch {
    return fail(res, 404, "HSN_NOT_FOUND", "HSN code not found");
  }
};


