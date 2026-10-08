import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createSupplier,
  deleteSupplier,
  getSupplierBills,
  getSupplierById,
  getSupplierLedger,
  listSuppliers,
  updateSupplier,
} from "../controllers/suppliers/supplierController";

export const supplierRoutes = Router();
supplierRoutes.use(authMiddleware);

supplierRoutes.get("/", listSuppliers);
supplierRoutes.get("/:id", getSupplierById);
supplierRoutes.get("/:id/ledger", getSupplierLedger);
supplierRoutes.get("/:id/bills", getSupplierBills);
supplierRoutes.post("/", createSupplier);
supplierRoutes.put("/:id", updateSupplier);
supplierRoutes.delete("/:id", deleteSupplier);
