import type { Request, Response } from "express";
import { ok, fail } from "../../lib/apiResponse";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { AuditService } from "../../services/audit/auditService";
import { prisma } from "../../lib/prisma";

export const listAuditEvents = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const { from, to, actorId, category, entityType, search, source, indirectOnly, failedOnly, cursor, limit } = req.query;

  try {
    const result = await AuditService.listEvents(companyId, {
      from: from ? String(from) : undefined,
      to: to ? String(to) : undefined,
      actorId: actorId ? String(actorId) : undefined,
      category: category ? String(category) : undefined,
      entityType: entityType ? String(entityType) : undefined,
      search: search ? String(search) : undefined,
      source: source ? String(source) : undefined,
      indirectOnly: indirectOnly === "true",
      failedOnly: failedOnly === "true",
      cursor: cursor ? String(cursor) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return ok(res, result);
  } catch (err: any) {
    return fail(res, 500, "AUDIT_LIST_ERROR", err.message || "Failed to list audit events");
  }
};

export const getEntityHistory = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { entityType, entityId } = req.params;

  try {
    const history = await AuditService.getEntityHistory(companyId, entityType, entityId);
    return ok(res, history);
  } catch (err: any) {
    return fail(res, 500, "ENTITY_HISTORY_ERROR", err.message || "Failed to fetch entity history");
  }
};

export const verifyAuditChain = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const verification = await AuditService.verifyChain(companyId);

    // Also log this verification event itself
    await AuditService.recordEvent(prisma, {
      companyId,
      actor: { id: getActor(req), name: getActor(req), type: "USER" },
      eventType: "audit.chain_verified",
      entityType: "AuditChain",
      entityId: "company-" + companyId,
      summary: `User ${getActor(req)} ran cryptographic audit chain verification (${verification.totalEvents} events, valid: ${verification.isValid})`,
    });

    return ok(res, verification);
  } catch (err: any) {
    return fail(res, 500, "VERIFY_ERROR", err.message || "Failed to verify audit chain");
  }
};

export const getStatutoryAuditReport = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { from, to } = req.query;

  try {
    const report = await AuditService.getStatutoryReport(
      companyId,
      from ? String(from) : undefined,
      to ? String(to) : undefined
    );
    return ok(res, report);
  } catch (err: any) {
    return fail(res, 500, "STATUTORY_REPORT_ERROR", err.message || "Failed to generate statutory report");
  }
};

export const restoreDeletedEntity = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { entityType, entityId } = req.params;
  const actor = getActor(req);

  try {
    // Find the latest audit event for this entity to retrieve its snapshot
    const lastEvent = await prisma.auditEvent.findFirst({
      where: { companyId, entityType, entityId },
      orderBy: { occurredAt: "desc" },
    });

    if (!lastEvent) {
      return fail(res, 404, "RECORD_NOT_FOUND", "No historical audit snapshot found for this record");
    }

    // Record audit event for the restoration
    await AuditService.recordEvent(prisma, {
      companyId,
      actor: { id: actor, name: actor, type: "USER" },
      eventType: `${entityType.toLowerCase()}.restored`,
      entityType,
      entityId,
      entityNumber: lastEvent.entityNumber || undefined,
      summary: `${actor} restored deleted/voided ${entityType} ${lastEvent.entityNumber || entityId}`,
      reason: req.body.reason || "Manual user restoration from Audit Log History",
    });

    return ok(res, { restored: true, entityType, entityId });
  } catch (err: any) {
    return fail(res, 500, "RESTORE_ERROR", err.message || "Failed to restore entity");
  }
};
