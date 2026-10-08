// Triggering backend reload to recreate settings_center tables after DB reset
import crypto from "crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { fail, ok } from "../../lib/apiResponse";
import { writeAuditLog } from "../../lib/audit";
import { prisma } from "../../lib/prisma";
import { getActor, getCompanyId, getUserId } from "../../lib/requestUtils";

type SectionCategory =
  | "Core"
  | "Sales"
  | "Purchases"
  | "Accounting"
  | "Tax"
  | "Platform"
  | "Governance"
  | "Data"
  | "Enterprise";

type SectionMode = "single" | "multiple";

type SectionDefinition = {
  key: string;
  label: string;
  category: SectionCategory;
  mode: SectionMode;
  description: string;
  tags: string[];
};

const SETTINGS_CENTER_SECTIONS: SectionDefinition[] = [
  { key: "general_settings", label: "General Settings", category: "Core", mode: "single", description: "Company profile, legal identity, timezone, base currency and logo.", tags: ["company", "profile", "timezone", "address"] },
  { key: "financial_settings", label: "Financial Settings", category: "Accounting", mode: "single", description: "Accounting method, inventory valuation and multi-currency controls.", tags: ["accrual", "cash", "inventory", "cost center"] },
  { key: "tax_settings", label: "Tax Settings", category: "Tax", mode: "multiple", description: "Tax engine with rates, recoverability and effective dates.", tags: ["gst", "vat", "sales tax", "hst", "pst", "qst"] },
  { key: "invoice_settings", label: "Invoice Settings", category: "Sales", mode: "single", description: "Default invoice behavior, due terms and reminders.", tags: ["invoice", "due date", "terms"] },
  { key: "credit_note_settings", label: "Credit Note Settings", category: "Sales", mode: "single", description: "Credit note defaults and posting behavior.", tags: ["credit note", "refund", "adjustment"] },
  { key: "quote_settings", label: "Quote Settings", category: "Sales", mode: "single", description: "Quote defaults, expiry terms and conversion rules.", tags: ["quotes", "expiry", "sales"] },
  { key: "purchase_settings", label: "Purchase Settings", category: "Purchases", mode: "single", description: "Bill and purchase defaults for vendors and approvals.", tags: ["purchases", "vendors", "bills"] },
  { key: "chart_of_accounts", label: "Chart of Accounts", category: "Accounting", mode: "single", description: "COA controls, import/export policies and account conventions.", tags: ["coa", "accounts", "ledger"] },
  { key: "bank_accounts", label: "Bank Accounts", category: "Accounting", mode: "multiple", description: "Bank account registry and feed defaults.", tags: ["bank", "reconcile", "statement"] },
  { key: "payment_methods", label: "Payment Methods", category: "Platform", mode: "multiple", description: "Online and manual payment channel configuration.", tags: ["stripe", "paypal", "square", "razorpay"] },
  { key: "currencies", label: "Currencies", category: "Accounting", mode: "multiple", description: "Currency master including precision and symbols.", tags: ["multi currency", "base currency", "iso"] },
  { key: "exchange_rates", label: "Exchange Rates", category: "Accounting", mode: "multiple", description: "Manual and automatic exchange rates with source tracking.", tags: ["fx", "historical", "rate provider"] },
  { key: "tracking_categories", label: "Tracking Categories", category: "Accounting", mode: "multiple", description: "Dimensions such as department, branch or location.", tags: ["department", "location", "cost center"] },
  { key: "custom_fields", label: "Custom Fields", category: "Platform", mode: "multiple", description: "Schema extensions by entity and field type.", tags: ["custom field", "metadata", "forms"] },
  { key: "document_numbering", label: "Document Numbering", category: "Accounting", mode: "single", description: "Prefixes and sequences for transactional documents.", tags: ["sequence", "prefix", "invoice number"] },
  { key: "branding_themes", label: "Branding Themes", category: "Sales", mode: "multiple", description: "Brand and layout templates for outgoing documents.", tags: ["theme", "invoice layout", "font"] },
  { key: "email_templates", label: "Email Templates", category: "Sales", mode: "multiple", description: "Transactional communication templates with merge variables.", tags: ["email", "template", "variables"] },
  { key: "users_permissions", label: "Users & Permissions", category: "Governance", mode: "single", description: "User policies including MFA and account lifecycle controls.", tags: ["users", "mfa", "invite"] },
  { key: "approval_workflows", label: "Approval Workflows", category: "Governance", mode: "multiple", description: "Rule-based and multi-level approvals.", tags: ["approval", "threshold", "workflow"] },
  { key: "roles_access_control", label: "Roles & Access Control", category: "Governance", mode: "single", description: "Role model and permission matrix strategy.", tags: ["rbac", "roles", "permissions"] },
  { key: "audit_log", label: "Audit Log", category: "Governance", mode: "single", description: "Retention and sensitivity policy for audit records.", tags: ["audit", "trace", "history"] },
  { key: "attachments_storage", label: "Attachments & Storage", category: "Data", mode: "single", description: "Storage quotas, file policy and retention settings.", tags: ["documents", "storage", "uploads"] },
  { key: "integrations", label: "Integrations", category: "Platform", mode: "multiple", description: "Third-party app integration configuration.", tags: ["shopify", "salesforce", "hubspot", "zapier"] },
  { key: "api_webhooks", label: "API & Webhooks", category: "Platform", mode: "single", description: "API key policy, endpoints and webhook subscriptions.", tags: ["api", "webhook", "developer"] },
  { key: "import_export", label: "Import & Export", category: "Data", mode: "single", description: "Data pipeline formats and import/export controls.", tags: ["csv", "excel", "json"] },
  { key: "data_migration", label: "Data Migration", category: "Data", mode: "single", description: "Migration strategy for source accounting platforms.", tags: ["quickbooks", "xero", "zoho"] },
  { key: "automation_rules", label: "Automation Rules", category: "Platform", mode: "multiple", description: "Conditional rule engine for accounting automation.", tags: ["if then", "rules", "auto coding"] },
  { key: "notifications", label: "Notifications", category: "Platform", mode: "single", description: "System, approval and reminder notification controls.", tags: ["email", "reminder", "alerts"] },
  { key: "company_documents", label: "Company Documents", category: "Data", mode: "multiple", description: "Compliance document repository policy and indexing.", tags: ["licenses", "tax", "insurance"] },
  { key: "fiscal_year_settings", label: "Fiscal Year Settings", category: "Accounting", mode: "single", description: "Fiscal year boundaries, closing and year-end process.", tags: ["fiscal", "period close", "year end"] },
  { key: "accounting_lock_dates", label: "Accounting Lock Dates", category: "Governance", mode: "single", description: "Soft and hard lock configuration with overrides.", tags: ["lock date", "close books", "override"] },
  { key: "opening_balances", label: "Opening Balances", category: "Accounting", mode: "single", description: "Opening balance policy by module and ledger class.", tags: ["opening", "migration", "balances"] },
  { key: "backup_restore", label: "Backup & Restore", category: "Data", mode: "single", description: "Backup schedule and restore point controls.", tags: ["backup", "restore", "recovery"] },
  { key: "subscription_billing", label: "Subscription & Billing", category: "Core", mode: "single", description: "Plan, usage and renewal controls.", tags: ["plan", "usage", "billing"] },
  { key: "multi_entity_management", label: "Multi-Entity Management", category: "Enterprise", mode: "single", description: "Entity hierarchy and shared service controls.", tags: ["entity", "subsidiary", "group"] },
  { key: "consolidated_reporting", label: "Consolidated Reporting", category: "Enterprise", mode: "single", description: "Consolidation settings for cross-entity reporting.", tags: ["consolidation", "group reporting"] },
  { key: "intercompany_transactions", label: "Inter-Company Transactions", category: "Enterprise", mode: "single", description: "Intercompany account mapping and balancing rules.", tags: ["intercompany", "elimination", "cross charge"] },
  { key: "client_portal", label: "Client Portal", category: "Enterprise", mode: "single", description: "Portal access and collaboration controls.", tags: ["portal", "client", "access"] },
  { key: "e_signature_settings", label: "E-Signature Settings", category: "Enterprise", mode: "single", description: "Signature provider and signing policy controls.", tags: ["esign", "approval", "compliance"] },
  { key: "ai_automation_settings", label: "AI Automation Settings", category: "Enterprise", mode: "single", description: "AI assistants, confidence thresholds and review policy.", tags: ["ai", "automation", "copilot"] },
  { key: "ocr_settings", label: "OCR Settings", category: "Enterprise", mode: "single", description: "Document OCR processing and extraction thresholds.", tags: ["ocr", "documents", "capture"] },
  { key: "bank_rule_engine", label: "Bank Rule Engine", category: "Enterprise", mode: "multiple", description: "Bank matching and coding rule definitions.", tags: ["bank rules", "reconciliation", "matching"] },
  { key: "recurring_transactions", label: "Recurring Transactions", category: "Enterprise", mode: "multiple", description: "Template scheduling for recurring entries and documents.", tags: ["recurring", "templates", "schedule"] },
  { key: "workflow_builder", label: "Workflow Builder", category: "Enterprise", mode: "multiple", description: "Cross-module workflow orchestrations.", tags: ["workflow", "orchestration", "automation"] },
  { key: "custom_report_builder", label: "Custom Report Builder", category: "Enterprise", mode: "single", description: "Dataset, metric and layout settings for custom reporting.", tags: ["reports", "builder", "analytics"] },
];

