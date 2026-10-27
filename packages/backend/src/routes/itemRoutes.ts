import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createItem,
  deleteItem,
  deleteItemImage,
  exportItems,
  getItemBarcode,
  getItemById,
  getItemStockLedger,
  importItems,
  listItems,
  updateItem,
  uploadItemImages,
} from "../controllers/inventory/itemController";
import {
  getItemCodes,
  addItemCode,
  generatePrimaryItemCode,
  revokeItemCode,
  getItemQrSvg,
  backfillCompanyCodes,
  resolveScanCode,
} from "../controllers/inventory/itemCodeController";

export const itemRoutes = Router();

// Base item endpoints
itemRoutes.get("/", listItems);
itemRoutes.get("/export", exportItems);
itemRoutes.post("/import", importItems);
itemRoutes.post("/backfill-codes", backfillCompanyCodes);
itemRoutes.post("/resolve-scan", resolveScanCode);
itemRoutes.get("/barcode/:id", getItemBarcode);

// Item Barcode & QR code endpoints
itemRoutes.get("/:id/codes", getItemCodes);
itemRoutes.post("/:id/codes", addItemCode);
itemRoutes.post("/:id/codes/regenerate", generatePrimaryItemCode);
itemRoutes.delete("/:id/codes/:codeId", revokeItemCode);
itemRoutes.get("/:id/qr", getItemQrSvg);

// Single item actions
itemRoutes.get("/:id", getItemById);
itemRoutes.get("/:id/stock-ledger", getItemStockLedger);
itemRoutes.post("/", createItem);
itemRoutes.put("/:id", updateItem);
itemRoutes.delete("/:id", deleteItem);
itemRoutes.post("/:id/images", uploadItemImages);
itemRoutes.delete("/:id/images/:imageId", deleteItemImage);
