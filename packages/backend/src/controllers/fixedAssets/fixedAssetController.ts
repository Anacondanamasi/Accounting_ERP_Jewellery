import type { Request, Response } from "express";
import { ok, fail } from "../../lib/apiResponse";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { FixedAssetService } from "../../services/fixedAssets/fixedAssetService";
import { DepreciationRunService } from "../../services/fixedAssets/depreciationRunService";
import { AssetDisposalService } from "../../services/fixedAssets/assetDisposalService";
import { FixedAssetReportService } from "../../services/fixedAssets/fixedAssetReportService";
import { FixedAssetRegisterService } from "../../services/fixedAssets/fixedAssetRegisterService";
import { seedSampleJewelleryAssets } from "../../services/fixedAssets/fixedAssetSeedService";
import { prisma } from "../../lib/prisma";

export const listAssets = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { status, categoryId, taxBlockId, search, page, limit } = req.query;

  try {
    const result = await FixedAssetService.listAssets(companyId, {
      status: status ? String(status) : undefined,
      assetCategoryId: categoryId ? Number(categoryId) : undefined,
      taxBlockId: taxBlockId ? Number(taxBlockId) : undefined,
      search: search ? String(search) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return ok(res, result);
  } catch (err: any) {
    return fail(res, 500, "LIST_ASSETS_FAILED", err.message);
  }
};

export const getAssetById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const id = Number(req.params.id);
  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid asset ID");

  try {
    const asset = await FixedAssetService.getAssetById(companyId, id);
    return ok(res, asset);
  } catch (err: any) {
    return fail(res, 404, "ASSET_NOT_FOUND", err.message);
  }
};

export const createAsset = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  try {
    const asset = await FixedAssetService.createAsset(companyId, req.body, actor);
    return ok(res, asset, "Asset registered successfully");
  } catch (err: any) {
    return fail(res, 400, "CREATE_ASSET_FAILED", err.message);
  }
};

export const updateAsset = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);
  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid asset ID");

  try {
    const updated = await FixedAssetService.updateAsset(companyId, id, req.body, actor);
    return ok(res, updated, "Asset updated successfully");
  } catch (err: any) {
    return fail(res, 400, "UPDATE_ASSET_FAILED", err.message);
  }
};

export const bulkCreateAssets = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  try {
    const items = req.body.items || req.body;
    const results = await FixedAssetService.bulkCreateAssets(companyId, items, actor);
    return ok(res, results, `Successfully imported ${results.length} assets`);
  } catch (err: any) {
    return fail(res, 400, "BULK_IMPORT_FAILED", err.message);
  }
};

export const getSummaryKpis = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const kpis = await FixedAssetService.getSummaryKpis(companyId);
    return ok(res, kpis);
  } catch (err: any) {
    return fail(res, 500, "KPIS_FAILED", err.message);
  }
};

export const capitalizeCwip = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);

  try {
    const { capitalizedDate } = req.body;
    const result = await FixedAssetService.capitalizeCwip(
      companyId,
      id,
      capitalizedDate || new Date(),
      actor
    );
    return ok(res, result, "CWIP asset capitalized successfully");
  } catch (err: any) {
    return fail(res, 400, "CAPITALIZE_CWIP_FAILED", err.message);
  }
};

export const recordPhysicalVerification = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const id = Number(req.params.id);

  try {
    const verification = await FixedAssetService.recordPhysicalVerification(companyId, id, req.body);
    return ok(res, verification, "Physical verification recorded");
  } catch (err: any) {
    return fail(res, 400, "VERIFICATION_FAILED", err.message);
  }
};

export const previewDepreciationRun = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const preview = await DepreciationRunService.previewDepreciationRun(companyId, req.body);
    return ok(res, preview);
  } catch (err: any) {
    return fail(res, 400, "PREVIEW_FAILED", err.message);
  }
};

export const postDepreciationRun = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  try {
    const run = await DepreciationRunService.postDepreciationRun(companyId, req.body, actor);
    return ok(res, run, `Depreciation run ${run.runNumber} posted successfully`);
  } catch (err: any) {
    return fail(res, 400, "POST_DEPRECIATION_FAILED", err.message);
  }
};

export const reverseDepreciationRun = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const runId = Number(req.params.runId);

  try {
    const reason = req.body.reason || "Reversal requested by user";
    const reversed = await DepreciationRunService.reverseDepreciationRun(
      companyId,
      runId,
      reason,
      actor
    );
    return ok(res, reversed, `Depreciation run ${reversed.runNumber} reversed successfully`);
  } catch (err: any) {
    return fail(res, 400, "REVERSE_FAILED", err.message);
  }
};

