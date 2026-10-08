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
    req.auth = {
      userId: String(payload.sub),
      companyId: payload.legacyCompanyId ?? payload.companyId ?? null,
      legacyCompanyId: payload.legacyCompanyId ?? null,
      role: String(payload.role ?? "viewer"),
    };

    return next();
  } catch {
    try {
      const legacy = jwt.verify(token, process.env.JWT_SECRET ?? "change-me") as unknown as {
        sub: number;
        companyId?: number;
        role?: string;
      };
      req.auth = {
        userId: String(legacy.sub),
        companyId: null,
        legacyCompanyId: legacy.companyId ?? null,
        role: legacy.role ?? "viewer",
      };
      return next();
    } catch {
      return fail(res, 401, "TOKEN_INVALID", "Your session has expired. Please sign in again.");
    }
  }
};