const sectionKeySchema = z.enum(
  SETTINGS_CENTER_SECTIONS.map((section) => section.key) as [string, ...string[]],
);
type SectionKey = z.infer<typeof sectionKeySchema>;

const genericPayloadSchema = z.record(z.string(), z.unknown());
const positiveMoneySchema = z.coerce.number().finite().min(0);

const payloadSchemaBySection: Partial<Record<SectionKey, z.ZodType<unknown>>> = {
  general_settings: z.object({
    companyName: z.string().min(2),
    legalName: z.string().min(2).optional().or(z.literal("")),
    tradeName: z.string().min(2).optional().or(z.literal("")),
    registrationNumber: z.string().min(2).optional().or(z.literal("")),
    gstVatNumber: z.string().min(2).optional().or(z.literal("")),
    taxId: z.string().min(2).optional().or(z.literal("")),
    fiscalYearStart: z.string().min(4),
    country: z.string().min(2),
    timezone: z.string().min(2),
    baseCurrency: z.string().min(3).max(3),
    address: z.string().min(2),
    website: z.string().optional().or(z.literal("")),
    phone: z.string().min(5),
    email: z.string().email(),
    logoUrl: z.string().optional().or(z.literal("")),
  }).strict(),
  financial_settings: z.object({
    accountingMethod: z.enum(["CASH", "ACCRUAL"]),
    inventoryMethod: z.enum(["FIFO", "WEIGHTED_AVERAGE"]),
    enableMultiCurrency: z.boolean(),
    enableCostCenters: z.boolean(),
    enableDepartments: z.boolean(),
    enableConsolidation: z.boolean(),
  }).strict(),
  tax_settings: z.object({
    name: z.string().min(2),
    taxType: z.enum(["GST", "VAT", "SALES_TAX", "HST", "PST", "QST", "OTHER"]),
    rate: z.coerce.number().min(0).max(100),
    effectiveDate: z.string().min(4),
    recoverable: z.boolean(),
    compoundTax: z.boolean(),
    isActive: z.boolean().optional(),
  }).strict(),
  payment_methods: z.object({
    provider: z.enum(["STRIPE", "PAYPAL", "RAZORPAY", "SQUARE", "AUTHORIZE_NET", "QUICKBOOKS_PAYMENTS", "MANUAL", "OTHER"]),
    status: z.enum(["CONNECTED", "DISCONNECTED", "ERROR", "PENDING"]),
    endpoint: z.string().optional().or(z.literal("")),
    apiKeyMasked: z.string().optional().or(z.literal("")),
    lastTestAt: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  }).strict(),
  currencies: z.object({
    code: z.string().length(3),
    symbol: z.string().min(1).max(5),
    precision: z.coerce.number().int().min(0).max(6),
    isBase: z.boolean().default(false),
    isActive: z.boolean().default(true),
  }).strict(),
  exchange_rates: z.object({
    pair: z.string().regex(/^[A-Z]{3}\/[A-Z]{3}$/),
    date: z.string().min(4),
    rate: positiveMoneySchema,
    source: z.string().min(2),
    automatic: z.boolean().default(false),
  }).strict(),
  document_numbering: z.object({
    invoicePrefix: z.string().min(1),
    invoiceSequence: z.coerce.number().int().min(1),
    quotePrefix: z.string().min(1),
    quoteSequence: z.coerce.number().int().min(1),
    creditNotePrefix: z.string().min(1),
    creditNoteSequence: z.coerce.number().int().min(1),
    billPrefix: z.string().min(1),
    billSequence: z.coerce.number().int().min(1),
    poPrefix: z.string().min(1),
    poSequence: z.coerce.number().int().min(1),
    journalPrefix: z.string().min(1),
    journalSequence: z.coerce.number().int().min(1),
  }).strict(),
  custom_fields: z.object({
    name: z.string().min(2),
    appliesTo: z.enum(["CUSTOMER", "VENDOR", "INVOICE", "BILL", "PRODUCT", "EMPLOYEE"]),
    fieldType: z.enum(["TEXT", "NUMBER", "DATE", "DROPDOWN", "CHECKBOX", "CURRENCY"]),
    required: z.boolean().default(false),
    options: z.array(z.string().min(1)).optional(),
    isActive: z.boolean().default(true),
  }).strict(),
  tracking_categories: z.object({
    categoryName: z.string().min(2),
    options: z.array(z.string().min(1)).min(1),
    appliesTo: z.array(z.string().min(2)).default(["INVOICE", "BILL", "JOURNAL"]),
    isActive: z.boolean().default(true),
  }).strict(),
  approval_workflows: z.object({
    module: z.string().min(2),
    conditionField: z.string().min(2),
    operator: z.enum(["GT", "GTE", "LT", "LTE", "EQ", "NEQ", "IN"]),
    conditionValue: z.unknown(),
    approvalChain: z.array(z.string().min(2)).min(1),
    isActive: z.boolean().default(true),
  }).strict(),
  attachments_storage: z.object({
    maxFileSizeMb: z.coerce.number().int().min(1).max(500),
    allowedTypes: z.array(z.string().min(2)).min(1),
    storageUsedMb: z.coerce.number().min(0),
    storageLimitMb: z.coerce.number().positive(),
  }).strict(),
  api_webhooks: z.object({
    apiKeyRotationDays: z.coerce.number().int().min(1).max(365),
    webhookEndpoints: z.array(z.object({ url: z.string().url(), active: z.boolean(), events: z.array(z.string().min(2)).min(1) })).default([]),
    enableLogs: z.boolean().default(true),
  }).strict(),
  automation_rules: z.object({
    name: z.string().min(2),
    if: z.array(z.object({ field: z.string().min(2), op: z.string().min(1), value: z.unknown() })).min(1),
    then: z.array(z.object({ action: z.string().min(2), value: z.unknown() })).min(1),
    isActive: z.boolean().default(true),
  }).strict(),
  fiscal_year_settings: z.object({
    fiscalYearStart: z.string().min(4),
    fiscalYearEnd: z.string().min(4),
    periodClosingMode: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]),
    yearEndProcessOwner: z.string().min(2),
  }).strict(),
  accounting_lock_dates: z.object({
    softLockDate: z.string().optional().or(z.literal("")),
    hardLockDate: z.string().optional().or(z.literal("")),
    allowAdminOverride: z.boolean(),
  }).strict(),
  opening_balances: z.object({
    coaOpeningBalance: z.coerce.number(),
    customerBalance: z.coerce.number(),
    vendorBalance: z.coerce.number(),
    inventoryBalance: z.coerce.number(),
    bankBalance: z.coerce.number(),
  }).strict(),
  backup_restore: z.object({
    scheduledBackupEnabled: z.boolean(),
    schedule: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    retentionDays: z.coerce.number().int().min(1).max(3650),
    lastBackupAt: z.string().optional().or(z.literal("")),
  }).strict(),
  subscription_billing: z.object({
    plan: z.string().min(2),
    storageLimitGb: z.coerce.number().min(1),
    seats: z.coerce.number().int().min(1),
    renewalDate: z.string().min(4),
    autoRenew: z.boolean(),
  }).strict(),
};

