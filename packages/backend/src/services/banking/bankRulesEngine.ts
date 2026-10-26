import { prisma } from "../../lib/prisma";

export interface RuleCondition {
  field: "description" | "amount" | "reference";
  operator: "CONTAINS" | "STARTS_WITH" | "EQUALS" | "GREATER_THAN" | "LESS_THAN";
  value: string | number;
}

export interface RuleMatchResult {
  ruleId: number;
  ruleName: string;
  targetType: string;
  targetPayee?: string;
  targetAccountId?: number;
  targetTaxRate?: number;
  targetMemo?: string;
  autoAdd: boolean;
}

export class BankRulesEngine {
  /**
   * Evaluates all enabled bank rules in priority order against a bank line
   */
  static async evaluateRules(
    companyId: number,
    bankAccountId: number,
    description: string,
    amount: number, // Signed: positive = Money In, negative = Money Out
    reference?: string
  ): Promise<RuleMatchResult | null> {
    const rules = await prisma.bankRule.findMany({
      where: {
        companyId,
        isEnabled: true,
        OR: [{ bankAccountId: null }, { bankAccountId }],
      },
      orderBy: { priority: "asc" },
    });

    const isMoneyIn = amount > 0;
    const isMoneyOut = amount < 0;
    const absAmount = Math.abs(amount);

    for (const rule of rules) {
      // Check direction filter
      if (rule.applyToDirection === "MONEY_IN" && !isMoneyIn) continue;
      if (rule.applyToDirection === "MONEY_OUT" && !isMoneyOut) continue;

      let conditions: RuleCondition[] = [];
      try {
        conditions = JSON.parse(rule.conditionsJson);
      } catch {
        continue;
      }

      if (!conditions.length) continue;

      const allMatch = conditions.every((cond) => {
        if (cond.field === "description") {
          const text = (description || "").toLowerCase();
          const target = String(cond.value || "").toLowerCase();
          if (cond.operator === "CONTAINS") return text.includes(target);
          if (cond.operator === "STARTS_WITH") return text.startsWith(target);
          if (cond.operator === "EQUALS") return text === target;
        }

        if (cond.field === "reference") {
          const text = (reference || "").toLowerCase();
          const target = String(cond.value || "").toLowerCase();
          if (cond.operator === "CONTAINS") return text.includes(target);
          if (cond.operator === "STARTS_WITH") return text.startsWith(target);
          if (cond.operator === "EQUALS") return text === target;
        }

        if (cond.field === "amount") {
          const num = Number(cond.value);
          if (isNaN(num)) return false;
          if (cond.operator === "EQUALS") return Math.abs(absAmount - num) < 0.01;
          if (cond.operator === "GREATER_THAN") return absAmount > num;
          if (cond.operator === "LESS_THAN") return absAmount < num;
        }

        return false;
      });

      if (allMatch) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          targetType: rule.targetType || (isMoneyIn ? "DEPOSIT" : "EXPENSE"),
          targetPayee: rule.targetPayee || undefined,
          targetAccountId: rule.targetAccountId || undefined,
          targetTaxRate: rule.targetTaxRate !== null ? Number(rule.targetTaxRate) : undefined,
          targetMemo: rule.targetMemo || undefined,
          autoAdd: rule.autoAdd,
        };
      }
    }

    // Default smart pattern detection for Indian banking
    return this.detectDefaultIndianPatterns(description, isMoneyIn);
  }

  /**
   * Built-in intelligence for Indian banking narrations (GST, charges, interest)
   */
  static detectDefaultIndianPatterns(
    description: string,
    isMoneyIn: boolean
  ): RuleMatchResult | null {
    const text = description.toUpperCase();

    // 1. Bank charges: Folio, SMS alert, Consolidated charges, Annual debit card fee
    if (
      !isMoneyIn &&
      (text.includes("CHG") ||
        text.includes("CHARGE") ||
        text.includes("FOLIO") ||
        text.includes("ANNUAL FEE") ||
        text.includes("IMPS CHG") ||
        text.includes("NEFT CHG") ||
        text.includes("SMS CHG"))
    ) {
      return {
        ruleId: 0,
        ruleName: "System: Bank Charges with 18% GST",
        targetType: "EXPENSE",
        targetPayee: "Bank",
        targetTaxRate: 18,
        targetMemo: "Bank processing / ledger charges",
        autoAdd: false,
      };
    }

    // 2. Interest credited by bank: Exempt from GST
    if (isMoneyIn && (text.includes("INT.PD") || text.includes("INTEREST") || text.includes("INT CR"))) {
      return {
        ruleId: 0,
        ruleName: "System: Bank Interest Credit",
        targetType: "DEPOSIT",
        targetPayee: "Bank",
        targetTaxRate: 0,
        targetMemo: "Savings / deposit interest credited",
        autoAdd: false,
      };
    }

    // 3. GST Government Payment Challan: CPIN / CIN
    if (!isMoneyIn && (text.includes("GST") && (text.includes("CPIN") || text.includes("CHALLAN") || text.includes("CBIC")))) {
      return {
        ruleId: 0,
        ruleName: "System: GST Tax Payment",
        targetType: "EXPENSE",
        targetPayee: "GST Department",
        targetTaxRate: 0,
        targetMemo: "Goods and Services Tax Challan payment",
        autoAdd: false,
      };
    }

    // 4. TDS / Income Tax Challan 280 / 281
    if (!isMoneyIn && (text.includes("CHALLAN 281") || text.includes("TDS PMT") || text.includes("ITNS 281"))) {
      return {
        ruleId: 0,
        ruleName: "System: TDS Payment to Govt",
        targetType: "EXPENSE",
        targetPayee: "Income Tax Department",
        targetTaxRate: 0,
        targetMemo: "TDS Challan 281 tax remittance",
        autoAdd: false,
      };
    }

    return null;
  }
}
