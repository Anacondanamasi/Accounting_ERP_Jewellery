import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok, created, fail } from "../lib/apiResponse";
import { authMiddleware } from "../middleware/authMiddleware";

export const schemeRoutes = Router();
schemeRoutes.use(authMiddleware);

const company = (req: any) => req.auth?.companyId as number;
const actor = (req: any) => req.auth?.userId || "system";

const schemeSchema = z.object({
  name: z.string().min(1),
  monthlyMin: z.coerce.number().nonnegative(),
  monthlyMax: z.coerce.number().nonnegative(),
  durationMonths: z.coerce.number().int().positive(),
  bonusType: z.string().min(1),
  bonusValue: z.coerce.number().nonnegative(),
  isActive: z.boolean().default(true),
});

schemeRoutes.get("/", async (req, res) => {
  const companyId = company(req);
  const rows = await prisma.goldScheme.findMany({
    where: { companyId },
    include: { members: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, rows);
});

schemeRoutes.get("/:id", async (req, res) => {
  const companyId = company(req);
  const row = await prisma.goldScheme.findFirst({
    where: { companyId, id: Number(req.params.id) },
    include: { members: { include: { customer: true } } },
  });
  if (!row) return fail(res, 404, "SCHEME_NOT_FOUND", "Scheme not found");
  return ok(res, row);
});

schemeRoutes.post("/", async (req, res) => {
  const companyId = company(req);
  const parsed = schemeSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid scheme payload", parsed.error.issues);
  const row = await prisma.goldScheme.create({ data: { ...parsed.data, companyId, createdBy: actor(req) } });
  return created(res, row, "Scheme created");
});

schemeRoutes.put("/:id", async (req, res) => {
  const companyId = company(req);
  const parsed = schemeSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid scheme payload", parsed.error.issues);
  const existing = await prisma.goldScheme.findFirst({ where: { companyId, id: Number(req.params.id) } });
  if (!existing) return fail(res, 404, "SCHEME_NOT_FOUND", "Scheme not found");
  const row = await prisma.goldScheme.update({ where: { id: existing.id }, data: parsed.data });
  return ok(res, row, "Scheme updated");
});

// Member Endpoints
const memberSchema = z.object({
  schemeId: z.coerce.number(),
  customerId: z.coerce.number(),
  enrollDate: z.string().default(() => new Date().toISOString()),
  monthlyAmt: z.coerce.number().positive(),
  totalInstallments: z.coerce.number().int().positive(),
});

schemeRoutes.get("/members/all", async (req, res) => {
  const companyId = company(req);
  const rows = await prisma.schemeMember.findMany({
    where: { companyId },
    include: { scheme: true, customer: true },
    orderBy: { enrollDate: "desc" },
  });
  return ok(res, rows);
});

schemeRoutes.post("/members", async (req, res) => {
  const companyId = company(req);
  const parsed = memberSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid member payload", parsed.error.issues);
  
  const maturityDate = new Date(parsed.data.enrollDate);
  maturityDate.setMonth(maturityDate.getMonth() + parsed.data.totalInstallments);

  const row = await prisma.schemeMember.create({
    data: {
      ...parsed.data,
      companyId,
      enrollDate: new Date(parsed.data.enrollDate),
      maturityDate,
      paidInstallments: 0,
      totalDeposited: 0,
      bonusAmount: 0,
      status: "ACTIVE",
      createdBy: actor(req),
    },
    include: { scheme: true, customer: true },
  });
  return created(res, row, "Member enrolled");
});

schemeRoutes.post("/members/:id/pay", async (req, res) => {
  const companyId = company(req);
  const member = await prisma.schemeMember.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: { scheme: true },
  });
  if (!member) return fail(res, 404, "MEMBER_NOT_FOUND", "Member not found");

  const row = await prisma.schemeMember.update({
    where: { id: member.id },
    data: {
      paidInstallments: { increment: 1 },
      totalDeposited: { increment: member.monthlyAmt },
    },
    include: { scheme: true },
  });

  // Check if fully paid
  if (row.paidInstallments >= row.totalInstallments) {
    let bonus = 0;
    if (row.scheme.bonusType === "INSTALLMENT") {
      bonus = Number(row.monthlyAmt) * Number(row.scheme.bonusValue);
    } else if (row.scheme.bonusType === "PERCENTAGE") {
      bonus = (Number(row.totalDeposited) * Number(row.scheme.bonusValue)) / 100;
    } else {
      bonus = Number(row.scheme.bonusValue);
    }

    await prisma.schemeMember.update({
      where: { id: row.id },
      data: { status: "MATURED", bonusAmount: bonus },
    });
  }

  return ok(res, row, "Installment paid");
});

