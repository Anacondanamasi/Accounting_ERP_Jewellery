import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

export const dashboardRoutes = Router();
dashboardRoutes.get("/summary", authMiddleware, getDashboardSummary);
