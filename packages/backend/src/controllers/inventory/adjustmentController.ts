import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { makeDocumentNumber, roundMoney, roundWeight } from "../../lib/documents";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

const adjustmentLineSchema = z.object({
  itemId: z.coerce.number(),
  currentQty: z.coerce.number(),
  currentWt: z.coerce.number(),
  adjustedQty: z.coerce.number(),
  adjustedWt: z.coerce.number(),
  diffQty: z.coerce.number(),
  diffWt: z.coerce.number(),
  oldRate: z.coerce.number(),
  newRate: z.coerce.number(),
  valueImpact: z.coerce.number(),
  accountId: z.coerce.number(),
});

const adjustmentSchema = z.object({
  date: z.string().min(1),
  type: z.string().min(3),
  reason: z.string().min(3),
  supportingDocUrl: z.string().optional(),
  lines: z.array(adjustmentLineSchema).default([]),
});

const includeLines = {
  lines: { include: { item: true }, orderBy: { createdAt: "asc" as const } },
};

export const listAdjustments = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const type = req.query.type ? String(req.query.type) : undefined;
  const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const rows = await prisma.inventoryAdjustment.findMany({
    where: {
      companyId,
      ...(type ? { type: { contains: type } } : {}),
      ...(status ? { status: status as any } : {}),
      ...(from || to ? { date: { gte: from, lte: to } } : {}),
    },
    include: includeLines,
    orderBy: { date: "desc" },
  });
  return ok(res, rows);
};

export const getAdjustmentById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const row = await prisma.inventoryAdjustment.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: includeLines,
  });
  if (!row) return fail(res, 404, "ADJUSTMENT_NOT_FOUND", "Adjustment not found");
  return ok(res, row);
};

export const createAdjustment = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = adjustmentSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid adjustment payload", parsed.error.issues);

  const row = await prisma.inventoryAdjustment.create({
    data: {
      companyId,
      adjNo: makeDocumentNumber("ADJ"),
      date: new Date(parsed.data.date),
      type: parsed.data.type,
      reason: parsed.data.reason,
      supportingDocUrl: parsed.data.supportingDocUrl,
      status: "DRAFT",
      createdBy: getActor(req),
      lines: {
        create: parsed.data.lines.map((line) => ({
          companyId,
          itemId: line.itemId,
          currentQty: roundWeight(line.currentQty),
          currentWt: roundWeight(line.currentWt),
          adjustedQty: roundWeight(line.adjustedQty),
          adjustedWt: roundWeight(line.adjustedWt),
          diffQty: roundWeight(line.diffQty),
          diffWt: roundWeight(line.diffWt),
          oldRate: roundMoney(line.oldRate),
          newRate: roundMoney(line.newRate),
          valueImpact: roundMoney(line.valueImpact),
          accountId: line.accountId,
          createdBy: getActor(req),
        })),
      },
    },
    include: includeLines,
  });

  return created(res, row, "Adjustment draft created");
};

export const updateAdjustment = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = adjustmentSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid adjustment update payload", parsed.error.issues);

  const existing = await prisma.inventoryAdjustment.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!existing) return fail(res, 404, "ADJUSTMENT_NOT_FOUND", "Adjustment not found");
  if (existing.status !== "DRAFT") {
    return fail(res, 400, "INVALID_STATUS", "Only draft adjustments can be updated");
  }

  const row = await prisma.$transaction(async (tx) => {
    if (parsed.data.lines) {
      await tx.inventoryAdjustmentLine.deleteMany({ where: { adjustmentId: existing.id, companyId } });
    }
    return tx.inventoryAdjustment.update({
      where: { id: existing.id },
      data: {
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
        type: parsed.data.type,
        reason: parsed.data.reason,
        supportingDocUrl: parsed.data.supportingDocUrl,
        ...(parsed.data.lines
          ? {
              lines: {
                create: parsed.data.lines.map((line) => ({
                  companyId,
                  itemId: line.itemId,
                  currentQty: roundWeight(line.currentQty),
                  currentWt: roundWeight(line.currentWt),
                  adjustedQty: roundWeight(line.adjustedQty),
                  adjustedWt: roundWeight(line.adjustedWt),
                  diffQty: roundWeight(line.diffQty),
                  diffWt: roundWeight(line.diffWt),
                  oldRate: roundMoney(line.oldRate),
                  newRate: roundMoney(line.newRate),
                  valueImpact: roundMoney(line.valueImpact),
                  accountId: line.accountId,
                  createdBy: getActor(req),
                })),
              },
            }
          : {}),
      },
      include: includeLines,
    });
  });

  return ok(res, row, "Adjustment updated");
};

