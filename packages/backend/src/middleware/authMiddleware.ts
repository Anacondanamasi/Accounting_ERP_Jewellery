import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../lib/security";
import { fail } from "../lib/apiResponse";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return fail(res, 401, "UNAUTHORIZED", "Missing access token");
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);

    // If company context has already been securely resolved by requireCompanyContext,
    // NEVER overwrite it with the token's legacy claim.
    const activeCompanyId = req.companyContext?.company.legacyCompanyId ?? req.auth?.companyId ?? payload.legacyCompanyId ?? payload.companyId ?? null;
    const activeLegacyCompanyId = req.companyContext?.company.legacyCompanyId ?? req.auth?.legacyCompanyId ?? payload.legacyCompanyId ?? null;

    req.auth = {
      userId: String(payload.sub),
      companyId: activeCompanyId,
      legacyCompanyId: activeLegacyCompanyId,
      role: req.companyContext?.role.name ?? String(payload.role ?? "viewer"),
    };

    return next();
  } catch {
    try {
      const legacy = jwt.verify(token, process.env.JWT_SECRET ?? "change-me") as unknown as {
        sub: number | string;
        companyId?: number | string;
        legacyCompanyId?: number;
        role?: string;
      };

      const activeCompanyId = req.companyContext?.company.legacyCompanyId ?? req.auth?.companyId ?? legacy.legacyCompanyId ?? legacy.companyId ?? null;
      const activeLegacyCompanyId = req.companyContext?.company.legacyCompanyId ?? req.auth?.legacyCompanyId ?? legacy.legacyCompanyId ?? null;

      req.auth = {
        userId: String(legacy.sub),
        companyId: activeCompanyId,
        legacyCompanyId: activeLegacyCompanyId,
        role: req.companyContext?.role.name ?? legacy.role ?? "viewer",
      };
      return next();
    } catch {
      return fail(res, 401, "TOKEN_INVALID", "Your session has expired. Please sign in again.");
    }
  }
};
