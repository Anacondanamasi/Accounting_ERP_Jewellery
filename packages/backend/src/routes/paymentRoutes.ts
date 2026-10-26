import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  deletePayment,
  getPaymentById,
  updatePayment,
  listSupplierPayments,
  createSupplierPayment,
} from "../controllers/payments/paymentController";

export const paymentRoutes = Router();
paymentRoutes.use(authMiddleware);

paymentRoutes.get("/suppliers", listSupplierPayments);
paymentRoutes.post("/suppliers", createSupplierPayment);
paymentRoutes.get("/:id", getPaymentById);
paymentRoutes.put("/:id", updatePayment);
paymentRoutes.delete("/:id", deletePayment);
