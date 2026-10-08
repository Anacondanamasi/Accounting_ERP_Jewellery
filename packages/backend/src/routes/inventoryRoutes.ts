import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  approveAdjustment,
  createAdjustment,
  createRevaluation,
  getAdjustmentById,
  listAdjustments,
  postAdjustment,
  submitAdjustment,
  updateAdjustment,
} from "../controllers/inventory/adjustmentController";

export const inventoryRoutes = Router();
inventoryRoutes.use(authMiddleware);

inventoryRoutes.get("/adjustments", listAdjustments);
inventoryRoutes.get("/adjustments/:id", getAdjustmentById);
inventoryRoutes.post("/adjustments", createAdjustment);
inventoryRoutes.put("/adjustments/:id", updateAdjustment);
inventoryRoutes.post("/adjustments/:id/submit", submitAdjustment);
inventoryRoutes.post("/adjustments/:id/approve", approveAdjustment);
inventoryRoutes.post("/adjustments/:id/post", postAdjustment);
inventoryRoutes.post("/adjustments/revaluation", createRevaluation);