const upsertRecordSchema = z.object({
  recordKey: z.string().min(1).max(128).optional(),
  payload: z.unknown(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const updateMetaSchema = z.object({
  favorites: z.array(sectionKeySchema).max(15),
  recent: z.array(sectionKeySchema).max(20),
});

const searchSchema = z.object({
  q: z.string().trim().min(2).max(120),
});

const sectionByKey = new Map<SectionKey, SectionDefinition>(
  SETTINGS_CENTER_SECTIONS.map((section) => [section.key as SectionKey, section]),
);

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const slugifyKey = (raw: string) => {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "default";
};

const defaultPayloadBySection: Partial<Record<SectionKey, Record<string, unknown>>> = {
  general_settings: {
    companyName: "",
    legalName: "",
    tradeName: "",
    registrationNumber: "",
    gstVatNumber: "",
    taxId: "",
    fiscalYearStart: "01-01",
    country: "US",
    timezone: "America/New_York",
    baseCurrency: "USD",
    address: "",
    website: "",
    phone: "",
    email: "",
    logoUrl: "",
  },
  financial_settings: {
    accountingMethod: "ACCRUAL",
    inventoryMethod: "FIFO",
    enableMultiCurrency: false,
    enableCostCenters: false,
    enableDepartments: false,
    enableConsolidation: false,
  },
  document_numbering: {
    invoicePrefix: "INV-",
    invoiceSequence: 1,
    quotePrefix: "QT-",
    quoteSequence: 1,
    creditNotePrefix: "CN-",
    creditNoteSequence: 1,
    billPrefix: "BILL-",
    billSequence: 1,
    poPrefix: "PO-",
    poSequence: 1,
    journalPrefix: "JRN-",
    journalSequence: 1,
  },
  fiscal_year_settings: {
    fiscalYearStart: "2026-01-01",
    fiscalYearEnd: "2026-12-31",
    periodClosingMode: "MONTHLY",
    yearEndProcessOwner: "Finance Controller",
  },
  accounting_lock_dates: {
    softLockDate: "",
    hardLockDate: "",
    allowAdminOverride: true,
  },
};

const defaultSingleRecordKey = "default";

let ensureSettingsCenterTablesPromise: Promise<void> | null = null;

const ensureSettingsCenterTables = async () => {
  if (ensureSettingsCenterTablesPromise) {
    return ensureSettingsCenterTablesPromise;
  }

  ensureSettingsCenterTablesPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS settings_center_records (
        id TEXT PRIMARY KEY NOT NULL,
        company_id INTEGER NOT NULL,
        section TEXT NOT NULL,
        record_key TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        sort_order INTEGER NOT NULL DEFAULT 0,
        effective_from TIMESTAMP,
        effective_to TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        UNIQUE(company_id, section, record_key)
      )
    `);

    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS settings_center_records_company_section_idx ON settings_center_records(company_id, section, status)`,
    );

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS settings_center_user_meta (
        id TEXT PRIMARY KEY NOT NULL,
        company_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        favorite_sections TEXT NOT NULL DEFAULT '[]',
        recent_sections TEXT NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, user_id)
      )
    `);
  })().catch((error) => {
    ensureSettingsCenterTablesPromise = null;
    throw error;
  });

  return ensureSettingsCenterTablesPromise;
};

const hasPermission = (req: Request, code: string) => req.companyContext?.permissions?.includes(code) ?? false;

const hasRoleOverride = (req: Request, allowedRoles: string[]) => {
  const role = (req.companyContext?.role.name ?? req.auth?.role ?? "").toLowerCase();
  return allowedRoles.includes(role);
};

const sectionPermissions = (section: SectionKey) => ({
  view: `settings.${section}.view`,
  manage: `settings.${section}.manage`,
});

const canViewSection = (req: Request, section: SectionKey) => {
  // Keep section discovery broad: any active company member can see the catalog.
  // Edit operations remain protected by canManageSection.
  if (req.companyContext?.membership.status === "active") {
    return true;
  }

  const p = sectionPermissions(section);
  return (
    hasPermission(req, p.view) ||
    hasPermission(req, p.manage) ||
    hasPermission(req, "settings.center.view") ||
    hasPermission(req, "settings.center.manage") ||
    hasRoleOverride(req, ["owner", "admin"]) ||
    (hasRoleOverride(req, ["accountant"]) && section !== "users_permissions" && section !== "roles_access_control")
  );
};

const canManageSection = (req: Request, section: SectionKey) => {
  const p = sectionPermissions(section);
  return (
    hasPermission(req, p.manage) ||
    hasPermission(req, "settings.center.manage") ||
    hasRoleOverride(req, ["owner", "admin"])
  );
};

const validateSectionPayload = (section: SectionKey, payload: unknown) => {
  const schema = payloadSchemaBySection[section] ?? genericPayloadSchema;
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.issues };
  }
  return { ok: true as const, data: parsed.data };
};

const getMetaForUser = async (companyId: number, userId: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT favorite_sections, recent_sections FROM settings_center_user_meta WHERE company_id = $1 AND user_id = $2 LIMIT 1`,
    companyId,
    userId,
  )) as Array<{ favorite_sections: string; recent_sections: string }>;

  const favoritesRaw = parseJson(rows[0]?.favorite_sections ?? "[]");
  const recentRaw = parseJson(rows[0]?.recent_sections ?? "[]");

  const favorites = Array.isArray(favoritesRaw) ? favoritesRaw.filter((value) => typeof value === "string") : [];
  const recent = Array.isArray(recentRaw) ? recentRaw.filter((value) => typeof value === "string") : [];

  const knownSectionKeys = new Set(SETTINGS_CENTER_SECTIONS.map((section) => section.key));

  return {
    favorites: favorites.filter((value): value is SectionKey => knownSectionKeys.has(value)),
    recent: recent.filter((value): value is SectionKey => knownSectionKeys.has(value)),
  };
};

