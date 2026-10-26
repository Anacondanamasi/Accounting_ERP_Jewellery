import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireCompanyContext, requirePermission } from "../middleware/companyContext";
import {
  listAuditEvents,
  getEntityHistory,
  verifyAuditChain,
  getStatutoryAuditReport,
  restoreDeletedEntity,
} from "../controllers/audit/auditController";

export const auditRoutes = Router();
auditRoutes.use(authMiddleware);
auditRoutes.use(requireCompanyContext);

// Access control: view_audit_log for full log, history available per permissions
auditRoutes.get("/events", requirePermission("view_audit_log"), listAuditEvents);
auditRoutes.get("/entities/:entityType/:entityId/history", getEntityHistory);
auditRoutes.post("/verify-chain", requirePermission("view_audit_log"), verifyAuditChain);
auditRoutes.get("/statutory-report", requirePermission("view_audit_log"), getStatutoryAuditReport);
auditRoutes.post("/entities/:entityType/:entityId/restore", requirePermission("invoice.create"), restoreDeletedEntity);
