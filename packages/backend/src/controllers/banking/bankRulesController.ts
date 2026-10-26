import type { Request, Response } from "express";
import { ok, fail } from "../../lib/apiResponse";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { BankRulesService } from "../../services/banking/bankRulesService";

export const listBankRules = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { bankAccountId, direction, status, search } = req.query;

  try {
    const rules = await BankRulesService.listRules(companyId, {
      bankAccountId: bankAccountId ? Number(bankAccountId) : undefined,
      direction: direction ? String(direction) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
    });
    return ok(res, rules);
  } catch (err: any) {
    return fail(res, 500, "LIST_RULES_FAILED", err.message);
  }
};

export const getBankRuleById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const id = Number(req.params.id);
  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid rule ID");

  try {
    const rule = await BankRulesService.getRuleById(companyId, id);
    return ok(res, rule);
  } catch (err: any) {
    return fail(res, 404, "RULE_NOT_FOUND", err.message);
  }
};

export const createBankRule = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  try {
    const rule = await BankRulesService.createRule(companyId, req.body, actor);
    return ok(res, rule, "Bank rule created successfully");
  } catch (err: any) {
    return fail(res, 400, "CREATE_RULE_FAILED", err.message);
  }
};

export const updateBankRule = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);
  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid rule ID");

  try {
    const updated = await BankRulesService.updateRule(companyId, id, req.body, actor);
    return ok(res, updated, "Bank rule updated successfully");
  } catch (err: any) {
    return fail(res, 400, "UPDATE_RULE_FAILED", err.message);
  }
};

export const deleteBankRule = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);
  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid rule ID");

  try {
    const result = await BankRulesService.deleteRule(companyId, id, actor);
    return ok(res, result);
  } catch (err: any) {
    return fail(res, 400, "DELETE_RULE_FAILED", err.message);
  }
};

export const reorderBankRules = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds)) {
    return fail(res, 400, "INVALID_PAYLOAD", "orderedIds array is required");
  }

  try {
    const result = await BankRulesService.reorderRules(companyId, orderedIds, actor);
    return ok(res, result, "Rules reordered successfully");
  } catch (err: any) {
    return fail(res, 400, "REORDER_FAILED", err.message);
  }
};

export const previewBankRule = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const preview = await BankRulesService.previewRule(companyId, req.body);
    return ok(res, preview);
  } catch (err: any) {
    return fail(res, 400, "PREVIEW_FAILED", err.message);
  }
};

export const applyRulesNow = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const { bankAccountId, confirmAutoAdd } = req.body;

  try {
    const result = await BankRulesService.applyRulesNow(
      companyId,
      bankAccountId ? Number(bankAccountId) : undefined,
      !!confirmAutoAdd,
      actor
    );
    return ok(res, result, `Rules processed: ${result.recognizedCount} recognized, ${result.autoAddedCount} auto-added`);
  } catch (err: any) {
    return fail(res, 400, "APPLY_RULES_FAILED", err.message);
  }
};

export const seedStarterRules = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  try {
    const rules = await BankRulesService.seedStarterRules(companyId, actor);
    return ok(res, rules, `Successfully seeded ${rules.length} Indian starter rules`);
  } catch (err: any) {
    return fail(res, 400, "SEED_FAILED", err.message);
  }
};

export const exportBankRules = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    const exported = await BankRulesService.exportRules(companyId);
    return ok(res, exported);
  } catch (err: any) {
    return fail(res, 500, "EXPORT_FAILED", err.message);
  }
};

export const importBankRules = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const { rules } = req.body;

  if (!Array.isArray(rules) || rules.length === 0) {
    return fail(res, 400, "INVALID_PAYLOAD", "rules array is required");
  }

  try {
    const imported = await BankRulesService.importRules(companyId, rules, actor);
    return ok(res, imported, `Successfully imported ${imported.length} rules`);
  } catch (err: any) {
    return fail(res, 400, "IMPORT_FAILED", err.message);
  }
};

export const undoAllByRule = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);
  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid rule ID");

  try {
    const result = await BankRulesService.undoAllByRule(companyId, id, actor);
    return ok(res, result, `Successfully undid ${result.undoneCount} auto-added transactions`);
  } catch (err: any) {
    return fail(res, 400, "UNDO_ALL_FAILED", err.message);
  }
};