export const getSettingsCenterDefinition = async (req: Request, res: Response) => {
  await ensureSettingsCenterTables();
  const companyId = getCompanyId(req);
  const userId = getUserId(req);

  const sections = SETTINGS_CENTER_SECTIONS.filter((section) => canViewSection(req, section.key as SectionKey)).map((section) => ({
    ...section,
    permissions: sectionPermissions(section.key as SectionKey),
    canManage: canManageSection(req, section.key as SectionKey),
    defaultRecordKey: section.mode === "single" ? defaultSingleRecordKey : null,
  }));

  const meta = await getMetaForUser(companyId, userId);

  return ok(res, {
    sections,
    favorites: meta.favorites,
    recent: meta.recent,
  });
};

export const getSettingsCenterRecords = async (req: Request, res: Response) => {
  await ensureSettingsCenterTables();
  const companyId = getCompanyId(req);
  const parsedSection = sectionKeySchema.safeParse(req.params.section);
  if (!parsedSection.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Unknown settings section.", parsedSection.error.issues);
  }
  const section = parsedSection.data;

  if (!canViewSection(req, section)) {
    return fail(res, 403, "PERMISSION_REQUIRED", `You don't have permission to view ${section}.`);
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, record_key, payload, status, sort_order, effective_from, effective_to, created_at, updated_at
      FROM settings_center_records
      WHERE company_id = $1 AND section = $2 AND status <> 'ARCHIVED'
      ORDER BY sort_order ASC, updated_at DESC`,
    companyId,
    section,
  )) as Array<{
    id: string;
    record_key: string;
    payload: string;
    status: string;
    sort_order: number;
    effective_from: string | null;
    effective_to: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const sectionDef = sectionByKey.get(section);
  const records = rows.map((row) => ({
    id: row.id,
    recordKey: row.record_key,
    payload: parseJson(row.payload),
    status: row.status,
    sortOrder: row.sort_order,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  if (sectionDef?.mode === "single" && records.length === 0) {
    records.push({
      id: "virtual-default",
      recordKey: defaultSingleRecordKey,
      payload: defaultPayloadBySection[section] ?? {},
      status: "ACTIVE",
      sortOrder: 0,
      effectiveFrom: null,
      effectiveTo: null,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });
  }

  return ok(res, {
    section,
    mode: sectionDef?.mode ?? "single",
    records,
  });
};

export const upsertSettingsCenterRecord = async (req: Request, res: Response) => {
  await ensureSettingsCenterTables();
  const companyId = getCompanyId(req);
  const sectionParsed = sectionKeySchema.safeParse(req.params.section);

  if (!sectionParsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Unknown settings section.", sectionParsed.error.issues);
  }

  const section = sectionParsed.data;

  if (!canManageSection(req, section)) {
    return fail(res, 403, "PERMISSION_REQUIRED", `You don't have permission to update ${section}.`);
  }

  const bodyParsed = upsertRecordSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid settings payload.", bodyParsed.error.issues);
  }

  const sectionDef = sectionByKey.get(section);
  const input = bodyParsed.data;
  const recordKey = sectionDef?.mode === "single" ? defaultSingleRecordKey : slugifyKey(input.recordKey ?? "default");
  const actor = getActor(req);

  const payloadValidation = validateSectionPayload(section, input.payload);
  if (!payloadValidation.ok) {
    return fail(res, 400, "VALIDATION_ERROR", "Payload schema does not match section requirements.", payloadValidation.issues);
  }

  const existingRows = (await prisma.$queryRawUnsafe(
    `SELECT id, payload, status, sort_order, effective_from, effective_to
      FROM settings_center_records
      WHERE company_id = $1 AND section = $2 AND record_key = $3
      LIMIT 1`,
    companyId,
    section,
    recordKey,
  )) as Array<{
    id: string;
    payload: string;
    status: string;
    sort_order: number;
    effective_from: string | null;
    effective_to: string | null;
  }>;

  const existing = existingRows[0];
  const nextId = existing?.id ?? crypto.randomUUID();

  await prisma.$executeRawUnsafe(
    `INSERT INTO settings_center_records
      (id, company_id, section, record_key, payload, status, sort_order, effective_from, effective_to, created_by, updated_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(company_id, section, record_key)
      DO UPDATE SET
        payload = excluded.payload,
        status = excluded.status,
        sort_order = excluded.sort_order,
        effective_from = excluded.effective_from,
        effective_to = excluded.effective_to,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP`,
    nextId,
    companyId,
    section,
    recordKey,
    JSON.stringify(payloadValidation.data),
    input.status ?? "ACTIVE",
    input.sortOrder ?? 0,
    input.effectiveFrom ?? null,
    input.effectiveTo ?? null,
    actor,
    actor,
  );

  await writeAuditLog({
    req,
    action: "settings_center.record_upserted",
    entityType: section,
    entityId: `${companyId}:${recordKey}`,
    oldValues: existing
      ? {
          payload: parseJson(existing.payload),
          status: existing.status,
          sortOrder: existing.sort_order,
          effectiveFrom: existing.effective_from,
          effectiveTo: existing.effective_to,
        }
      : null,
    newValues: {
      payload: payloadValidation.data,
      status: input.status ?? "ACTIVE",
      sortOrder: input.sortOrder ?? 0,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
    },
  });

  const updatedRows = (await prisma.$queryRawUnsafe(
    `SELECT id, record_key, payload, status, sort_order, effective_from, effective_to, created_at, updated_at
      FROM settings_center_records
      WHERE company_id = $1 AND section = $2 AND record_key = $3
      LIMIT 1`,
    companyId,
    section,
    recordKey,
  )) as Array<{
    id: string;
    record_key: string;
    payload: string;
    status: string;
    sort_order: number;
    effective_from: string | null;
    effective_to: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const updated = updatedRows[0];
  if (!updated) {
    return fail(res, 500, "SYSTEM_ERROR", "Unable to load updated settings record.");
  }

  return ok(res, {
    id: updated.id,
    recordKey: updated.record_key,
    payload: parseJson(updated.payload),
    status: updated.status,
    sortOrder: updated.sort_order,
    effectiveFrom: updated.effective_from,
    effectiveTo: updated.effective_to,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  });
};

