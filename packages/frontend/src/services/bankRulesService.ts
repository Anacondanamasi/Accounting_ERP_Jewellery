import { api } from "@/lib/axios";

export interface RuleConditionDef {
  field: "description" | "bankText" | "amount" | "reference" | "channel" | "payeeHint" | "dayOfMonth" | "bankAccount";
  operator: "CONTAINS" | "DOES_NOT_CONTAIN" | "IS_EXACTLY" | "STARTS_WITH" | "ENDS_WITH" | "MATCHES_REGEX" | "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "BETWEEN";
  value: string | number;
  value2?: number;
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

export interface BankRuleItem {
  id: number;
  companyId: number;
  name: string;
  groupId?: number | null;
  priority: number;
  applyToDirection: "MONEY_IN" | "MONEY_OUT" | "BOTH";
  matchMode: "ALL" | "ANY";
  scopeAccountType: "ALL" | "SPECIFIC";
  bankAccountId?: number | null;
  bankAccountIdsJson?: string;
  autoAdd: boolean;
  maxAutoAmount?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isEnabled: boolean;
  status: "ACTIVE" | "DISABLED" | "NEEDS_ATTENTION";
  attentionReason?: string | null;
  version: number;
  usageCount: number;
  lastUsedAt?: string | null;
  overrideCount: number;
  conditionsJson: string;
  actionType: "CATEGORIZE" | "TRANSFER" | "EXCLUDE";
  transactionType?: string;
  payeeExtractMode: "NONE" | "FIXED" | "EXTRACT_FROM_TEXT";
  targetPayeeId?: number | null;
  targetPayeeName?: string | null;
  targetAccountId?: number | null;
  targetTaxRate?: number | null;
  itcEligibility?: "ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5" | null;
  isRcm?: boolean;
  tdsSection?: string | null;
  targetMemoTemplate?: string | null;
  targetTagsJson?: string;
  excludeReason?: string | null;
  transferAccountId?: number | null;
  hasSplits: boolean;
  splitMode?: "PERCENTAGE" | "FIXED_AMOUNT" | null;
  splitsJson?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { applications: number; versions: number };
}

export interface RulePreviewResult {
  totalForReviewScanned: number;
  matchedCount: number;
  sampleMatches: Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    suggestedAction: string;
    payee?: string;
    splits: any[];
  }>;
  conflicts: Array<{ ruleName: string; priority: number; count: number }>;
  wouldAutoAddCount: number;
}

export const bankRulesService = {
  async listRules(params: {
    bankAccountId?: number;
    direction?: string;
    status?: string;
    search?: string;
  } = {}) {
    const res = await api.get("/bank-accounts/rules", { params });
    return res.data.data as BankRuleItem[];
  },

  async getRuleById(id: number | string) {
    const res = await api.get(`/bank-accounts/rules/${id}`);
    return res.data.data;
  },

  async createRule(payload: Record<string, any>) {
    const res = await api.post("/bank-accounts/rules", payload);
    return res.data.data as BankRuleItem;
  },

  async updateRule(id: number | string, payload: Record<string, any>) {
    const res = await api.put(`/bank-accounts/rules/${id}`, payload);
    return res.data.data as BankRuleItem;
  },

  async deleteRule(id: number | string) {
    const res = await api.delete(`/bank-accounts/rules/${id}`);
    return res.data.data;
  },

  async reorderRules(orderedIds: number[]) {
    const res = await api.post("/bank-accounts/rules/reorder", { orderedIds });
    return res.data.data;
  },

  async previewRule(payload: Record<string, any>) {
    const res = await api.post("/bank-accounts/rules/preview", payload);
    return res.data.data as RulePreviewResult;
  },

  async applyRulesNow(payload: { bankAccountId?: number; confirmAutoAdd?: boolean } = {}) {
    const res = await api.post("/bank-accounts/rules/apply-now", payload);
    return res.data.data;
  },

  async seedStarterRules() {
    const res = await api.post("/bank-accounts/rules/starter-library");
    return res.data.data;
  },

  async exportRules() {
    const res = await api.get("/bank-accounts/rules/export");
    return res.data.data;
  },

  async importRules(rules: any[]) {
    const res = await api.post("/bank-accounts/rules/import", { rules });
    return res.data.data;
  },

  async undoAllByRule(id: number | string) {
    const res = await api.post(`/bank-accounts/rules/${id}/undo-all`);
    return res.data.data;
  },
};
