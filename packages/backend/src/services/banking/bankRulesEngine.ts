import { prisma } from "../../lib/prisma";
import {
  BankNarrationNormalizer,
  type ParsedNarrationDetails,
  type IndianBankChannel,
} from "./bankNarrationNormalizer";

export type ConditionField =
  | "description"
  | "bankText"
  | "amount"
  | "reference"
  | "channel"
  | "payeeHint"
  | "dayOfMonth"
  | "bankAccount";

export type ConditionOperator =
  | "CONTAINS"
  | "DOES_NOT_CONTAIN"
  | "IS_EXACTLY"
  | "STARTS_WITH"
  | "ENDS_WITH"
  | "MATCHES_REGEX"
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "BETWEEN";

export interface RuleConditionDef {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number;
  value2?: number; // For BETWEEN
  caseSensitive?: boolean;
}

export interface RuleSplitLineDef {
  position: number;
  mode: "PERCENTAGE" | "FIXED_AMOUNT" | "REMAINDER";
  value: number;
  accountId: number;
  taxRate?: number;
  memo?: string;
}

export interface BankFeedLineContext {
  id?: number;
  bankAccountId: number;
  txnDate: Date | string;
  descriptionRaw: string;
  descriptionNormalized?: string;
  amount: number; // Signed: positive = Credit / In, negative = Debit / Out
  debit?: number;
  credit?: number;
  reference?: string;
  payeeHint?: string;
}

export interface EvaluatedSplitResult {
  accountId: number;
  amount: number;
  taxRate: number;
  memo?: string;
}

export interface RuleMatchEvaluation {
  winningRule: any | null;
  ruleId?: number;
  ruleName?: string;
  ruleVersion?: number;
  priority?: number;
  actionType: "CATEGORIZE" | "TRANSFER" | "EXCLUDE";
  transactionType: string;
  targetPayeeId?: number;
  targetPayeeName?: string;
  targetAccountId?: number;
  targetTaxRate?: number;
  itcEligibility?: "ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5";
  isRcm: boolean;
  tdsSection?: string;
  targetMemo?: string;
  transferAccountId?: number;
  splits: EvaluatedSplitResult[];
  exclude: boolean;
  excludeReason?: string;
  autoAdd: boolean;
  canAutoAdd: boolean;
  autoAddBlockReason?: string;
  otherMatches: Array<{ ruleId: number; ruleName: string; priority: number }>;
}

/**
 * Cache storage for per-company compiled rules
 */
interface CacheEntry {
  epoch: number;
  timestamp: number;
  rules: any[];
}
const rulesCache = new Map<number, CacheEntry>();
const companyEpochs = new Map<number, number>();

export class BankRulesEngine {
  /**
   * Built-in intelligence for Indian banking narrations (GST, charges, interest)
   */
  public static detectDefaultIndianPatterns(
    description: string,
    isMoneyIn: boolean
  ): { targetType: string; targetPayee: string; targetTaxRate: number; targetMemo: string; autoAdd: boolean } | null {
    const parsed = BankNarrationNormalizer.parse(description);

    if (!isMoneyIn && parsed.isBankCharge) {
      return {
        targetType: "EXPENSE",
        targetPayee: "Bank",
        targetTaxRate: 18,
        targetMemo: "Bank processing / ledger charges",
        autoAdd: false,
      };
    }

    if (isMoneyIn && parsed.isInterestCredit) {
      return {
        targetType: "DEPOSIT",
        targetPayee: "Bank",
        targetTaxRate: 0,
        targetMemo: "Savings / deposit interest credited",
        autoAdd: false,
      };
    }

    if (!isMoneyIn && parsed.isTaxPayment) {
      return {
        targetType: "EXPENSE",
        targetPayee: parsed.counterpartyName || "Government",
        targetTaxRate: 0,
        targetMemo: "Tax Challan payment",
        autoAdd: false,
      };
    }

    return null;
  }

  /**
   * Invalidate company's in-memory rules cache
   */
  public static invalidateCache(companyId: number) {
    const current = companyEpochs.get(companyId) || 0;
    companyEpochs.set(companyId, current + 1);
    rulesCache.delete(companyId);
  }

