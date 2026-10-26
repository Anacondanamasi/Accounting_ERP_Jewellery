import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createHsnMaster,
  exportGstReturn,
  getGstr1,
  getGstr3b,
  getPurchaseBillsFor2B,
  getHsnMaster,
  getTdsSummary,
  updateHsnMaster,
} from "../controllers/tax/taxController";

export const taxRoutes = Router();
taxRoutes.use(authMiddleware);

taxRoutes.get("/gst/gstr1", getGstr1);
taxRoutes.get("/gst/gstr3b", getGstr3b);
taxRoutes.get("/gst/purchases", getPurchaseBillsFor2B);
taxRoutes.post("/gst/export", exportGstReturn);

taxRoutes.get("/tds", getTdsSummary);

taxRoutes.get("/hsn", getHsnMaster);
taxRoutes.post("/hsn", createHsnMaster);
taxRoutes.put("/hsn/:id", updateHsnMaster);
