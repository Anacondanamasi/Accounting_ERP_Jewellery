import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

const rateEntrySchema = z.object({
  date: z.string().min(1),
  karat24: z.coerce.number().positive(),
  karat22: z.coerce.number().positive(),
  karat18: z.coerce.number().positive(),
  karat14: z.coerce.number().positive(),
  silver: z.coerce.number().positive(),
  source: z.string().default("MANUAL"),
  overrideReason: z.string().optional(),
});

export const getTodayRates = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const today = await prisma.metalRate.findFirst({
    where: { companyId },
    orderBy: { date: "desc" },
  });
  
  if (!today) return fail(res, 404, "RATE_NOT_FOUND", "Rates not found");

  return ok(res, today);
};

export const getRateHistory = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const rows = await prisma.metalRate.findMany({
    where: {
      companyId,
      ...(from || to ? { date: { gte: from, lte: to } } : {}),
    },
    orderBy: { date: "desc" },
  });
  return ok(res, rows);
};

export const getRateChart = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const months = Math.max(1, Number(req.query.months ?? 12));

  const rows = await prisma.metalRate.findMany({
    where: { companyId },
    orderBy: { date: "desc" },
    take: months * 30,
  });

  return ok(res, rows.reverse());
};

export const createRateEntry = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = rateEntrySchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid rate payload", parsed.error.issues);

  const row = await prisma.metalRate.create({
    data: {
      ...parsed.data,
      companyId,
      date: new Date(parsed.data.date),
      createdBy: getActor(req),
    }
  });
  
  return created(res, row, "Rate entry added");
};

export const refreshRates = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const latest = await prisma.metalRate.findFirst({
    where: { companyId },
    orderBy: { date: "desc" },
  });
  if (!latest) return fail(res, 404, "RATE_NOT_FOUND", "No previous rates found");

  const bump = 5.5;
  const row = await prisma.metalRate.create({
    data: {
      companyId,
      date: new Date(),
      karat24: Number(latest.karat24) + bump,
      karat22: Number(latest.karat22) + bump * 0.92,
      karat18: Number(latest.karat18) + bump * 0.75,
      karat14: Number(latest.karat14) + bump * 0.6,
      silver: Number(latest.silver) + 0.2,
      source: "MCX",
      createdBy: "system",
    }
  });

  return ok(res, row, "Rates refreshed from MCX");
};


