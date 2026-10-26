import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireCompanyContext } from "../middleware/companyContext";
import { getTransactionJournal } from "../controllers/journal/transactionJournalController";

export const transactionRoutes = Router();
transactionRoutes.use(authMiddleware);
transactionRoutes.use(requireCompanyContext);

transactionRoutes.get("/:type/:id/journal", getTransactionJournal);
