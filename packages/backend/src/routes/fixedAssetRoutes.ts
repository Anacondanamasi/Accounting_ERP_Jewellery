import { Router } from "express";
import {
  listAssets,
  getAssetById,
  createAsset,
  updateAsset,
  bulkCreateAssets,
  getSummaryKpis,
  capitalizeCwip,
  recordPhysicalVerification,
  previewDepreciationRun,
  postDepreciationRun,
  reverseDepreciationRun,
  listDepreciationRuns,
  getDepreciationRunById,
  previewDisposal,
  disposeAsset,
  undoDisposal,
  listCategories,
  listTaxBlocks,
  getPpeScheduleReport,
  getTaxBlockReport,
  getBooksVsTaxComparison,
  getDynamicRegister,
  seedSampleAssets,
} from "../controllers/fixedAssets/fixedAssetController";

const router = Router();

// Sample Data Seeding
router.post("/seed-samples", seedSampleAssets);

// Dynamic Auto-Generated Fixed Asset Register
router.get("/register", getDynamicRegister);

// Summary & KPI
router.get("/summary/kpis", getSummaryKpis);

// Asset Register CRUD
router.get("/", listAssets);
router.post("/", createAsset);
router.post("/bulk", bulkCreateAssets);
router.get("/:id", getAssetById);
router.put("/:id", updateAsset);

// CWIP & Verification
router.post("/:id/capitalize", capitalizeCwip);
router.post("/:id/verify", recordPhysicalVerification);

// Depreciation Runs
router.post("/depreciation/preview", previewDepreciationRun);
router.post("/depreciation/post", postDepreciationRun);
router.post("/depreciation/reverse/:runId", reverseDepreciationRun);
router.get("/depreciation/runs", listDepreciationRuns);
router.get("/depreciation/runs/:runId", getDepreciationRunById);

// Disposal
router.post("/:id/disposal/preview", previewDisposal);
router.post("/:id/disposal/post", disposeAsset);
router.post("/:id/disposal/undo", undoDisposal);

// Master Data
router.get("/masters/categories", listCategories);
router.get("/masters/tax-blocks", listTaxBlocks);

// Statutory Reports
router.get("/reports/ppe-schedule", getPpeScheduleReport);
router.get("/reports/tax-blocks", getTaxBlockReport);
router.get("/reports/books-vs-tax", getBooksVsTaxComparison);

export default router;
