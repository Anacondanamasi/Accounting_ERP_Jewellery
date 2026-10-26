import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/companyContext";
import {
  createDirectExpense,
  listExpenses,
  getExpenseById,
  updateDirectExpense,
  deleteDirectExpense,
} from "../controllers/expenses/expenseController";

export const expenseRoutes = Router();
expenseRoutes.use(authMiddleware);

expenseRoutes.get("/", listExpenses);
expenseRoutes.post("/", requirePermission("journal.create"), createDirectExpense);
expenseRoutes.get("/:id", getExpenseById);
expenseRoutes.put("/:id", requirePermission("journal.create"), updateDirectExpense);
expenseRoutes.delete("/:id", requirePermission("journal.create"), deleteDirectExpense);
