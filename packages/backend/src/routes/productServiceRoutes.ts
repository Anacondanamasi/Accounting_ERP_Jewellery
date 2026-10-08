import { Router } from "express";
import { requirePermission } from "../middleware/companyContext";
import {
  listProductServices,
  getProductServiceById,
  createProductService,
  updateProductService,
  archiveProductService,
  bulkArchive,
  getStockMovements,
  exportProductServices,
} from "../controllers/productServices/productServicesController";

export const productServiceRoutes = Router();

productServiceRoutes.get("/", listProductServices);
productServiceRoutes.get("/export", exportProductServices);
productServiceRoutes.get("/:id", getProductServiceById);
productServiceRoutes.get("/:id/movements", getStockMovements);
productServiceRoutes.post("/", requirePermission("invoice.create"), createProductService);
productServiceRoutes.put("/:id", requirePermission("invoice.create"), updateProductService);
productServiceRoutes.post("/:id/archive", requirePermission("invoice.create"), archiveProductService);
productServiceRoutes.post("/bulk-archive", requirePermission("invoice.create"), bulkArchive);
