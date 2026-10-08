import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok, created, fail } from "../lib/apiResponse";
import { roundMoney } from "../lib/documents";
import { authMiddleware } from "../middleware/authMiddleware";

export const payrollRoutes = Router();
payrollRoutes.use(authMiddleware);

const company = (req: any) => req.auth?.companyId as number;
const actor = (req: any) => req.auth?.userId || "system";

const salarySchema = z.object({
  employeeId: z.coerce.number(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
  daysWorked: z.coerce.number().default(30),
  tdsDeduction: z.coerce.number().default(0),
  status: z.string().default("DRAFT"),
});

payrollRoutes.get("/", async (req, res) => {
  const companyId = company(req);
  const rows = await prisma.salaryRecord.findMany({
    where: {
      companyId,
      ...(req.query.month ? { month: Number(req.query.month) } : {}),
      ...(req.query.year ? { year: Number(req.query.year) } : {}),
    },
    include: { employee: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return ok(res, rows);
});

payrollRoutes.get("/:id", async (req, res) => {
  const companyId = company(req);
  const row = await prisma.salaryRecord.findFirst({
    where: { companyId, id: Number(req.params.id) },
    include: { employee: true },
  });
  if (!row) return fail(res, 404, "SALARY_RECORD_NOT_FOUND", "Salary record not found");
  return ok(res, row);
});

payrollRoutes.post("/", async (req, res) => {
  const companyId = company(req);
  const parsed = salarySchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid salary payload", parsed.error.issues);
  const employee = await prisma.employee.findFirst({ where: { companyId, id: parsed.data.employeeId } });
  if (!employee) return fail(res, 404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  const basicEarned = roundMoney((Number(employee.basicSalary) / 30) * parsed.data.daysWorked);
  const hra = roundMoney((Number(employee.hra) / 30) * parsed.data.daysWorked);
  const allowances = roundMoney((Number(employee.otherAllowances) / 30) * parsed.data.daysWorked);
  const pfDeduction = employee.pfApplicable ? roundMoney(basicEarned * 0.12) : 0;
  const esiDeduction = employee.esiApplicable ? roundMoney((basicEarned + hra + allowances) * 0.0075) : 0;
  const netPay = roundMoney(basicEarned + hra + allowances - pfDeduction - esiDeduction - parsed.data.tdsDeduction);
  const row = await prisma.salaryRecord.create({
    data: {
      companyId,
      employeeId: employee.id,
      month: parsed.data.month,
      year: parsed.data.year,
      daysWorked: parsed.data.daysWorked,
      basicEarned,
      hra,
      allowances,
      pfDeduction,
      esiDeduction,
      tdsDeduction: parsed.data.tdsDeduction,
      netPay,
      status: parsed.data.status,
      createdBy: actor(req),
    },
    include: { employee: true },
  });
  return created(res, row, "Salary record created");
});

payrollRoutes.put("/:id", async (req, res) => {
  const companyId = company(req);
  const existing = await prisma.salaryRecord.findFirst({ where: { companyId, id: Number(req.params.id) } });
  if (!existing) return fail(res, 404, "SALARY_RECORD_NOT_FOUND", "Salary record not found");
  const row = await prisma.salaryRecord.update({ where: { id: existing.id }, data: req.body });
  return ok(res, row, "Salary record updated");
});
