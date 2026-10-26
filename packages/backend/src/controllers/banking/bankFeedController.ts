import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { BankTemplateService } from "../../services/banking/bankTemplateService";
import { BankImportService } from "../../services/banking/bankImportService";
import { BankMatchingEngine } from "../../services/banking/bankMatchingEngine";
import { BankFeedPostingService } from "../../services/banking/bankFeedPostingService";
import { ReconciliationService } from "../../services/banking/reconciliationService";

export const downloadImportTemplate = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const bankAccountId = req.params.id ? Number(req.params.id) : undefined;
  const format = String(req.query.format || "xlsx").toLowerCase();

  if (format === "csv") {
    const csv = BankTemplateService.generateCsvTemplate();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="bank_import_template_v1.csv"');
    return res.status(200).send(csv);
  }

  const buffer = await BankTemplateService.generateExcelTemplate(companyId, bankAccountId);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="bank_import_template_v1.xlsx"');
  return res.status(200).send(buffer);
};

export const uploadStatement = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const bankAccountId = Number(req.params.id);
  const actor = getActor(req);

  const file = (req as any).file;
  if (!file) return fail(res, 400, "NO_FILE", "Please select a bank statement file (.xlsx or .csv) to upload.");

  try {
    const service = new BankImportService();
    const result = await service.fetchOrImport(
      companyId,
      bankAccountId,
      {
        buffer: file.buffer,
        fileName: file.originalname || "statement.xlsx",
        forceImportDuplicates: req.body?.forceImportDuplicates === "true",
      },
      actor
    );

    return ok(res, result, `Statement processed: ${result.importedRows} lines imported, ${result.duplicateRows} duplicates skipped.`);
  } catch (err: any) {
    return fail(res, 400, "IMPORT_ERROR", err.message || "Failed to process bank statement import");
  }
};

export const listFeedLines = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const bankAccountId = Number(req.params.id);

  const status = String(req.query.status || "FOR_REVIEW").toUpperCase();
  const search = req.query.search ? String(req.query.search).trim() : undefined;
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const txnType = req.query.txnType ? String(req.query.txnType) : undefined;
  const ruleFilter = req.query.ruleFilter ? String(req.query.ruleFilter) : undefined;

  const where: any = {
    companyId,
    bankAccountId,
    status,
    ...(from || to ? { txnDate: { gte: from, lte: to } } : {}),
  };

  if (search) {
    where.OR = [
      { descriptionRaw: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
      { payeeHint: { contains: search, mode: "insensitive" } },
    ];
  }

  if (txnType === "MONEY_IN") where.credit = { gt: 0 };
  if (txnType === "MONEY_OUT") where.debit = { gt: 0 };

  if (ruleFilter === "WITH_RULE") {
    where.ruleId = { not: null };
  } else if (ruleFilter === "AUTO_ADDED") {
    where.ruleMode = "AUTO_ADDED";
  } else if (ruleFilter === "SUGGESTED") {
    where.ruleMode = "SUGGESTED";
  } else if (ruleFilter && !isNaN(Number(ruleFilter))) {
    where.ruleId = Number(ruleFilter);
  }

  const [lines, totalCount, forReviewCount, categorizedCount, excludedCount, bankAcc] = await Promise.all([
    prisma.bankFeedLine.findMany({
      where,
      orderBy: { txnDate: "desc" },
      take: 100,
      include: {
        matches: true,
        ruleApplications: {
          include: {
            rule: {
              select: { id: true, name: true, autoAdd: true },
            },
          },
          orderBy: { appliedAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.bankFeedLine.count({ where }),
    prisma.bankFeedLine.count({ where: { companyId, bankAccountId, status: "FOR_REVIEW" } }),
    prisma.bankFeedLine.count({ where: { companyId, bankAccountId, status: "CATEGORIZED" } }),
    prisma.bankFeedLine.count({ where: { companyId, bankAccountId, status: "EXCLUDED" } }),
    prisma.bankAccount.findFirst({ where: { id: bankAccountId, companyId } }),
  ]);

  return ok(res, {
    lines,
    counts: {
      forReview: forReviewCount,
      categorized: categorizedCount,
      excluded: excludedCount,
      total: totalCount,
    },
    bankAccount: bankAcc,
  });
};

export const getFeedLineMatches = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const lineId = Number(req.params.lineId);

  const line = await prisma.bankFeedLine.findFirst({
    where: { id: lineId, companyId },
  });
  if (!line) return fail(res, 404, "LINE_NOT_FOUND", "Bank feed line not found");

  const candidates = await BankMatchingEngine.findMatches(
    companyId,
    line.bankAccountId,
    line.txnDate,
    line.amount,
    line.descriptionRaw,
    line.reference || undefined
  );

  return ok(res, candidates);
};

export const categorizeFeedLine = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const lineId = Number(req.params.lineId);
  const actor = getActor(req);

  try {
    const result = await BankFeedPostingService.categorizeAndAdd(companyId, lineId, req.body, actor);
    return ok(res, result, "Bank transaction posted to ledger successfully");
  } catch (err: any) {
    return fail(res, 400, "CATEGORIZE_ERROR", err.message || "Failed to categorize transaction");
  }
};

export const matchFeedLine = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const lineId = Number(req.params.lineId);
  const actor = getActor(req);

  try {
    const result = await BankFeedPostingService.matchFeedLine(companyId, lineId, req.body.matches, actor);
    return ok(res, result, "Bank line matched successfully");
  } catch (err: any) {
    return fail(res, 400, "MATCH_ERROR", err.message || "Failed to match transaction");
  }
};

export const excludeFeedLine = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const lineId = Number(req.params.lineId);
  const actor = getActor(req);

  try {
    await BankFeedPostingService.excludeFeedLine(companyId, lineId, req.body.reason || "Excluded by user", actor);
    return ok(res, { excluded: true }, "Bank line excluded");
  } catch (err: any) {
    return fail(res, 400, "EXCLUDE_ERROR", err.message || "Failed to exclude transaction");
  }
};

export const undoFeedLine = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const lineId = Number(req.params.lineId);
  const actor = getActor(req);

  try {
    await BankFeedPostingService.undoFeedLine(companyId, lineId, actor);
    return ok(res, { undone: true }, "Bank line restored to For Review");
  } catch (err: any) {
    return fail(res, 400, "UNDO_ERROR", err.message || "Failed to undo transaction");
  }
};

