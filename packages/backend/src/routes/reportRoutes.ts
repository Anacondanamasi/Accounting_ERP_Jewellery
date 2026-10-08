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

export const reportRoutes = Router();
reportRoutes.use(authMiddleware);

reportRoutes.get("/ageing/receivables", getReceivablesAgeing);
reportRoutes.get("/ageing/receivables/export", getReceivablesAgeing); // ?export=csv
reportRoutes.get("/ageing/payables", getPayablesAgeing);
reportRoutes.get("/ageing/payables/export", getPayablesAgeing); // ?export=csv
reportRoutes.get("/trial-balance", getTrialBalance);
reportRoutes.get("/profit-loss", getProfitLoss);
reportRoutes.get("/balance-sheet", getBalanceSheet);
reportRoutes.get("/cash-flow", getCashFlow);
reportRoutes.get("/day-book", getDayBook);
reportRoutes.post("/export", exportFinancialReport);