  /**
   * Load active rules sorted by priority (cached)
   */
  public static async getCompanyRules(companyId: number): Promise<any[]> {
    const currentEpoch = companyEpochs.get(companyId) || 0;
    const cached = rulesCache.get(companyId);

    if (cached && cached.epoch === currentEpoch && Date.now() - cached.timestamp < 60000) {
      return cached.rules;
    }

    const rules = await prisma.bankRule.findMany({
      where: {
        companyId,
        isEnabled: true,
      },
      orderBy: { priority: "asc" },
    });

    rulesCache.set(companyId, {
      epoch: currentEpoch,
      timestamp: Date.now(),
      rules,
    });

    return rules;
  }

  /**
   * Safely test a regular expression with length & timeout bounds to prevent ReDoS
   */
  public static safeRegexMatch(pattern: string, text: string, caseSensitive = false): boolean {
    if (!pattern || pattern.length > 200 || text.length > 2000) {
      return false;
    }
    try {
      const flags = caseSensitive ? "" : "i";
      const regex = new RegExp(pattern, flags);
      const start = Date.now();
      const matched = regex.test(text);
      if (Date.now() - start > 50) {
        // Slow regex detected
        return false;
      }
      return matched;
    } catch {
      return false;
    }
  }

  /**
   * Evaluate a single condition against the context line
   */
  public static evaluateCondition(
    cond: RuleConditionDef,
    line: BankFeedLineContext,
    parsed: ParsedNarrationDetails
  ): boolean {
    const absAmount = Math.abs(line.amount);
    const txnDate = new Date(line.txnDate);
    const dayOfMonth = txnDate.getDate();

    // 1. Text Fields
    if (
      cond.field === "description" ||
      cond.field === "bankText" ||
      cond.field === "reference" ||
      cond.field === "payeeHint" ||
      cond.field === "channel"
    ) {
      let subject = "";
      if (cond.field === "description") {
        subject = parsed.cleanedDescription || line.descriptionNormalized || line.descriptionRaw;
      } else if (cond.field === "bankText") {
        subject = line.descriptionRaw;
      } else if (cond.field === "reference") {
        subject = line.reference || parsed.referenceOrUtr || "";
      } else if (cond.field === "payeeHint") {
        subject = line.payeeHint || parsed.counterpartyName || "";
      } else if (cond.field === "channel") {
        subject = parsed.channel;
      }

      const caseSensitive = !!cond.caseSensitive;
      const targetStr = String(cond.value ?? "");
      const s = caseSensitive ? subject : subject.toLowerCase();
      const t = caseSensitive ? targetStr : targetStr.toLowerCase();

      switch (cond.operator) {
        case "CONTAINS":
          return s.includes(t);
        case "DOES_NOT_CONTAIN":
          return !s.includes(t);
        case "IS_EXACTLY":
          return s === t;
        case "STARTS_WITH":
          return s.startsWith(t);
        case "ENDS_WITH":
          return s.endsWith(t);
        case "MATCHES_REGEX":
          return this.safeRegexMatch(targetStr, subject, caseSensitive);
        default:
          return false;
      }
    }

    // 2. Amount Field
    if (cond.field === "amount") {
      const val1 = Number(cond.value);
      if (isNaN(val1)) return false;

      switch (cond.operator) {
        case "EQUALS":
          return Math.abs(absAmount - val1) < 0.01;
        case "NOT_EQUALS":
          return Math.abs(absAmount - val1) >= 0.01;
        case "GREATER_THAN":
          return absAmount > val1;
        case "LESS_THAN":
          return absAmount < val1;
        case "BETWEEN": {
          const val2 = Number(cond.value2);
          if (isNaN(val2)) return false;
          const min = Math.min(val1, val2);
          const max = Math.max(val1, val2);
          return absAmount >= min && absAmount <= max;
        }
        default:
          return false;
      }
    }

    // 3. Day of Month Field
    if (cond.field === "dayOfMonth") {
      const dayVal = Number(cond.value);
      if (isNaN(dayVal)) return false;

      switch (cond.operator) {
        case "EQUALS":
          return dayOfMonth === dayVal;
        case "GREATER_THAN":
          return dayOfMonth > dayVal;
        case "LESS_THAN":
          return dayOfMonth < dayVal;
        case "BETWEEN": {
          const dayVal2 = Number(cond.value2);
          if (isNaN(dayVal2)) return false;
          return dayOfMonth >= Math.min(dayVal, dayVal2) && dayOfMonth <= Math.max(dayVal, dayVal2);
        }
        default:
          return false;
      }
    }

    // 4. Bank Account Field
    if (cond.field === "bankAccount") {
      const targetAccId = Number(cond.value);
      return line.bankAccountId === targetAccId;
    }

    return false;
  }

