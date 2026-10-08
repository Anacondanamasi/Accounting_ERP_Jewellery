import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/companyContext";
import { createDirectExpense, listExpenses } from "../controllers/expenses/expenseController";

export const expenseRoutes = Router();
expenseRoutes.use(authMiddleware);

expenseRoutes.get("/", listExpenses);
expenseRoutes.post("/", requirePermission("journal.create"), createDirectExpense);
