import type { Request } from "express";
import crypto from "crypto";
import { prisma } from "./prisma";

type AuditInput = {
  req: Request;
  action: string;
  entityType: string;
  entityId?: string | null;
  companyId?: string | null;
  userId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
};

export const writeAuditLog = async (input: AuditInput) => {
  const ip = input.req.ip || input.req.socket.remoteAddress || "unknown";
  const userAgent = input.req.get("user-agent") || "unknown";
  const userId = input.userId ?? (input.req.auth?.userId != null ? String(input.req.auth.userId) : null);
  const companyId = input.companyId ?? input.req.companyContext?.company.id ?? null;

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO audit_logs
      (id, company_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      crypto.randomUUID(),
      companyId,
      userId,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.oldValues ? JSON.stringify(input.oldValues) : null,
      input.newValues ? JSON.stringify(input.newValues) : null,
      ip,
      userAgent,
    );
  } catch {
    // Do not block user flow if audit write fails in development.
  }
};