export const undoBatch = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const batchId = Number(req.params.batchId);
  const actor = getActor(req);

  try {
    const result = await BankImportService.undoImportBatch(companyId, batchId, actor);
    return ok(res, result, "Import batch undone successfully");
  } catch (err: any) {
    return fail(res, 400, "UNDO_BATCH_ERROR", err.message || "Failed to undo import batch");
  }
};

export const getReconciliationHistory = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const bankAccountId = Number(req.params.id);

  const history = await ReconciliationService.getHistory(companyId, bankAccountId);
  return ok(res, history);
};

export const startReconciliation = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const bankAccountId = Number(req.params.id);
  const actor = getActor(req);

  const { statementDate, endingBalance } = req.body;
  if (!statementDate || endingBalance === undefined) {
    return fail(res, 400, "MISSING_FIELDS", "Statement date and ending balance are required");
  }

  try {
    const session = await ReconciliationService.startOrResume(
      companyId,
      bankAccountId,
      statementDate,
      Number(endingBalance),
      actor
    );
    return ok(res, session);
  } catch (err: any) {
    return fail(res, 400, "RECON_ERROR", err.message || "Failed to start reconciliation session");
  }
};

export const updateReconciliationItems = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const reconId = Number(req.params.reconId);

  try {
    const result = await ReconciliationService.updateClearedItems(companyId, reconId, req.body.clearedItems || []);
    return ok(res, result);
  } catch (err: any) {
    return fail(res, 400, "UPDATE_ERROR", err.message || "Failed to update cleared items");
  }
};

export const finishReconciliation = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const reconId = Number(req.params.reconId);
  const actor = getActor(req);

  try {
    const result = await ReconciliationService.finish(companyId, reconId, Boolean(req.body.autoAdjust), actor);
    return ok(res, result, "Reconciliation finalized successfully!");
  } catch (err: any) {
    return fail(res, 400, "FINISH_ERROR", err.message || "Failed to finish reconciliation");
  }
};

export const undoReconciliation = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const reconId = Number(req.params.reconId);
  const actor = getActor(req);

  try {
    const result = await ReconciliationService.undo(companyId, reconId, actor);
    return ok(res, result, "Reconciliation undone successfully");
  } catch (err: any) {
    return fail(res, 400, "UNDO_ERROR", err.message || "Failed to undo reconciliation");
  }
};

export const listBankRules = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const rules = await prisma.bankRule.findMany({
    where: { companyId },
    orderBy: { priority: "asc" },
  });
  return ok(res, rules);
};

export const createBankRule = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const rule = await prisma.bankRule.create({
    data: {
      companyId,
      name: req.body.name,
      priority: Number(req.body.priority || 0),
      applyToDirection: req.body.applyToDirection || "BOTH",
      bankAccountId: req.body.bankAccountId ? Number(req.body.bankAccountId) : null,
      actionType: req.body.actionType || "CATEGORIZE",
      transactionType: req.body.transactionType || req.body.targetType,
      targetPayeeName: req.body.targetPayeeName || req.body.targetPayee,
      targetAccountId: req.body.targetAccountId ? Number(req.body.targetAccountId) : null,
      targetTaxRate: req.body.targetTaxRate !== undefined ? Number(req.body.targetTaxRate) : null,
      targetMemoTemplate: req.body.targetMemoTemplate || req.body.targetMemo,
      autoAdd: Boolean(req.body.autoAdd),
      isEnabled: req.body.isEnabled !== false,
      conditionsJson: JSON.stringify(req.body.conditions || []),
      createdBy: actor,
    },
  });
  return created(res, rule, "Bank rule created");
};
