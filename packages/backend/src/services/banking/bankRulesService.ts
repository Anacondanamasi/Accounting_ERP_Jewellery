import { prisma } from "../../lib/prisma";
import { BankRulesEngine, type RuleConditionDef, type RuleSplitLineDef } from "./bankRulesEngine";
import { INDIAN_BANK_STARTER_RULES } from "./bankStarterRules";
import { BankFeedPostingService } from "./bankFeedPostingService";
import { AuditService } from "../audit/auditService";

export interface CreateRuleInput {
  name: string;
  groupId?: number | null;
  applyToDirection: "MONEY_IN" | "MONEY_OUT" | "BOTH";
  matchMode?: "ALL" | "ANY";
  scopeAccountType?: "ALL" | "SPECIFIC";
  bankAccountId?: number | null;
  bankAccountIds?: number[];
  autoAdd?: boolean;
  maxAutoAmount?: number | null;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  conditions: RuleConditionDef[];
  actionType: "CATEGORIZE" | "TRANSFER" | "EXCLUDE";
  transactionType?: string;
  payeeExtractMode?: "NONE" | "FIXED" | "EXTRACT_FROM_TEXT";
  targetPayeeId?: number | null;
  targetPayeeName?: string | null;
  targetAccountId?: number | null;
  targetTaxRate?: number | null;
  itcEligibility?: "ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5" | null;
  isRcm?: boolean;
  tdsSection?: string | null;
  targetMemoTemplate?: string | null;
  targetTags?: string[];
  excludeReason?: string | null;
  transferAccountId?: number | null;
  hasSplits?: boolean;
  splitMode?: "PERCENTAGE" | "FIXED_AMOUNT" | null;
  splits?: RuleSplitLineDef[];
}

export class BankRulesService {
  /**
   * List all bank rules for a company with metrics
   */
  public static async listRules(
    companyId: number,
    filters: {
      bankAccountId?: number;
      direction?: string;
      status?: string;
      search?: string;
    } = {}
  ) {
    const where: any = { companyId };

    if (filters.direction && filters.direction !== "ALL") {
      where.applyToDirection = filters.direction;
    }
    if (filters.status === "ACTIVE") {
      where.isEnabled = true;
    } else if (filters.status === "DISABLED") {
      where.isEnabled = false;
    }

    if (filters.bankAccountId) {
      where.OR = [
        { bankAccountId: null, scopeAccountType: "ALL" },
        { bankAccountId: Number(filters.bankAccountId) },
        { bankAccountIdsJson: { contains: String(filters.bankAccountId) } },
      ];
    }

    if (filters.search && filters.search.trim()) {
      where.name = { contains: filters.search.trim(), mode: "insensitive" };
    }

    const rules = await prisma.bankRule.findMany({
      where,
      orderBy: { priority: "asc" },
      include: {
        _count: {
          select: { applications: true, versions: true },
        },
      },
    });

    return rules;
  }

  /**
   * Get single rule by ID
   */
  public static async getRuleById(companyId: number, ruleId: number) {
    const rule = await prisma.bankRule.findFirst({
      where: { id: ruleId, companyId },
      include: {
        versions: { orderBy: { version: "desc" }, take: 10 },
        applications: {
          orderBy: { appliedAt: "desc" },
          take: 20,
          include: {
            feedLine: {
              select: { txnDate: true, descriptionRaw: true, amount: true, status: true },
            },
          },
        },
      },
    });

    if (!rule) throw new Error(`Bank rule #${ruleId} not found`);
    return rule;
  }

