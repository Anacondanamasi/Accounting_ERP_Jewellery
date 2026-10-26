import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createBankAccount,
  createBankTransaction,
  finalizeReconciliation,
  getBankAccountById,
  getReconciliationData,
  importBankStatement,
  listBankAccounts,
  listBankTransactions,
  matchReconciliation,
  updateBankAccount,
} from "../controllers/banking/bankingController";
import {
  downloadImportTemplate,
  uploadStatement,
  listFeedLines,
  getFeedLineMatches,
  categorizeFeedLine,
  matchFeedLine,
  excludeFeedLine,
  undoFeedLine,
  undoBatch,
  getReconciliationHistory,
  startReconciliation,
  updateReconciliationItems,
  finishReconciliation,
  undoReconciliation,
} from "../controllers/banking/bankFeedController";
import {
  listBankRules,
  getBankRuleById,
  createBankRule,
  updateBankRule,
  deleteBankRule,
  reorderBankRules,
  previewBankRule,
  applyRulesNow,
  seedStarterRules,
  exportBankRules,
  importBankRules,
  undoAllByRule,
} from "../controllers/banking/bankRulesController";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

export const bankingRoutes = Router();
bankingRoutes.use(authMiddleware);

// Accounts CRUD
bankingRoutes.get("/", listBankAccounts);
bankingRoutes.get("/:id", getBankAccountById);
bankingRoutes.post("/", createBankAccount);
bankingRoutes.put("/:id", updateBankAccount);

// Legacy Manual Txns (preserved)
bankingRoutes.get("/:id/transactions", listBankTransactions);
bankingRoutes.post("/:id/transactions", createBankTransaction);
bankingRoutes.post("/:id/import", importBankStatement);
bankingRoutes.get("/:id/reconciliation", getReconciliationData);
bankingRoutes.post("/:id/reconciliation/match", matchReconciliation);
bankingRoutes.post("/:id/reconciliation/finalize", finalizeReconciliation);

// QBO Bank Feed & Import Pipeline
bankingRoutes.get("/:id/template/xlsx", downloadImportTemplate);
bankingRoutes.get("/:id/template/csv", downloadImportTemplate);
bankingRoutes.post("/:id/upload", upload.single("file"), uploadStatement);
bankingRoutes.get("/:id/feed", listFeedLines);
bankingRoutes.get("/:id/feed/:lineId/matches", getFeedLineMatches);
bankingRoutes.post("/:id/feed/:lineId/categorize", categorizeFeedLine);
bankingRoutes.post("/:id/feed/:lineId/match", matchFeedLine);
bankingRoutes.post("/:id/feed/:lineId/exclude", excludeFeedLine);
bankingRoutes.post("/:id/feed/:lineId/undo", undoFeedLine);
bankingRoutes.post("/:id/batches/:batchId/undo", undoBatch);

// Bank Rules Engine (QBO Equivalent)
bankingRoutes.get("/rules", listBankRules);
bankingRoutes.post("/rules", createBankRule);
bankingRoutes.get("/rules/export", exportBankRules);
bankingRoutes.post("/rules/import", importBankRules);
bankingRoutes.post("/rules/reorder", reorderBankRules);
bankingRoutes.post("/rules/preview", previewBankRule);
bankingRoutes.post("/rules/apply-now", applyRulesNow);
bankingRoutes.post("/rules/starter-library", seedStarterRules);
bankingRoutes.get("/rules/:id", getBankRuleById);
bankingRoutes.put("/rules/:id", updateBankRule);
bankingRoutes.delete("/rules/:id", deleteBankRule);
bankingRoutes.post("/rules/:id/undo-all", undoAllByRule);

// Legacy account-scoped rules
bankingRoutes.get("/:id/rules", listBankRules);
bankingRoutes.post("/:id/rules", createBankRule);

// QBO / Xero Reconcile Engine
bankingRoutes.get("/:id/reconcile/history", getReconciliationHistory);
bankingRoutes.post("/:id/reconcile/start", startReconciliation);
bankingRoutes.post("/:id/reconcile/:reconId/items", updateReconciliationItems);
bankingRoutes.post("/:id/reconcile/:reconId/finish", finishReconciliation);
bankingRoutes.post("/:id/reconcile/:reconId/undo", undoReconciliation);