export const archiveSettingsCenterRecord = async (req: Request, res: Response) => {
  await ensureSettingsCenterTables();
  const companyId = getCompanyId(req);
  const sectionParsed = sectionKeySchema.safeParse(req.params.section);
  if (!sectionParsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Unknown settings section.", sectionParsed.error.issues);
  }

  const section = sectionParsed.data;
  if (!canManageSection(req, section)) {
    return fail(res, 403, "PERMISSION_REQUIRED", `You don't have permission to update ${section}.`);
  }

  const recordKey = slugifyKey(req.params.recordKey ?? "");

  const existingRows = (await prisma.$queryRawUnsafe(
    `SELECT payload, status FROM settings_center_records WHERE company_id = $1 AND section = $2 AND record_key = $3 LIMIT 1`,
    companyId,
    section,
    recordKey,
  )) as Array<{ payload: string; status: string }>;

  if (!existingRows[0]) {
    return fail(res, 404, "NOT_FOUND", "Settings record not found.");
  }

  await prisma.$executeRawUnsafe(
    `UPDATE settings_center_records
      SET status = 'ARCHIVED', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $2 AND section = $3 AND record_key = $4`,
    getActor(req),
    companyId,
    section,
    recordKey,
  );

  await writeAuditLog({
    req,
    action: "settings_center.record_archived",
    entityType: section,
    entityId: `${companyId}:${recordKey}`,
    oldValues: {
      payload: parseJson(existingRows[0].payload),
      status: existingRows[0].status,
    },
    newValues: {
      status: "ARCHIVED",
    },
  });

  return ok(res, true, "Record archived.");
};

