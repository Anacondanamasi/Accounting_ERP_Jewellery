import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createJobWorkOrder,
  createJwoBill,
  getJobWorkOrderById,
  listJobWorkOrders,
  returnJobWork,
} from "../controllers/inventory/karigarController";

export const jobWorkRoutes = Router();
jobWorkRoutes.use(authMiddleware);

jobWorkRoutes.get("/", listJobWorkOrders);
jobWorkRoutes.get("/:id", getJobWorkOrderById);
jobWorkRoutes.post("/", createJobWorkOrder);
jobWorkRoutes.post("/:id/return", returnJobWork);
jobWorkRoutes.post("/:id/bill", createJwoBill);
