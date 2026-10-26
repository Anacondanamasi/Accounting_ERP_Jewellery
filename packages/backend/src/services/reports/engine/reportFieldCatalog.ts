export type FieldDataType = "string" | "number" | "currency" | "date" | "boolean" | "enum";

export type FieldCategory =
  | "identity"
  | "dates"
  | "account"
  | "party"
  | "amounts"
  | "dimensions"
  | "tax"
  | "audit";

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "is_true"
  | "is_false";

export interface FieldDefinition {
  id: string;
  label: string;
  category: FieldCategory;
  dataType: FieldDataType;
  defaultVisible: boolean;
  defaultWidth?: number;
  sortable: boolean;
  groupable: boolean;
  filterable: boolean;
  operators: FilterOperator[];
  enumOptions?: Array<{ label: string; value: string }>;
  description?: string;
}

export const JOURNAL_FIELD_CATALOG: Record<string, FieldDefinition> = {
  // 1. Identity & Document info
  date: {
    id: "date",
    label: "Date",
    category: "dates",
    dataType: "date",
    defaultVisible: true,
    defaultWidth: 110,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "between", "gt", "gte", "lt", "lte"],
    description: "Transaction document date",
  },
  postedAt: {
    id: "postedAt",
    label: "Posting Date",
    category: "dates",
    dataType: "date",
    defaultVisible: false,
    defaultWidth: 110,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "between", "gt", "gte", "lt", "lte", "is_null", "is_not_null"],
    description: "Actual ledger posting timestamp",
  },
  createdAt: {
    id: "createdAt",
    label: "Created Date/Time",
    category: "dates",
    dataType: "date",
    defaultVisible: false,
    defaultWidth: 150,
    sortable: true,
    groupable: false,
    filterable: true,
    operators: ["equals", "between", "gt", "gte", "lt", "lte"],
  },
  updatedAt: {
    id: "updatedAt",
    label: "Last Modified",
    category: "dates",
    dataType: "date",
    defaultVisible: false,
    defaultWidth: 150,
    sortable: true,
    groupable: false,
    filterable: true,
    operators: ["equals", "between", "gt", "gte", "lt", "lte"],
  },
  entryNo: {
    id: "entryNo",
    label: "Voucher / Entry No",
    category: "identity",
    dataType: "string",
    defaultVisible: true,
    defaultWidth: 130,
    sortable: true,
    groupable: false,
    filterable: true,
    operators: ["equals", "not_equals", "contains", "starts_with", "in"],
    description: "Voucher or journal reference number",
  },
  voucherType: {
    id: "voucherType",
    label: "Transaction Type",
    category: "identity",
    dataType: "enum",
    defaultVisible: true,
    defaultWidth: 130,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "not_equals", "in", "not_in"],
    enumOptions: [
      { label: "Sales Invoice", value: "INVOICE" },
      { label: "Purchase Bill", value: "BILL" },
      { label: "Payment / Receipt", value: "PAYMENT" },
      { label: "Expense", value: "EXPENSE" },
      { label: "Credit Note", value: "CREDIT_NOTE" },
      { label: "Debit Note", value: "DEBIT_NOTE" },
      { label: "Manual Journal", value: "JOURNAL" },
      { label: "Contra / Transfer", value: "CONTRA" },
      { label: "Fixed Asset Depreciation", value: "DEPRECIATION" },
      { label: "Asset Disposal", value: "DISPOSAL" },
    ],
  },
  status: {
    id: "status",
    label: "Status",
    category: "identity",
    dataType: "enum",
    defaultVisible: false,
    defaultWidth: 100,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "in", "not_in"],
    enumOptions: [
      { label: "Posted", value: "POSTED" },
      { label: "Voided", value: "VOIDED" },
      { label: "Reversed", value: "REVERSED" },
    ],
  },
  narration: {
    id: "narration",
    label: "Memo / Narration",
    category: "identity",
    dataType: "string",
    defaultVisible: true,
    defaultWidth: 220,
    sortable: true,
    groupable: false,
    filterable: true,
    operators: ["contains", "not_contains", "equals", "starts_with"],
  },

  // 2. Account Dimensions
  accountCode: {
    id: "accountCode",
    label: "Account Code",
    category: "account",
    dataType: "string",
    defaultVisible: true,
    defaultWidth: 100,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "starts_with", "in"],
  },
  accountName: {
    id: "accountName",
    label: "Account Name",
    category: "account",
    dataType: "string",
    defaultVisible: true,
    defaultWidth: 200,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "contains", "in"],
  },
  accountType: {
    id: "accountType",
    label: "Account Type",
    category: "account",
    dataType: "string",
    defaultVisible: false,
    defaultWidth: 130,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "in", "not_in"],
  },
  accountGroup: {
    id: "accountGroup",
    label: "Account Group",
    category: "account",
    dataType: "string",
    defaultVisible: false,
    defaultWidth: 150,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "in"],
  },
  isControlAccount: {
    id: "isControlAccount",
    label: "Control Account",
    category: "account",
    dataType: "boolean",
    defaultVisible: false,
    defaultWidth: 110,
    sortable: false,
    groupable: true,
    filterable: true,
    operators: ["is_true", "is_false"],
  },

  // 3. Party Dimensions
  partyName: {
    id: "partyName",
    label: "Party Name",
    category: "party",
    dataType: "string",
    defaultVisible: true,
    defaultWidth: 180,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["contains", "equals", "in", "is_null", "is_not_null"],
  },
  partyGstin: {
    id: "partyGstin",
    label: "Party GSTIN",
    category: "party",
    dataType: "string",
    defaultVisible: false,
    defaultWidth: 150,
    sortable: true,
    groupable: false,
    filterable: true,
    operators: ["equals", "contains", "starts_with", "is_null", "is_not_null"],
  },
  placeOfSupply: {
    id: "placeOfSupply",
    label: "Place of Supply",
    category: "party",
    dataType: "string",
    defaultVisible: false,
    defaultWidth: 130,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "in", "contains"],
  },

  // 4. Amounts
  debit: {
    id: "debit",
    label: "Debit",
    category: "amounts",
    dataType: "currency",
    defaultVisible: true,
    defaultWidth: 130,
    sortable: true,
    groupable: false,
    filterable: true,
    operators: ["equals", "gt", "gte", "lt", "lte", "between"],
  },
  credit: {
    id: "credit",
    label: "Credit",
    category: "amounts",
    dataType: "currency",
    defaultVisible: true,
    defaultWidth: 130,
    sortable: true,
    groupable: false,
    filterable: true,
    operators: ["equals", "gt", "gte", "lt", "lte", "between"],
  },
  netAmount: {
    id: "netAmount",
    label: "Net (Dr - Cr)",
    category: "amounts",
    dataType: "currency",
    defaultVisible: false,
    defaultWidth: 130,
    sortable: true,
    groupable: false,
    filterable: true,
    operators: ["equals", "gt", "gte", "lt", "lte", "between"],
  },
  runningBalance: {
    id: "runningBalance",
    label: "Running Balance",
    category: "amounts",
    dataType: "currency",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: false,
    groupable: false,
    filterable: false,
    operators: [],
  },

  // 5. Cost Centre & Dimensions
  costCentre: {
    id: "costCentre",
    label: "Cost Centre",
    category: "dimensions",
    dataType: "string",
    defaultVisible: false,
    defaultWidth: 130,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "in", "is_null", "is_not_null"],
  },

  // 6. Tax & GST
  taxCode: {
    id: "taxCode",
    label: "Tax Code",
    category: "tax",
    dataType: "string",
    defaultVisible: false,
    defaultWidth: 120,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "in", "is_null", "is_not_null"],
  },
  role: {
    id: "role",
    label: "Accounting Role",
    category: "tax",
    dataType: "string",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "in"],
  },

  // 7. Audit & Control Flags
  isManual: {
    id: "isManual",
    label: "Manual Journal",
    category: "audit",
    dataType: "boolean",
    defaultVisible: false,
    defaultWidth: 110,
    sortable: false,
    groupable: true,
    filterable: true,
    operators: ["is_true", "is_false"],
  },
  isReconciled: {
    id: "isReconciled",
    label: "Reconciled",
    category: "audit",
    dataType: "boolean",
    defaultVisible: false,
    defaultWidth: 100,
    sortable: false,
    groupable: true,
    filterable: true,
    operators: ["is_true", "is_false"],
  },
  isBackdated: {
    id: "isBackdated",
    label: "Backdated (>3 Days)",
    category: "audit",
    dataType: "boolean",
    defaultVisible: false,
    defaultWidth: 120,
    sortable: false,
    groupable: true,
    filterable: true,
    operators: ["is_true", "is_false"],
  },
  isEditedAfterPosting: {
    id: "isEditedAfterPosting",
    label: "Edited After Posting",
    category: "audit",
    dataType: "boolean",
    defaultVisible: false,
    defaultWidth: 130,
    sortable: false,
    groupable: true,
    filterable: true,
    operators: ["is_true", "is_false"],
  },
  createdBy: {
    id: "createdBy",
    label: "Created By",
    category: "audit",
    dataType: "string",
    defaultVisible: false,
    defaultWidth: 120,
    sortable: true,
    groupable: true,
    filterable: true,
    operators: ["equals", "in"],
  },
};

export const getFieldDefinition = (fieldId: string): FieldDefinition | undefined => {
  return JOURNAL_FIELD_CATALOG[fieldId];
};

export const isFieldAllowed = (fieldId: string): boolean => {
  return Boolean(JOURNAL_FIELD_CATALOG[fieldId]);
};

export const isOperatorAllowed = (fieldId: string, operator: FilterOperator): boolean => {
  const def = JOURNAL_FIELD_CATALOG[fieldId];
  return def ? def.operators.includes(operator) : false;
};
