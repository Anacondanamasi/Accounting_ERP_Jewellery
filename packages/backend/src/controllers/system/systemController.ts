import type { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId } from "../../lib/requestUtils";

export const getTodayMetalRates = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const latest = await prisma.metalRate.findFirst({
    where: { companyId },
    orderBy: { date: "desc" },
  });

  return ok(res, {
    karat24: Number(latest?.karat24 ?? 0),
    karat22: Number(latest?.karat22 ?? 0),
    karat18: Number(latest?.karat18 ?? 0),
    karat14: Number(latest?.karat14 ?? 0),
    silver: Number(latest?.silver ?? 0),
  });
};

export const getUnreadNotificationCount = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const count = await prisma.notification.count({ where: { companyId, isRead: false } });
  return ok(res, { count });
};

