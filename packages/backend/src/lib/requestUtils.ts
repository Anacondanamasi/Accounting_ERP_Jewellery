import type { Request } from "express";

export const getCompanyId = (req: Request): number => {
  const companyId = req.auth?.companyId ?? req.auth?.legacyCompanyId;
  if (companyId === null || companyId === undefined) {
    throw new Error("Company ID is missing from request context");
  }
  return Number(companyId);
};

export const getUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (userId === null || userId === undefined) {
    throw new Error("User ID is missing from request context");
  }
  return String(userId);
};

export const getActor = (req: Request): string => {
  return getUserId(req);
};
