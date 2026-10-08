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

export const itemRoutes = Router();
itemRoutes.use(authMiddleware);

itemRoutes.get("/", listItems);
itemRoutes.get("/export", exportItems);
itemRoutes.post("/import", importItems);
itemRoutes.get("/barcode/:id", getItemBarcode);
itemRoutes.get("/:id", getItemById);
itemRoutes.get("/:id/stock-ledger", getItemStockLedger);
itemRoutes.post("/", createItem);
itemRoutes.put("/:id", updateItem);
itemRoutes.delete("/:id", deleteItem);
itemRoutes.post("/:id/images", uploadItemImages);
itemRoutes.delete("/:id/images/:imageId", deleteItemImage);
