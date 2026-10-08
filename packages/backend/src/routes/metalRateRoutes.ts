import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createRateEntry,
  getRateChart,
  getRateHistory,
  getTodayRates,
  refreshRates,
} from "../controllers/inventory/metalRateController";

export const metalRateRoutes = Router();
metalRateRoutes.use(authMiddleware);

metalRateRoutes.get("/today", getTodayRates);
metalRateRoutes.get("/history", getRateHistory);
metalRateRoutes.get("/chart", getRateChart);
metalRateRoutes.post("/", createRateEntry);
metalRateRoutes.post("/refresh", refreshRates);
