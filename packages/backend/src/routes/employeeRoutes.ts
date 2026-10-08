import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok, created, fail } from "../lib/apiResponse";
import { authMiddleware } from "../middleware/authMiddleware";

export const employeeRoutes = Router();
employeeRoutes.use(authMiddleware);

const company = (req: any) => req.auth?.companyId as number;
const actor = (req: any) => req.auth?.userId || "system";

const employeeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  designation: z.string().default("Staff"),
  department: z.string().default("General"),
  dateOfJoin: z.string().default(() => new Date().toISOString()),
  pan: z.string().optional().nullable(),
  aadhaar: z.string().optional().nullable(),
  basicSalary: z.coerce.number().default(0),
  hra: z.coerce.number().default(0),
  otherAllowances: z.coerce.number().default(0),
  pfApplicable: z.boolean().default(false),
  esiApplicable: z.boolean().default(false),
  bankName: z.string().optional().nullable(),
  accountNo: z.string().optional().nullable(),
  ifsc: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

employeeRoutes.get("/", async (req, res) => {
  const companyId = company(req);
  const rows = await prisma.employee.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  return ok(res, rows);
});

employeeRoutes.post("/", async (req, res) => {
  const companyId = company(req);
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid employee payload", parsed.error.issues);
  const row = await prisma.employee.create({
    data: { ...parsed.data, dateOfJoin: new Date(parsed.data.dateOfJoin), companyId, createdBy: actor(req) },
  });
  return created(res, row, "Employee created");
});

employeeRoutes.put("/:id", async (req, res) => {
  const companyId = company(req);
  const parsed = employeeSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid employee payload", parsed.error.issues);
  const existing = await prisma.employee.findFirst({ where: { companyId, id: Number(req.params.id) } });
  if (!existing) return fail(res, 404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  const row = await prisma.employee.update({
    where: { id: existing.id },
    data: { ...parsed.data, dateOfJoin: parsed.data.dateOfJoin ? new Date(parsed.data.dateOfJoin) : undefined },
  });
  return ok(res, row, "Employee updated");
});
