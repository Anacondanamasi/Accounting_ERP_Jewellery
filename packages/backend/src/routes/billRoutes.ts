import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/companyContext";
import {
  createBill,
  duplicateBill,
  getBillById,
  getNextBillNo,
  listBills,
  postBill,
  recordBillPayment,
  updateBill,
  voidBill,
  deleteBill,
} from "../controllers/bills/billController";

export const billRoutes = Router();
billRoutes.use(authMiddleware);

billRoutes.get("/", listBills);
billRoutes.get("/next-number", getNextBillNo);
billRoutes.get("/:id", getBillById);
billRoutes.post("/", requirePermission("bill.create"), createBill);
billRoutes.put("/:id", requirePermission("bill.create"), updateBill);
billRoutes.delete("/:id", requirePermission("bill.create"), deleteBill);
billRoutes.post("/:id/post", postBill);
billRoutes.post("/:id/void", requirePermission("bill.approve"), voidBill);
billRoutes.post("/:id/duplicate", requirePermission("bill.create"), duplicateBill);
billRoutes.post("/:id/record-payment", requirePermission("payment.create"), recordBillPayment);