export const searchSettingsCenter = async (req: Request, res: Response) => {
  await ensureSettingsCenterTables();
  const companyId = getCompanyId(req);

  const parsed = searchSchema.safeParse({
    q: req.query.q,
  });

  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Please provide at least 2 characters to search.", parsed.error.issues);
  }

  const q = parsed.data.q.toLowerCase();

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT section, record_key, payload, updated_at
      FROM settings_center_records
      WHERE company_id = $1
        AND status <> 'ARCHIVED'
        AND (
          LOWER(section) LIKE $2 OR
          LOWER(record_key) LIKE $3 OR
          LOWER(payload) LIKE $4
        )
      ORDER BY updated_at DESC
      LIMIT 100`,
    companyId,
    `%${q}%`,
    `%${q}%`,
    `%${q}%`,
  )) as Array<{
    section: SectionKey;
    record_key: string;
    payload: string;
    updated_at: string;
  }>;

  const sectionResults = SETTINGS_CENTER_SECTIONS
    .filter((section) => canViewSection(req, section.key as SectionKey))
    .filter(
      (section) =>
        section.label.toLowerCase().includes(q) ||
        section.description.toLowerCase().includes(q) ||
        section.tags.some((tag) => tag.toLowerCase().includes(q)),
    )
    .map((section) => ({
      type: "section" as const,
      section: section.key,
      label: section.label,
      description: section.description,
    }));

  const recordResults = rows
    .filter((row) => canViewSection(req, row.section))
    .map((row) => ({
      type: "record" as const,
      section: row.section,
      recordKey: row.record_key,
      payloadPreview: asRecord(parseJson(row.payload)),
      updatedAt: row.updated_at,
    }));

  return ok(res, {
    query: q,
    results: [...sectionResults, ...recordResults],
  });
};

export const updateSettingsCenterMeta = async (req: Request, res: Response) => {
  await ensureSettingsCenterTables();
  const companyId = getCompanyId(req);
  const userId = getUserId(req);

  const parsed = updateMetaSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid favorites/recent settings.", parsed.error.issues);
  }

  const visibleSectionKeys = new Set(
    SETTINGS_CENTER_SECTIONS.filter((section) => canViewSection(req, section.key as SectionKey)).map(
      (section) => section.key,
    ),
  );

  const favorites = parsed.data.favorites.filter((key) => visibleSectionKeys.has(key));
  const recent = parsed.data.recent.filter((key) => visibleSectionKeys.has(key));

  const existingRows = (await prisma.$queryRawUnsafe(
    `SELECT id FROM settings_center_user_meta WHERE company_id = $1 AND user_id = $2 LIMIT 1`,
    companyId,
    userId,
  )) as Array<{ id: string }>;

  const id = existingRows[0]?.id ?? crypto.randomUUID();

  await prisma.$executeRawUnsafe(
    `INSERT INTO settings_center_user_meta (id, company_id, user_id, favorite_sections, recent_sections, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT(company_id, user_id)
      DO UPDATE SET
        favorite_sections = excluded.favorite_sections,
        recent_sections = excluded.recent_sections,
        updated_at = CURRENT_TIMESTAMP`,
    id,
    companyId,
    userId,
    JSON.stringify(favorites),
    JSON.stringify(recent),
  );

  return ok(res, {
    favorites,
    recent,
  });
};
