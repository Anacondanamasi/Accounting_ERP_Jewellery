import type { NextFunction, Request, Response } from "express";
import { writeAuditLog } from "../lib/audit";

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const writeAuditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!writeMethods.has(req.method)) {
    return next();
  }

  const started = Date.now();
  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    void writeAuditLog({
      req,
      action: `http.${req.method.toLowerCase()}`,
      entityType: "request",
      entityId: null,
      companyId: (req.companyContext?.company.id ?? req.auth?.companyId ?? null)?.toString() ?? null,
      userId: req.auth?.userId?.toString() ?? null,
      newValues: {
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - started,
      },
    });
  });

  return next();
};