export const listDepreciationRuns = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const runs = await DepreciationRunService.listRuns(companyId);
    return ok(res, runs);
  } catch (err: any) {
    return fail(res, 500, "LIST_RUNS_FAILED", err.message);
  }
};

export const getDepreciationRunById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const runId = Number(req.params.runId);

  try {
    const run = await DepreciationRunService.getRunById(companyId, runId);
    if (!run) return fail(res, 404, "RUN_NOT_FOUND", "Depreciation run not found");
    return ok(res, run);
  } catch (err: any) {
    return fail(res, 500, "GET_RUN_FAILED", err.message);
  }
};

export const previewDisposal = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const id = Number(req.params.id);

  try {
    const preview = await AssetDisposalService.previewDisposal(companyId, id, req.body);
    return ok(res, preview);
  } catch (err: any) {
    return fail(res, 400, "PREVIEW_DISPOSAL_FAILED", err.message);
  }
};

export const disposeAsset = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);

  try {
    const asset = await AssetDisposalService.disposeAsset(companyId, id, req.body, actor);
    return ok(res, asset, `Asset ${asset.assetCode} disposed successfully`);
  } catch (err: any) {
    return fail(res, 400, "DISPOSE_ASSET_FAILED", err.message);
  }
};

export const undoDisposal = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);

  try {
    const restored = await AssetDisposalService.undoDisposal(companyId, id, actor);
    return ok(res, restored, `Asset ${restored.assetCode} restored to Active status`);
  } catch (err: any) {
    return fail(res, 400, "UNDO_DISPOSAL_FAILED", err.message);
  }
};

export const listCategories = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const categories = await prisma.assetCategory.findMany({
      where: { companyId, isActive: true },
      include: {
        _count: { select: { assets: true } },
      },
      orderBy: { name: "asc" },
    });
    return ok(res, categories);
  } catch (err: any) {
    return fail(res, 500, "LIST_CATEGORIES_FAILED", err.message);
  }
};

export const listTaxBlocks = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const blocks = await prisma.taxBlock.findMany({
      where: { companyId },
      include: {
        _count: { select: { assets: true } },
      },
      orderBy: { name: "asc" },
    });
    return ok(res, blocks);
  } catch (err: any) {
    return fail(res, 500, "LIST_TAX_BLOCKS_FAILED", err.message);
  }
};

export const getPpeScheduleReport = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { financialYear } = req.query;

  try {
    const report = await FixedAssetReportService.getScheduleIIPpeReport(
      companyId,
      financialYear ? String(financialYear) : undefined
    );
    return ok(res, report);
  } catch (err: any) {
    return fail(res, 500, "PPE_REPORT_FAILED", err.message);
  }
};

export const getTaxBlockReport = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { year } = req.query;

  try {
    const report = await FixedAssetReportService.getTaxBlockReport(
      companyId,
      year ? Number(year) : undefined
    );
    return ok(res, report);
  } catch (err: any) {
    return fail(res, 500, "TAX_REPORT_FAILED", err.message);
  }
};

export const getBooksVsTaxComparison = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const report = await FixedAssetReportService.getBooksVsTaxComparison(companyId);
    return ok(res, report);
  } catch (err: any) {
    return fail(res, 500, "BOOKS_VS_TAX_REPORT_FAILED", err.message);
  }
};

export const getDynamicRegister = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const report = await FixedAssetRegisterService.generateRegister(companyId, {
      financialYear: req.query.financialYear ? String(req.query.financialYear) : undefined,
      periodType: req.query.periodType ? (String(req.query.periodType) as any) : undefined,
      month: req.query.month ? Number(req.query.month) : undefined,
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      taxBlockId: req.query.taxBlockId ? Number(req.query.taxBlockId) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      depreciationMethod: req.query.depreciationMethod ? String(req.query.depreciationMethod) : undefined,
      location: req.query.location ? String(req.query.location) : undefined,
      department: req.query.department ? String(req.query.department) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    return ok(res, report);
  } catch (err: any) {
    return fail(res, 500, "DYNAMIC_REGISTER_FAILED", err.message);
  }
};

export const seedSampleAssets = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  try {
    const count = await seedSampleJewelleryAssets(companyId, actor);
    return ok(res, { seededCount: count }, `Successfully seeded ${count} sample fixed assets`);
  } catch (err: any) {
    return fail(res, 500, "SEED_SAMPLE_ASSETS_FAILED", err.message);
  }
};

