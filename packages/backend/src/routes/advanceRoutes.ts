import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  applyAdvance,
  createAdvance,
  listAdvances,
} from "../controllers/advances/advanceController";

export const advanceRoutes = Router();
advanceRoutes.use(authMiddleware);

advanceRoutes.get("/", listAdvances);
advanceRoutes.post("/", createAdvance);
advanceRoutes.post("/:id/apply", applyAdvance);
