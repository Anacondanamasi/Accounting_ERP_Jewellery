import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

const companySchema = z.object({
  name: z.string().min(2),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  country: z.string().optional(),
  fiscalYearStartMonth: z.coerce.number().min(1).max(12).optional(),
  weightUnit: z.enum(["g", "tola"]).optional(),
  currency: z.literal("INR").optional(),
  timezone: z.string().optional(),
});

const inviteUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "ACCOUNTANT", "SALES", "VIEW_ONLY"]),
  password: z.string().min(6).default("Password@123"),
});

export const getCompanySettings = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) return fail(res, 404, "COMPANY_NOT_FOUND", "Company not found");
  
  return ok(res, company);
};

export const updateCompanySettings = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = companySchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid company settings payload", parsed.error.issues);

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: parsed.data,
  });

  return ok(res, updated, "Company settings updated");
};

export const getUsers = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const users = await prisma.user.findMany({
    where: { companyId },
    orderBy: { fullName: "asc" },
  });
  
  return ok(res, users);
};

export const inviteUser = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = inviteUserSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid invite payload", parsed.error.issues);

  const existing = await prisma.user.findFirst({
    where: { companyId, email: parsed.data.email }
  });
  if (existing) return fail(res, 409, "EMAIL_EXISTS", "User already exists");

  const user = await prisma.user.create({
    data: {
      ...parsed.data,
      companyId,
      createdBy: getActor(req),
    }
  });

  return created(res, user, "User invited");
};

export const updateUserRole = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const { role } = req.body;
  
  try {
    const updated = await prisma.user.update({
      where: { id: Number(req.params.id), companyId },
      data: { role },
    });
    return ok(res, updated, "User role updated");
  } catch {
    return fail(res, 404, "USER_NOT_FOUND", "User not found");
  }
};

export const removeUser = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    await prisma.user.update({
      where: { id: Number(req.params.id), companyId },
      data: { isActive: false },
    });
    return ok(res, true, "User deactivated");
  } catch {
    return fail(res, 404, "USER_NOT_FOUND", "User not found");
  }
};

export const getNumberSeries = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const series = await prisma.numberSeries.findMany({
    where: { companyId },
  });
  
  return ok(res, series);
};

export const updateNumberSeries = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const { prefix, current } = req.body;
  
  try {
    const updated = await prisma.numberSeries.update({
      where: { id: Number(req.params.id), companyId },
      data: { prefix, current },
    });
    return ok(res, updated, "Number series updated");
  } catch {
    return fail(res, 404, "SERIES_NOT_FOUND", "Series not found");
  }
};

export const getAuditLog = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const logs = await prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok(res, logs);
};

export const getIntegrations = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const integrations = await prisma.setting.findMany({
    where: { companyId, key: { startsWith: "integration." } }
  });
  
  return ok(res, integrations);
};

export const updateIntegration = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const { value } = req.body;
  const key = `integration.${req.params.key}`;
  
  // Settings table doesn't have a unique constraint on (companyId, key) in the schema view I saw earlier? 
  // Wait, let's check schema.
  const existing = await prisma.setting.findFirst({
    where: { companyId, key }
  });

  if (existing) {
    const updated = await prisma.setting.update({
      where: { id: existing.id },
      data: { value }
    });
    return ok(res, updated, "Integration updated");
  } else {
    const created = await prisma.setting.create({
      data: {
        companyId,
        key,
        value,
        createdBy: getActor(req),
      }
    });
    return ok(res, created, "Integration updated");
  }
};


