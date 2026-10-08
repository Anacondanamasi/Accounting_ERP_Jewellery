import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireCompanyContext } from "../middleware/companyContext";
import { writeAuditMiddleware } from "../middleware/writeAuditMiddleware";
import {
  getDocumentSettlements,
  getOpenDocuments,
  applyNote,
  applyPayment,
  reverseSettlement,
  getOutstandingSummary,
} from "../controllers/settlement/settlementController";

export const settlementRoutes = Router();
settlementRoutes.use(authMiddleware, requireCompanyContext, writeAuditMiddleware);

// Get settlements on a document
settlementRoutes.get("/settlements/:targetType/:targetId", getDocumentSettlements);

// Get outstanding summary (includes linked settlements)
settlementRoutes.get("/settlements/summary/:targetType/:targetId", getOutstandingSummary);

// Get open invoices/bills for a party (for UI dropdown)
settlementRoutes.get("/settlements/open-documents", getOpenDocuments);

// Apply credit/debit note to invoices/bills
settlementRoutes.post("/settlements/apply-note", applyNote);

// Apply payment to invoices/bills (split)
settlementRoutes.post("/settlements/apply-payment", applyPayment);

// Reverse (unlink) a settlement
settlementRoutes.delete("/settlements/:id", reverseSettlement);