  /**
   * Determine whether a rule matches a bank line
   */
  public static matchesRule(
    rule: any,
    line: BankFeedLineContext,
    parsed: ParsedNarrationDetails
  ): boolean {
    const isMoneyIn = line.amount > 0;
    const isMoneyOut = line.amount < 0;

    // 1. Direction Filter
    if (rule.applyToDirection === "MONEY_IN" && !isMoneyIn) return false;
    if (rule.applyToDirection === "MONEY_OUT" && !isMoneyOut) return false;

    // 2. Bank Account Scope Filter
    if (rule.scopeAccountType === "SPECIFIC") {
      let allowedAccountIds: number[] = [];
      try {
        allowedAccountIds = JSON.parse(rule.bankAccountIdsJson || "[]");
      } catch {
        allowedAccountIds = [];
      }
      if (rule.bankAccountId) allowedAccountIds.push(rule.bankAccountId);
      if (allowedAccountIds.length > 0 && !allowedAccountIds.includes(line.bankAccountId)) {
        return false;
      }
    } else if (rule.bankAccountId && rule.bankAccountId !== line.bankAccountId) {
      return false;
    }

    // 3. Effective Dates Filter
    const txnDate = new Date(line.txnDate);
    if (rule.effectiveFrom && txnDate < new Date(rule.effectiveFrom)) return false;
    if (rule.effectiveTo && txnDate > new Date(rule.effectiveTo)) return false;

    // 4. Conditions Evaluation
    let conditions: RuleConditionDef[] = [];
    try {
      conditions = JSON.parse(rule.conditionsJson || "[]");
    } catch {
      return false;
    }

    if (!conditions.length) return false;

    if (rule.matchMode === "ANY") {
      return conditions.some((cond) => this.evaluateCondition(cond, line, parsed));
    } else {
      // Default: ALL
      return conditions.every((cond) => this.evaluateCondition(cond, line, parsed));
    }
  }

  /**
   * Resolves splits into concrete rupee amounts
   */
  public static resolveSplits(
    rule: any,
    totalAmount: number,
    defaultMemo?: string
  ): EvaluatedSplitResult[] {
    if (!rule.hasSplits || !rule.splitsJson) {
      if (rule.targetAccountId) {
        return [
          {
            accountId: rule.targetAccountId,
            amount: totalAmount,
            taxRate: rule.targetTaxRate || 0,
            memo: rule.targetMemoTemplate || defaultMemo,
          },
        ];
      }
      return [];
    }

    let rawSplits: RuleSplitLineDef[] = [];
    try {
      rawSplits = JSON.parse(rule.splitsJson);
    } catch {
      return [];
    }

    if (!rawSplits.length) return [];

    const results: EvaluatedSplitResult[] = [];
    let allocatedSoFar = 0;
    let remainderLine: RuleSplitLineDef | null = null;

    for (const sp of rawSplits) {
      if (sp.mode === "REMAINDER") {
        remainderLine = sp;
        continue;
      }

      let lineAmt = 0;
      if (sp.mode === "PERCENTAGE") {
        lineAmt = Math.round(((totalAmount * sp.value) / 100) * 100) / 100;
      } else {
        // FIXED_AMOUNT
        lineAmt = Math.min(totalAmount - allocatedSoFar, sp.value);
      }

      lineAmt = Math.round(lineAmt * 100) / 100;
      allocatedSoFar += lineAmt;
      results.push({
        accountId: sp.accountId,
        amount: lineAmt,
        taxRate: sp.taxRate || 0,
        memo: sp.memo || defaultMemo,
      });
    }

    if (remainderLine) {
      const rem = Math.max(0, Math.round((totalAmount - allocatedSoFar) * 100) / 100);
      results.push({
        accountId: remainderLine.accountId,
        amount: rem,
        taxRate: remainderLine.taxRate || 0,
        memo: remainderLine.memo || defaultMemo,
      });
    }

    return results;
  }

