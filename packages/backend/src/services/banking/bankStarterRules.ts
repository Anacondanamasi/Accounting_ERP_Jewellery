export interface StarterRuleDef {
  name: string;
  applyToDirection: "MONEY_IN" | "MONEY_OUT" | "BOTH";
  matchMode: "ALL" | "ANY";
  conditions: Array<{
    field: string;
    operator: string;
    value: string | number;
  }>;
  actionType: "CATEGORIZE" | "TRANSFER" | "EXCLUDE";
  transactionType: string;
  payeeExtractMode: "NONE" | "FIXED" | "EXTRACT_FROM_TEXT";
  targetPayeeName?: string;
  targetAccountCode?: string; // Account code to resolve dynamically (e.g. 5000, 5200, 1001, etc.)
  targetTaxRate?: number;
  itcEligibility?: "ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5";
  autoAdd: boolean;
  memoTemplate?: string;
}

export const INDIAN_BANK_STARTER_RULES: StarterRuleDef[] = [
  {
    name: "Bank Charges (with 18% GST & ITC)",
    applyToDirection: "MONEY_OUT",
    matchMode: "ANY",
    conditions: [
      { field: "channel", operator: "CONTAINS", value: "CHARGES" },
      { field: "description", operator: "CONTAINS", value: "CHG" },
      { field: "description", operator: "CONTAINS", value: "FOLIO" },
      { field: "description", operator: "CONTAINS", value: "SMS CHG" },
      { field: "description", operator: "CONTAINS", value: "ANNUAL FEE" },
    ],
    actionType: "CATEGORIZE",
    transactionType: "EXPENSE",
    payeeExtractMode: "FIXED",
    targetPayeeName: "Bank",
    targetTaxRate: 18,
    itcEligibility: "ELIGIBLE",
    autoAdd: false, // Suggest-only by default for safety
    memoTemplate: "Bank service & processing charges",
  },
  {
    name: "Bank Interest Credited (Exempt from GST)",
    applyToDirection: "MONEY_IN",
    matchMode: "ANY",
    conditions: [
      { field: "channel", operator: "CONTAINS", value: "INTEREST" },
      { field: "description", operator: "CONTAINS", value: "INT.PD" },
      { field: "description", operator: "CONTAINS", value: "INTEREST CR" },
      { field: "description", operator: "CONTAINS", value: "INT CR" },
    ],
    actionType: "CATEGORIZE",
    transactionType: "DEPOSIT",
    payeeExtractMode: "FIXED",
    targetPayeeName: "Bank",
    targetTaxRate: 0,
    autoAdd: false,
    memoTemplate: "Savings / deposit interest credited",
  },
  {
    name: "ATM Cash Withdrawal (Cash in Hand / Drawings)",
    applyToDirection: "MONEY_OUT",
    matchMode: "ALL",
    conditions: [
      { field: "channel", operator: "CONTAINS", value: "ATM" },
    ],
    actionType: "CATEGORIZE",
    transactionType: "EXPENSE",
    payeeExtractMode: "FIXED",
    targetPayeeName: "Self / Cash",
    targetTaxRate: 0,
    autoAdd: false,
    memoTemplate: "Cash withdrawal from ATM",
  },
  {
    name: "GST Government Challan Payment (CPIN)",
    applyToDirection: "MONEY_OUT",
    matchMode: "ANY",
    conditions: [
      { field: "description", operator: "CONTAINS", value: "CPIN" },
      { field: "description", operator: "CONTAINS", value: "CBIC" },
      { field: "description", operator: "CONTAINS", value: "GST PMT" },
    ],
    actionType: "CATEGORIZE",
    transactionType: "EXPENSE",
    payeeExtractMode: "FIXED",
    targetPayeeName: "GST Department",
    targetTaxRate: 0,
    autoAdd: false,
    memoTemplate: "GST tax liability payment to government",
  },
  {
    name: "TDS Tax Challan 281 Remittance",
    applyToDirection: "MONEY_OUT",
    matchMode: "ANY",
    conditions: [
      { field: "description", operator: "CONTAINS", value: "CHALLAN 281" },
      { field: "description", operator: "CONTAINS", value: "ITNS 281" },
      { field: "description", operator: "CONTAINS", value: "TDS PMT" },
    ],
    actionType: "CATEGORIZE",
    transactionType: "EXPENSE",
    payeeExtractMode: "FIXED",
    targetPayeeName: "Income Tax Department",
    targetTaxRate: 0,
    autoAdd: false,
    memoTemplate: "TDS quarterly / monthly remittance",
  },
  {
    name: "UPI Outward Payment (Auto-Extract Payee)",
    applyToDirection: "MONEY_OUT",
    matchMode: "ALL",
    conditions: [
      { field: "channel", operator: "CONTAINS", value: "UPI" },
    ],
    actionType: "CATEGORIZE",
    transactionType: "EXPENSE",
    payeeExtractMode: "EXTRACT_FROM_TEXT",
    autoAdd: false,
    memoTemplate: "UPI payment to vendor/counterparty",
  },
  {
    name: "NEFT Outward Transfer (Auto-Extract Payee)",
    applyToDirection: "MONEY_OUT",
    matchMode: "ALL",
    conditions: [
      { field: "channel", operator: "CONTAINS", value: "NEFT" },
    ],
    actionType: "CATEGORIZE",
    transactionType: "EXPENSE",
    payeeExtractMode: "EXTRACT_FROM_TEXT",
    autoAdd: false,
    memoTemplate: "NEFT payment to counterparty",
  },
  {
    name: "Telecom & Internet Bill (18% GST with ITC)",
    applyToDirection: "MONEY_OUT",
    matchMode: "ANY",
    conditions: [
      { field: "description", operator: "CONTAINS", value: "AIRTEL" },
      { field: "description", operator: "CONTAINS", value: "JIO" },
      { field: "description", operator: "CONTAINS", value: "VODAFONE" },
      { field: "description", operator: "CONTAINS", value: "ACT FIBERNET" },
    ],
    actionType: "CATEGORIZE",
    transactionType: "EXPENSE",
    payeeExtractMode: "EXTRACT_FROM_TEXT",
    targetTaxRate: 18,
    itcEligibility: "ELIGIBLE",
    autoAdd: false,
    memoTemplate: "Broadband and telephone service",
  },
];