  /**
   * Create a new rule
   */
  public static async createRule(companyId: number, input: CreateRuleInput, actor = "system") {
    if (!input.name || !input.name.trim()) throw new Error("Rule name is required");
    if (!input.conditions || input.conditions.length === 0) {
      throw new Error("At least one condition is required");
    }

    // Determine next priority (end of list)
    const maxPriorityRule = await prisma.bankRule.findFirst({
      where: { companyId },
      orderBy: { priority: "desc" },
      select: { priority: true },
    });
    const priority = (maxPriorityRule?.priority ?? -1) + 1;

    const bankAccountIdsJson = JSON.stringify(input.bankAccountIds || []);
    const conditionsJson = JSON.stringify(input.conditions);
    const splitsJson = input.splits ? JSON.stringify(input.splits) : null;
    const targetTagsJson = JSON.stringify(input.targetTags || []);

    const createdRule = await prisma.$transaction(async (tx) => {
      const rule = await tx.bankRule.create({
        data: {
          companyId,
          name: input.name.trim(),
          groupId: input.groupId,
          priority,
          applyToDirection: input.applyToDirection || "MONEY_OUT",
          matchMode: input.matchMode || "ALL",
          scopeAccountType: input.scopeAccountType || "ALL",
          bankAccountId: input.bankAccountId,
          bankAccountIdsJson,
          autoAdd: !!input.autoAdd,
          maxAutoAmount: input.maxAutoAmount ? Number(input.maxAutoAmount) : null,
          effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
          effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
          isEnabled: true,
          status: "ACTIVE",
          version: 1,
          conditionsJson,
          actionType: input.actionType || "CATEGORIZE",
          transactionType: input.transactionType,
          payeeExtractMode: input.payeeExtractMode || "NONE",
          targetPayeeId: input.targetPayeeId,
          targetPayeeName: input.targetPayeeName,
          targetAccountId: input.targetAccountId,
          targetTaxRate: input.targetTaxRate !== undefined ? Number(input.targetTaxRate) : null,
          itcEligibility: input.itcEligibility,
          isRcm: !!input.isRcm,
          tdsSection: input.tdsSection,
          targetMemoTemplate: input.targetMemoTemplate,
          targetTagsJson,
          excludeReason: input.excludeReason,
          transferAccountId: input.transferAccountId,
          hasSplits: !!input.hasSplits,
          splitMode: input.splitMode,
          splitsJson,
          createdBy: actor,
        },
      });

      // Version snapshot
      await tx.bankRuleVersion.create({
        data: {
          ruleId: rule.id,
          version: 1,
          ruleJson: JSON.stringify(rule),
          createdBy: actor,
        },
      });

      // Tamper-evident Audit log
      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "BANK_RULE_CREATE",
        entityType: "BankRule",
        entityId: rule.id,
        entityNumber: rule.name,
        summary: `Created bank rule '${rule.name}' (Priority ${rule.priority}, Auto-Add: ${rule.autoAdd})`,
        after: {
          name: rule.name,
          priority: rule.priority,
          autoAdd: rule.autoAdd,
          conditions: input.conditions,
        },
      });

      return rule;
    });

    BankRulesEngine.invalidateCache(companyId);
    return createdRule;
  }

  /**
   * Update an existing rule
   */
  public static async updateRule(
    companyId: number,
    ruleId: number,
    input: Partial<CreateRuleInput> & { isEnabled?: boolean },
    actor = "system"
  ) {
    const existing = await this.getRuleById(companyId, ruleId);

    const newVersion = existing.version + 1;
    const data: any = {
      version: newVersion,
      updatedAt: new Date(),
    };

    if (input.name !== undefined) data.name = input.name.trim();
    if (input.applyToDirection !== undefined) data.applyToDirection = input.applyToDirection;
    if (input.matchMode !== undefined) data.matchMode = input.matchMode;
    if (input.scopeAccountType !== undefined) data.scopeAccountType = input.scopeAccountType;
    if (input.bankAccountId !== undefined) data.bankAccountId = input.bankAccountId;
    if (input.bankAccountIds !== undefined) data.bankAccountIdsJson = JSON.stringify(input.bankAccountIds);
    if (input.autoAdd !== undefined) data.autoAdd = !!input.autoAdd;
    if (input.maxAutoAmount !== undefined) data.maxAutoAmount = input.maxAutoAmount ? Number(input.maxAutoAmount) : null;
    if (input.effectiveFrom !== undefined) data.effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : null;
    if (input.effectiveTo !== undefined) data.effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;
    if (input.isEnabled !== undefined) data.isEnabled = !!input.isEnabled;
    if (input.conditions !== undefined) data.conditionsJson = JSON.stringify(input.conditions);
    if (input.actionType !== undefined) data.actionType = input.actionType;
    if (input.transactionType !== undefined) data.transactionType = input.transactionType;
    if (input.payeeExtractMode !== undefined) data.payeeExtractMode = input.payeeExtractMode;
    if (input.targetPayeeId !== undefined) data.targetPayeeId = input.targetPayeeId;
    if (input.targetPayeeName !== undefined) data.targetPayeeName = input.targetPayeeName;
    if (input.targetAccountId !== undefined) data.targetAccountId = input.targetAccountId;
    if (input.targetTaxRate !== undefined) data.targetTaxRate = input.targetTaxRate !== null ? Number(input.targetTaxRate) : null;
    if (input.itcEligibility !== undefined) data.itcEligibility = input.itcEligibility;
    if (input.isRcm !== undefined) data.isRcm = !!input.isRcm;
    if (input.tdsSection !== undefined) data.tdsSection = input.tdsSection;
    if (input.targetMemoTemplate !== undefined) data.targetMemoTemplate = input.targetMemoTemplate;
    if (input.targetTags !== undefined) data.targetTagsJson = JSON.stringify(input.targetTags);
    if (input.excludeReason !== undefined) data.excludeReason = input.excludeReason;
    if (input.transferAccountId !== undefined) data.transferAccountId = input.transferAccountId;
    if (input.hasSplits !== undefined) data.hasSplits = !!input.hasSplits;
    if (input.splitMode !== undefined) data.splitMode = input.splitMode;
    if (input.splits !== undefined) data.splitsJson = JSON.stringify(input.splits);

    const updatedRule = await prisma.$transaction(async (tx) => {
      const rule = await tx.bankRule.update({
        where: { id: ruleId },
        data,
      });

      // Save version snapshot
      await tx.bankRuleVersion.create({
        data: {
          ruleId: rule.id,
          version: newVersion,
          ruleJson: JSON.stringify(rule),
          createdBy: actor,
        },
      });

      // Tamper-evident Audit log
      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "BANK_RULE_UPDATE",
        entityType: "BankRule",
        entityId: rule.id,
        entityNumber: rule.name,
        summary: `Updated bank rule '${rule.name}' to version ${newVersion}`,
        before: {
          name: existing.name,
          autoAdd: existing.autoAdd,
          isEnabled: existing.isEnabled,
        },
        after: {
          name: rule.name,
          autoAdd: rule.autoAdd,
          isEnabled: rule.isEnabled,
        },
      });

      return rule;
    });

    BankRulesEngine.invalidateCache(companyId);
    return updatedRule;
  }

  /**
   * Delete a rule
   */
  public static async deleteRule(companyId: number, ruleId: number, actor = "system") {
    const existing = await this.getRuleById(companyId, ruleId);

    await prisma.$transaction(async (tx) => {
      await tx.bankRule.delete({ where: { id: ruleId } });

      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "BANK_RULE_DELETE",
        entityType: "BankRule",
        entityId: existing.id,
        entityNumber: existing.name,
        summary: `Deleted bank rule '${existing.name}'`,
      });
    });

    BankRulesEngine.invalidateCache(companyId);
    return { success: true, message: `Rule '${existing.name}' deleted` };
  }

  /**
   * Reorder priorities of rules
   */
  public static async reorderRules(companyId: number, orderedIds: number[], actor = "system") {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.bankRule.update({
          where: { id: orderedIds[i] },
          data: { priority: i },
        });
      }

      await AuditService.recordEvent(tx, {
        companyId,
        actor: { name: actor, type: "USER" },
        source: "UI",
        eventType: "BANK_RULE_REORDER",
        entityType: "BankRule",
        entityId: 0,
        summary: `Reordered ${orderedIds.length} bank rules`,
      });
    });

    BankRulesEngine.invalidateCache(companyId);
    return { success: true };
  }

  /**
   * Dry Run / Preview a rule against existing FOR_REVIEW bank lines
   */
  public static async previewRule(companyId: number, input: CreateRuleInput) {
    const lines = await prisma.bankFeedLine.findMany({
      where: {
        companyId,
        status: "FOR_REVIEW",
      },
      take: 200,
      orderBy: { txnDate: "desc" },
    });

    const activeRules = await BankRulesEngine.getCompanyRules(companyId);

    // Mock ephemeral rule for testing
    const mockRule = {
      ...input,
      id: 999999,
      priority: -1, // simulate highest priority
      conditionsJson: JSON.stringify(input.conditions),
      splitsJson: input.splits ? JSON.stringify(input.splits) : null,
      bankAccountIdsJson: JSON.stringify(input.bankAccountIds || []),
    };

    let matchedCount = 0;
    const sampleMatches: any[] = [];
    const conflictRulesMap = new Map<number, { ruleName: string; priority: number; count: number }>();

    for (const l of lines) {
      const ctx = {
        bankAccountId: l.bankAccountId,
        txnDate: l.txnDate,
        descriptionRaw: l.descriptionRaw,
        descriptionNormalized: l.descriptionNormalized,
        amount: l.amount,
        reference: l.reference || undefined,
        payeeHint: l.payeeHint || undefined,
      };

      const evalResult = await BankRulesEngine.evaluateLine(companyId, ctx, [mockRule, ...activeRules]);

      if (evalResult.winningRule?.id === mockRule.id) {
        matchedCount++;
        if (sampleMatches.length < 5) {
          sampleMatches.push({
            id: l.id,
            date: l.txnDate,
            description: l.descriptionRaw,
            amount: l.amount,
            suggestedAction: evalResult.transactionType,
            payee: evalResult.targetPayeeName,
            splits: evalResult.splits,
          });
        }
        for (const other of evalResult.otherMatches) {
          const c = conflictRulesMap.get(other.ruleId) || { ruleName: other.ruleName, priority: other.priority, count: 0 };
          c.count++;
          conflictRulesMap.set(other.ruleId, c);
        }
      }
    }

    const conflicts = Array.from(conflictRulesMap.values());

    return {
      totalForReviewScanned: lines.length,
      matchedCount,
      sampleMatches,
      conflicts,
      wouldAutoAddCount: input.autoAdd ? matchedCount : 0,
    };
  }

  /**
   * Apply rules now on all FOR_REVIEW lines with optional auto-add confirmation
   */
  public static async applyRulesNow(
    companyId: number,
    bankAccountId?: number,
    confirmAutoAdd = false,
    actor = "system"
  ) {
    const where: any = { companyId, status: "FOR_REVIEW" };
    if (bankAccountId) where.bankAccountId = Number(bankAccountId);

    const lines = await prisma.bankFeedLine.findMany({
      where,
      orderBy: { txnDate: "asc" },
      include: { bankAccount: true },
    });

    const rules = await BankRulesEngine.getCompanyRules(companyId);

    let recognizedCount = 0;
    let autoAddedCount = 0;
    const autoAddFailures: string[] = [];

    for (const l of lines) {
      const ctx = {
        id: l.id,
        bankAccountId: l.bankAccountId,
        txnDate: l.txnDate,
        descriptionRaw: l.descriptionRaw,
        descriptionNormalized: l.descriptionNormalized,
        amount: l.amount,
        reference: l.reference || undefined,
        payeeHint: l.payeeHint || undefined,
      };

      const res = await BankRulesEngine.evaluateLine(companyId, ctx, rules);

      if (res.winningRule) {
        recognizedCount++;

        // Increment rule usage count
        await prisma.bankRule.update({
          where: { id: res.winningRule.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });

        // Check if Auto-Add is eligible and confirmed
        if (res.canAutoAdd && confirmAutoAdd) {
          try {
            const added = await BankFeedPostingService.categorizeAndAdd(
              companyId,
              l.id,
              {
                type: res.transactionType as any,
                payee: res.targetPayeeName,
                payeeId: res.targetPayeeId,
                accountId: res.targetAccountId || (res.splits[0]?.accountId ?? l.bankAccount.accountId ?? 0),
                taxRate: res.targetTaxRate,
                isRcm: res.isRcm,
                itcEligibility: res.itcEligibility,
                tdsSection: res.tdsSection,
                targetBankAccountId: res.transferAccountId,
                memo: res.targetMemo,
                splits: res.splits.map((s) => ({
                  accountId: s.accountId,
                  amount: s.amount,
                  taxRate: s.taxRate,
                  memo: s.memo,
                })),
              },
              actor
            );

            // Record application
            await prisma.bankRuleApplication.create({
              data: {
                companyId,
                ruleId: res.winningRule.id,
                ruleVersion: res.winningRule.version,
                feedLineId: l.id,
                mode: "AUTO_ADDED",
                resultTransactionId: added.transactionId,
                resultTransactionType: added.transactionType,
              },
            });

            // Mark line with rule metadata
            await prisma.bankFeedLine.update({
              where: { id: l.id },
              data: {
                ruleId: res.winningRule.id,
                ruleVersion: res.winningRule.version,
                ruleMode: "AUTO_ADDED",
              },
            });

            autoAddedCount++;
          } catch (err: any) {
            autoAddFailures.push(`Line #${l.id}: ${err.message}`);
            // Fallback to SUGGESTED mode
            await prisma.bankFeedLine.update({
              where: { id: l.id },
              data: {
                ruleId: res.winningRule.id,
                ruleVersion: res.winningRule.version,
                ruleMode: "SUGGESTED",
                suggestedType: res.transactionType,
                suggestedAccountId: res.targetAccountId || res.splits[0]?.accountId,
                suggestedTaxRate: res.targetTaxRate,
                notes: `Auto-add skipped: ${err.message}`,
              },
            });
          }
        } else {
          // Suggest-only mode
          await prisma.bankFeedLine.update({
            where: { id: l.id },
            data: {
              ruleId: res.winningRule.id,
              ruleVersion: res.winningRule.version,
              ruleMode: "SUGGESTED",
              suggestedType: res.transactionType,
              suggestedAccountId: res.targetAccountId || res.splits[0]?.accountId,
              suggestedTaxRate: res.targetTaxRate,
              notes: res.autoAddBlockReason ? `Rule match (${res.autoAddBlockReason})` : undefined,
            },
          });

          await prisma.bankRuleApplication.create({
            data: {
              companyId,
              ruleId: res.winningRule.id,
              ruleVersion: res.winningRule.version,
              feedLineId: l.id,
              mode: "SUGGESTED",
            },
          });
        }
      }
    }

    return {
      totalScanned: lines.length,
      recognizedCount,
      autoAddedCount,
      failures: autoAddFailures,
    };
  }

  /**
   * Undo all transactions auto-added by a specific rule
   */
  public static async undoAllByRule(companyId: number, ruleId: number, actor = "system") {
    const rule = await this.getRuleById(companyId, ruleId);

    const activeApps = await prisma.bankRuleApplication.findMany({
      where: {
        companyId,
        ruleId,
        mode: "AUTO_ADDED",
        isUndone: false,
      },
    });

    let undoneCount = 0;
    for (const app of activeApps) {
      try {
        await BankFeedPostingService.undoFeedLine(companyId, app.feedLineId, actor);
        await prisma.bankRuleApplication.update({
          where: { id: app.id },
          data: {
            isUndone: true,
            undoneAt: new Date(),
            undoneBy: actor,
          },
        });
        undoneCount++;
      } catch (err) {
        console.error(`Failed to undo line #${app.feedLineId}`, err);
      }
    }

    // Increment override count
    await prisma.bankRule.update({
      where: { id: ruleId },
      data: {
        overrideCount: { increment: undoneCount },
      },
    });

    await AuditService.recordEvent(prisma, {
      companyId,
      actor: { name: actor, type: "USER" },
      source: "UI",
      eventType: "BANK_RULE_UNDO_ALL",
      entityType: "BankRule",
      entityId: rule.id,
      entityNumber: rule.name,
      summary: `Undid ${undoneCount} auto-added transactions for rule '${rule.name}'`,
    });

    return { undoneCount, totalFound: activeApps.length };
  }

  /**
   * Seed opt-in starter rules for Indian banking
   */
  public static async seedStarterRules(companyId: number, actor = "system") {
    const existingRules = await prisma.bankRule.findMany({
      where: { companyId },
      select: { name: true },
    });
    const existingNames = new Set(existingRules.map((r) => r.name.toLowerCase()));

    const created: any[] = [];
    for (const def of INDIAN_BANK_STARTER_RULES) {
      if (!existingNames.has(def.name.toLowerCase())) {
        const rule = await this.createRule(
          companyId,
          {
            name: def.name,
            applyToDirection: def.applyToDirection,
            matchMode: def.matchMode,
            conditions: def.conditions as any,
            actionType: def.actionType,
            transactionType: def.transactionType,
            payeeExtractMode: def.payeeExtractMode,
            targetPayeeName: def.targetPayeeName,
            targetTaxRate: def.targetTaxRate,
            itcEligibility: def.itcEligibility,
            autoAdd: false, // strictly suggest-only by default
            targetMemoTemplate: def.memoTemplate,
          },
          actor
        );
        created.push(rule);
      }
    }

    return created;
  }

  /**
   * Export rules in JSON format
   */
  public static async exportRules(companyId: number) {
    const rules = await prisma.bankRule.findMany({
      where: { companyId },
      orderBy: { priority: "asc" },
    });

    return {
      exportedAt: new Date(),
      version: "1.0",
      companyId,
      rules: rules.map((r) => ({
        name: r.name,
        applyToDirection: r.applyToDirection,
        matchMode: r.matchMode,
        scopeAccountType: r.scopeAccountType,
        autoAdd: r.autoAdd,
        maxAutoAmount: r.maxAutoAmount,
        actionType: r.actionType,
        transactionType: r.transactionType,
        payeeExtractMode: r.payeeExtractMode,
        targetPayeeName: r.targetPayeeName,
        targetTaxRate: r.targetTaxRate,
        itcEligibility: r.itcEligibility,
        isRcm: r.isRcm,
        targetMemoTemplate: r.targetMemoTemplate,
        conditions: JSON.parse(r.conditionsJson || "[]"),
        hasSplits: r.hasSplits,
        splitMode: r.splitMode,
        splits: r.splitsJson ? JSON.parse(r.splitsJson) : [],
      })),
    };
  }

  /**
   * Import rules with optional account ID mapping
   */
  public static async importRules(companyId: number, rulesList: any[], actor = "system") {
    const imported: any[] = [];
    for (const r of rulesList) {
      const created = await this.createRule(
        companyId,
        {
          name: r.name,
          applyToDirection: r.applyToDirection || "MONEY_OUT",
          matchMode: r.matchMode || "ALL",
          conditions: r.conditions || [],
          actionType: r.actionType || "CATEGORIZE",
          transactionType: r.transactionType,
          payeeExtractMode: r.payeeExtractMode || "NONE",
          targetPayeeName: r.targetPayeeName,
          targetTaxRate: r.targetTaxRate,
          itcEligibility: r.itcEligibility,
          isRcm: r.isRcm,
          targetMemoTemplate: r.targetMemoTemplate,
          autoAdd: false, // safety: imported rules default to non-auto-add
          hasSplits: r.hasSplits,
          splitMode: r.splitMode,
          splits: r.splits,
        },
        actor
      );
      imported.push(created);
    }
    return imported;
  }
}
