import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  deletePayment,
  getPaymentById,
  updatePayment,
} from "../controllers/payments/paymentController";

export const paymentRoutes = Router();
paymentRoutes.use(authMiddleware);

paymentRoutes.get("/:id", getPaymentById);
paymentRoutes.put("/:id", updatePayment);
paymentRoutes.delete("/:id", deletePayment);
