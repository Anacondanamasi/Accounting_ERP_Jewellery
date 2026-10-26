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
import {
  getTaxCodes,
  validateGstinApi,
  calculateTaxPreview,
  postGstSettlementJournal,
  getItcRegister,
} from "../controllers/tax/gstEngineController";

export const taxRoutes = Router();
taxRoutes.use(authMiddleware);

// GST Engine: Tax Codes, Validation, Calculation Preview
taxRoutes.get("/codes", getTaxCodes);
taxRoutes.get("/validate-gstin", validateGstinApi);
taxRoutes.post("/validate-gstin", validateGstinApi);
taxRoutes.post("/calculate", calculateTaxPreview);

// GST Compliance & Returns
taxRoutes.get("/gst/gstr1", getGstr1);
taxRoutes.get("/gst/gstr3b", getGstr3b);
taxRoutes.get("/gst/purchases", getPurchaseBillsFor2B);
taxRoutes.post("/gst/export", exportGstReturn);
taxRoutes.post("/gst/settle", postGstSettlementJournal);

// Registers
taxRoutes.get("/registers/itc", getItcRegister);

// TDS & HSN Master
taxRoutes.get("/tds", getTdsSummary);
taxRoutes.get("/hsn", getHsnMaster);
taxRoutes.post("/hsn", createHsnMaster);
taxRoutes.put("/hsn/:id", updateHsnMaster);