  /**
   * Full Rule Evaluation against a line
   */
  public static async evaluateLine(
    companyId: number,
    line: BankFeedLineContext,
    rules?: any[]
  ): Promise<RuleMatchEvaluation> {
    const allRules = rules || (await this.getCompanyRules(companyId));
    const parsed = BankNarrationNormalizer.parse(line.descriptionRaw);

    const isMoneyIn = line.amount > 0;
    const totalAmount = Math.abs(line.amount);

    let winningRule: any | null = null;
    const otherMatches: Array<{ ruleId: number; ruleName: string; priority: number }> = [];

    for (const rule of allRules) {
      if (this.matchesRule(rule, line, parsed)) {
        if (!winningRule) {
          winningRule = rule;
        } else {
          otherMatches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            priority: rule.priority,
          });
        }
      }
    }

    // Default Fallback if no rule matched
    if (!winningRule) {
      // Check built-in Indian patterns for sensible suggestions
      const defaultType = isMoneyIn ? "DEPOSIT" : "EXPENSE";
      let payeeName = parsed.counterpartyName;
      let taxRate: number | undefined;
      let memo = parsed.cleanedDescription;

      if (parsed.isBankCharge) {
        taxRate = 18;
        payeeName = "Bank";
      } else if (parsed.isInterestCredit) {
        taxRate = 0;
        payeeName = "Bank";
      } else if (parsed.isTaxPayment) {
        taxRate = 0;
      }

      return {
        winningRule: null,
        actionType: "CATEGORIZE",
        transactionType: defaultType,
        targetPayeeName: payeeName,
        targetTaxRate: taxRate,
        targetMemo: memo,
        itcEligibility: parsed.isBankCharge ? "ELIGIBLE" : undefined,
        isRcm: false,
        splits: [],
        exclude: false,
        autoAdd: false,
        canAutoAdd: false,
        otherMatches: [],
      };
    }

    // Payee Resolution
    let resolvedPayeeName = winningRule.targetPayeeName || undefined;
    if (winningRule.payeeExtractMode === "EXTRACT_FROM_TEXT") {
      resolvedPayeeName = parsed.counterpartyName || resolvedPayeeName;
    }

    // Transaction Type
    const defaultTxnType = isMoneyIn ? "DEPOSIT" : "EXPENSE";
    const txnType = winningRule.transactionType || defaultTxnType;

    // Splits
    const splits = this.resolveSplits(winningRule, totalAmount, parsed.cleanedDescription);

    // Auto-Add Safety Ceilings
    let canAutoAdd = !!winningRule.autoAdd;
    let autoAddBlockReason: string | undefined;

    if (canAutoAdd) {
      // Safety 1: Max auto amount ceiling
      if (winningRule.maxAutoAmount && totalAmount > winningRule.maxAutoAmount) {
        canAutoAdd = false;
        autoAddBlockReason = `Amount ₹${totalAmount.toLocaleString("en-IN")} exceeds rule ceiling of ₹${winningRule.maxAutoAmount.toLocaleString("en-IN")}`;
      }

      // Safety 2: Required Accounts Check
      if (winningRule.actionType === "CATEGORIZE") {
        if (!splits.length && !winningRule.targetAccountId) {
          canAutoAdd = false;
          autoAddBlockReason = "No target category or split accounts configured";
        }
      } else if (winningRule.actionType === "TRANSFER") {
        if (!winningRule.transferAccountId) {
          canAutoAdd = false;
          autoAddBlockReason = "No destination transfer account configured";
        }
      }

      // Safety 3: Rule marked NEEDS_ATTENTION
      if (winningRule.status === "NEEDS_ATTENTION") {
        canAutoAdd = false;
        autoAddBlockReason = winningRule.attentionReason || "Rule needs attention";
      }
    }

    return {
      winningRule,
      ruleId: winningRule.id,
      ruleName: winningRule.name,
      ruleVersion: winningRule.version,
      priority: winningRule.priority,
      actionType: winningRule.actionType as any,
      transactionType: txnType,
      targetPayeeId: winningRule.targetPayeeId || undefined,
      targetPayeeName: resolvedPayeeName,
      targetAccountId: winningRule.targetAccountId || undefined,
      targetTaxRate: winningRule.targetTaxRate !== null ? Number(winningRule.targetTaxRate) : undefined,
      itcEligibility: winningRule.itcEligibility as any,
      isRcm: !!winningRule.isRcm,
      tdsSection: winningRule.tdsSection || undefined,
      targetMemo: winningRule.targetMemoTemplate || parsed.cleanedDescription,
      transferAccountId: winningRule.transferAccountId || undefined,
      splits,
      exclude: winningRule.actionType === "EXCLUDE",
      excludeReason: winningRule.excludeReason || undefined,
      autoAdd: winningRule.autoAdd,
      canAutoAdd,
      autoAddBlockReason,
      otherMatches,
    };
  }
}
