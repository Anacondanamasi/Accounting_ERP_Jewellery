import { Router } from "express";
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

export const bankingRoutes = Router();
bankingRoutes.use(authMiddleware);

bankingRoutes.get("/", listBankAccounts);
bankingRoutes.get("/:id", getBankAccountById);
bankingRoutes.post("/", createBankAccount);
bankingRoutes.put("/:id", updateBankAccount);
bankingRoutes.get("/:id/transactions", listBankTransactions);
bankingRoutes.post("/:id/transactions", createBankTransaction);
bankingRoutes.post("/:id/import", importBankStatement);
bankingRoutes.get("/:id/reconciliation", getReconciliationData);
bankingRoutes.post("/:id/reconciliation/match", matchReconciliation);
bankingRoutes.post("/:id/reconciliation/finalize", finalizeReconciliation);