const transitionAdjustment = async (
  req: Request,
  res: Response,
  fromStatus: string,
  toStatus: "SUBMITTED" | "APPROVED" | "POSTED",
  message: string,
) => {
  const companyId = getCompanyId(req);
  const row = await prisma.inventoryAdjustment.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: includeLines,
  });
  if (!row) return fail(res, 404, "ADJUSTMENT_NOT_FOUND", "Adjustment not found");
  if (row.status !== fromStatus) return fail(res, 400, "INVALID_STATUS", `Only ${fromStatus.toLowerCase()} adjustments can be processed`);

  if (toStatus !== "POSTED") {
    const updated = await prisma.inventoryAdjustment.update({
      where: { id: row.id },
      data: { status: toStatus, approvedBy: toStatus === "APPROVED" ? getActor(req) : undefined },
      include: includeLines,
    });
    return ok(res, updated, message);
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const line of row.lines) {
      await tx.stockLedger.create({
        data: {
          companyId,
          itemId: line.itemId,
          transactionType: "ADJUSTMENT",
          referenceType: "INVENTORY_ADJUSTMENT",
          referenceId: row.id,
          issuedQty: Number(line.diffQty) < 0 ? Math.abs(Number(line.diffQty)) : 0,
          issuedWt: Number(line.diffWt) < 0 ? Math.abs(Number(line.diffWt)) : 0,
          receivedQty: Number(line.diffQty) > 0 ? Number(line.diffQty) : 0,
          receivedWt: Number(line.diffWt) > 0 ? Number(line.diffWt) : 0,
          balanceQty: Number(line.adjustedQty),
          balanceWt: Number(line.adjustedWt),
          rate: line.newRate,
          value: line.valueImpact,
          narration: row.reason,
          createdBy: getActor(req),
        },
      });
    }
    return tx.inventoryAdjustment.update({
      where: { id: row.id },
      data: { status: "POSTED" },
      include: includeLines,
    });
  });

  return ok(res, updated, message);
};

export const submitAdjustment = (req: Request, res: Response) =>
  transitionAdjustment(req, res, "DRAFT", "SUBMITTED", "Submitted for approval");

export const approveAdjustment = (req: Request, res: Response) =>
  transitionAdjustment(req, res, "SUBMITTED", "APPROVED", "Adjustment approved");

export const postAdjustment = (req: Request, res: Response) =>
  transitionAdjustment(req, res, "APPROVED", "POSTED", "Adjustment posted");

const revaluationSchema = z.object({
  date: z.string().min(1),
  reason: z.string().min(3),
  previousRate22k: z.coerce.number(),
  newRate22k: z.coerce.number(),
});

export const createRevaluation = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = revaluationSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid revaluation payload", parsed.error.issues);

  const aggregate = await prisma.item.aggregate({
    where: { companyId, metalType: { contains: "GOLD" }, isActive: true },
    _sum: { netWt: true },
  });
  const goldWt = Number(aggregate._sum?.netWt || 0);
  const delta = parsed.data.newRate22k - parsed.data.previousRate22k;
  const valueImpact = roundMoney(goldWt * delta);

  return created(
    res,
    {
      date: parsed.data.date,
      reason: parsed.data.reason,
      goldWeightAffected: roundWeight(goldWt),
      valueImpact,
      accountHead: "Revaluation Reserve",
    },
    "Revaluation computed",
  );
};

