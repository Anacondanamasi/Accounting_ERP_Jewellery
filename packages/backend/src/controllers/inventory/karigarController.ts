import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

const karigarSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  specialization: z.string().min(2).optional(),
  mobile: z.string().min(8).optional(),
  isActive: z.boolean().default(true),
});

const jwoSchema = z.object({
  karigarId: z.coerce.number(),
  issueDate: z.string().min(1),
  expectedDate: z.string().min(1).optional(),
  description: z.string().min(3).optional(),
  goldIssuedG: z.coerce.number().positive(),
  allowedLossPct: z.coerce.number().min(0).max(100),
  makingCharges: z.coerce.number().nonnegative().default(0),
});

const returnSchema = z.object({
  goldReturnedG: z.coerce.number().nonnegative(),
  makingCharges: z.coerce.number().nonnegative().optional(),
});

export const listKarigars = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const rows = await prisma.karigar.findMany({
    where: { companyId },
    orderBy: { name: "asc" }
  });
  
  return ok(res, rows);
};

export const createKarigar = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = karigarSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid karigar payload", parsed.error.issues);
  
  const existing = await prisma.karigar.findFirst({
    where: { companyId, code: parsed.data.code }
  });
  if (existing) {
    return fail(res, 409, "KARIGAR_EXISTS", "Karigar code already exists");
  }

  const row = await prisma.karigar.create({
    data: {
      ...parsed.data,
      companyId,
      createdBy: getActor(req),
    }
  });

  return created(res, row, "Karigar created");
};

export const updateKarigar = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = karigarSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid karigar payload", parsed.error.issues);

  try {
    const row = await prisma.karigar.update({
      where: { id: Number(req.params.id), companyId },
      data: parsed.data,
    });
    return ok(res, row, "Karigar updated");
  } catch {
    return fail(res, 404, "KARIGAR_NOT_FOUND", "Karigar not found");
  }
};

export const listJobWorkOrders = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const karigarId = req.query.karigarId ? Number(req.query.karigarId) : undefined;
  const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;

  const rows = await prisma.jobWorkOrder.findMany({
    where: {
      companyId,
      ...(karigarId ? { karigarId } : {}),
      ...(status ? { status } : {}),
    },
    include: { karigar: true },
    orderBy: { createdAt: "desc" },
  });

  return ok(res, rows);
};

export const getJobWorkOrderById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const row = await prisma.jobWorkOrder.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: { karigar: true }
  });
  if (!row) return fail(res, 404, "JWO_NOT_FOUND", "Job work order not found");

  return ok(res, row);
};

export const createJobWorkOrder = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = jwoSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid JWO payload", parsed.error.issues);

  const karigar = await prisma.karigar.findFirst({
    where: { id: parsed.data.karigarId, companyId }
  });
  if (!karigar) return fail(res, 404, "KARIGAR_NOT_FOUND", "Karigar not found");

  const row = await prisma.jobWorkOrder.create({
    data: {
      companyId,
      jwoNo: `JWO-${Date.now()}`,
      karigarId: parsed.data.karigarId,
      issueDate: new Date(parsed.data.issueDate),
      expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : null,
      description: parsed.data.description,
      goldIssuedG: parsed.data.goldIssuedG,
      goldReturnedG: 0,
      allowedLossPct: parsed.data.allowedLossPct,
      makingCharges: parsed.data.makingCharges,
      status: "ISSUED",
      createdBy: getActor(req),
    },
    include: { karigar: true }
  });

  return created(res, row, "JWO created");
};

export const returnJobWork = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid return payload", parsed.error.issues);

  const jwo = await prisma.jobWorkOrder.findFirst({
    where: { id: Number(req.params.id), companyId }
  });
  if (!jwo) return fail(res, 404, "JWO_NOT_FOUND", "Job work order not found");

  const newReturnedG = Number(jwo.goldReturnedG) + parsed.data.goldReturnedG;
  const newStatus = newReturnedG >= Number(jwo.goldIssuedG) ? "COMPLETED" : "PARTIALLY_RETURNED";

  const updated = await prisma.jobWorkOrder.update({
    where: { id: jwo.id },
    data: {
      goldReturnedG: newReturnedG,
      makingCharges: parsed.data.makingCharges !== undefined ? parsed.data.makingCharges : jwo.makingCharges,
      status: newStatus,
    },
    include: { karigar: true }
  });

  return ok(res, updated, "Job work return recorded");
};

export const createJwoBill = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const row = await prisma.jobWorkOrder.findFirst({
    where: { id: Number(req.params.id), companyId }
  });
  if (!row) return fail(res, 404, "JWO_NOT_FOUND", "Job work order not found");

  return created(res, { billNo: `BILL-JWO-${Date.now()}`, amount: row.makingCharges }, "Making charges bill created");
};


