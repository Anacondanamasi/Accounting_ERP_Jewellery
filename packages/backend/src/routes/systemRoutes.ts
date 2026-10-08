import { Router } from "express";
import {
  getTodayMetalRates,
  getUnreadNotificationCount,
} from "../controllers/system/systemController";
import { authMiddleware } from "../middleware/authMiddleware";

export const systemRoutes = Router();

systemRoutes.get("/metal-rates/today", authMiddleware, getTodayMetalRates);
systemRoutes.get("/notifications/unread-count", authMiddleware, getUnreadNotificationCount);
