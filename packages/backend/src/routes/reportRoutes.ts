import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getPayablesAgeing, getReceivablesAgeing } from "../controllers/reports/ageingController";
import {
  exportFinancialReport,
  getBalanceSheet,
  getCashFlow,
  getDayBook,
  getProfitLoss,
  getTrialBalance,
} from "../controllers/reports/financialController";
import { getBulkJournalReport } from "../controllers/journal/transactionJournalController";
import {
  runJournalReport,
  getJournalFieldCatalog,
  exportJournalReport,
  listCustomReports,
  saveCustomReport,
  updateCustomReport,
  deleteCustomReport,
  listReportFolders,
  createReportFolder,
} from "../controllers/reports/journalReportEngineController";

export const reportRoutes = Router();
reportRoutes.use(authMiddleware);

// Advanced Journal Report Engine endpoints
reportRoutes.post("/journal/run", runJournalReport);
reportRoutes.get("/journal/fields", getJournalFieldCatalog);
reportRoutes.post("/journal/export", exportJournalReport);

// Custom Reports & Folders
reportRoutes.get("/custom", listCustomReports);
reportRoutes.post("/custom", saveCustomReport);
reportRoutes.put("/custom/:id", updateCustomReport);
reportRoutes.delete("/custom/:id", deleteCustomReport);
reportRoutes.get("/folders", listReportFolders);
reportRoutes.post("/folders", createReportFolder);

// Legacy routes preserved
reportRoutes.get("/journal", getBulkJournalReport);
reportRoutes.get("/ageing/receivables", getReceivablesAgeing);
reportRoutes.get("/ageing/receivables/export", getReceivablesAgeing);
reportRoutes.get("/ageing/payables", getPayablesAgeing);
reportRoutes.get("/ageing/payables/export", getPayablesAgeing);
reportRoutes.get("/trial-balance", getTrialBalance);
reportRoutes.get("/profit-loss", getProfitLoss);
reportRoutes.get("/balance-sheet", getBalanceSheet);
reportRoutes.get("/cash-flow", getCashFlow);
reportRoutes.get("/day-book", getDayBook);
reportRoutes.post("/export", exportFinancialReport);
