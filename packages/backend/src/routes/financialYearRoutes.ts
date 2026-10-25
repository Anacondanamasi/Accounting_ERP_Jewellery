import { Router } from "express";
import {
  listFinancialYears,
  createFinancialYear,
  setActiveFinancialYear,
  getClosingPreview,
  closeFinancialYear,
  reopenFinancialYear,
} from "../controllers/accounting/financialYearController";

export const financialYearRoutes = Router();

financialYearRoutes.get("/", listFinancialYears);
financialYearRoutes.post("/", createFinancialYear);
financialYearRoutes.post("/:id/activate", setActiveFinancialYear);
financialYearRoutes.get("/:id/closing-preview", getClosingPreview);
financialYearRoutes.post("/:id/close", closeFinancialYear);
financialYearRoutes.post("/:id/reopen", reopenFinancialYear);
