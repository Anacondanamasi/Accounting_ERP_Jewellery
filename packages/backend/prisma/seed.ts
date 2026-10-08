import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

const SYSTEM_ROLES = ["owner", "admin", "accountant", "auditor", "viewer"] as const;

const SETTINGS_CENTER_SECTIONS = [
  "general_settings",
  "financial_settings",
  "tax_settings",
  "invoice_settings",
  "credit_note_settings",
  "quote_settings",
  "purchase_settings",
  "chart_of_accounts",
  "bank_accounts",
  "payment_methods",
  "currencies",
  "exchange_rates",
  "tracking_categories",
  "custom_fields",
  "document_numbering",
  "branding_themes",
  "email_templates",
  "users_permissions",
  "approval_workflows",
  "roles_access_control",
  "audit_log",
  "attachments_storage",
  "integrations",
  "api_webhooks",
  "import_export",
  "data_migration",
  "automation_rules",
  "notifications",
  "company_documents",
  "fiscal_year_settings",
  "accounting_lock_dates",
  "opening_balances",
  "backup_restore",
  "subscription_billing",
  "multi_entity_management",
  "consolidated_reporting",
  "intercompany_transactions",
  "client_portal",
  "e_signature_settings",
  "ai_automation_settings",
  "ocr_settings",
  "bank_rule_engine",
  "recurring_transactions",
  "workflow_builder",
  "custom_report_builder",
] as const;

const SETTINGS_CENTER_PERMISSIONS = SETTINGS_CENTER_SECTIONS.flatMap((section) => [
  {
    code: `settings.${section}.view`,
    module: "settings_center",
    description: `View ${section} module settings`,
  },
  {
    code: `settings.${section}.manage`,
    module: "settings_center",
    description: `Manage ${section} module settings`,
  },
]);

const PERMISSIONS = [
  { code: "journal.create", module: "journal", description: "Create journal entries" },
  { code: "journal.view", module: "journal", description: "View journal entries" },
  { code: "journal.update", module: "journal", description: "Edit journal entries" },
  { code: "journal.post", module: "journal", description: "Post journal entries" },
  { code: "invoice.create", module: "invoice", description: "Create invoices" },
  { code: "invoice.approve", module: "invoice", description: "Approve invoices" },
  { code: "invoice.view", module: "invoice", description: "View invoices" },
  { code: "bill.create", module: "bill", description: "Create bills" },
  { code: "bill.approve", module: "bill", description: "Approve bills" },
  { code: "bill.view", module: "bill", description: "View bills" },
  { code: "payment.create", module: "payment", description: "Create payments" },
  { code: "payment.view", module: "payment", description: "View payments" },
  { code: "bank.reconcile", module: "bank", description: "Reconcile bank statements" },
  { code: "bank.view", module: "bank", description: "View bank data" },
  { code: "report.view", module: "report", description: "View reports" },
  { code: "report.export", module: "report", description: "Export reports" },
  { code: "payroll.create", module: "payroll", description: "Create payroll records" },
  { code: "payroll.approve", module: "payroll", description: "Approve payroll" },
  { code: "payroll.view", module: "payroll", description: "View payroll" },
  { code: "settings.company.update", module: "settings", description: "Edit company settings" },
  { code: "settings.integration.manage", module: "settings", description: "Manage integrations" },
  { code: "settings.center.view", module: "settings_center", description: "View settings center" },
  { code: "settings.center.manage", module: "settings_center", description: "Manage settings center" },
  { code: "user_management.invite", module: "user_management", description: "Invite members" },
  { code: "user_management.view", module: "user_management", description: "View members" },
  { code: "user_management.manage_roles", module: "user_management", description: "Manage roles" },
  { code: "user_management.remove", module: "user_management", description: "Remove members" },
  ...SETTINGS_CENTER_PERMISSIONS,
];

const ROLE_PERMISSION_MAP: Record<(typeof SYSTEM_ROLES)[number], string[]> = {
  owner: PERMISSIONS.map((permission) => permission.code),
  admin: PERMISSIONS.map((permission) => permission.code),
  accountant: [
    "journal.create",
    "journal.view",
    "journal.update",
    "invoice.create",
    "invoice.view",
    "bill.create",
    "bill.view",
    "payment.create",
    "payment.view",
    "bank.view",
    "report.view",
    "report.export",
    "payroll.view",
    "settings.center.view",
    "settings.general_settings.view",
    "settings.financial_settings.view",
    "settings.tax_settings.view",
    "settings.chart_of_accounts.view",
    "settings.bank_accounts.view",
    "settings.currencies.view",
    "settings.exchange_rates.view",
    "settings.document_numbering.view",
    "settings.fiscal_year_settings.view",
    "settings.accounting_lock_dates.view",
    "settings.opening_balances.view",
  ],
  auditor: [
    "journal.view",
    "invoice.view",
    "bill.view",
    "payment.view",
    "bank.view",
    "report.view",
    "report.export",
    "settings.center.view",
    "settings.audit_log.view",
    "settings.roles_access_control.view",
  ],
  viewer: [
    "journal.view",
    "invoice.view",
    "bill.view",
    "payment.view",
    "bank.view",
    "report.view",
    "settings.center.view",
    "settings.general_settings.view",
  ],
};

const uuid = () => crypto.randomUUID();

async function seedLegacyData() {
  await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Manav Jewellers Pvt. Ltd.",
      gstin: "24AAACM1234A1Z1",
      city: "Ahmedabad",
      state: "Gujarat",
      createdBy: "system",
    },
  });

  const usersToSeed = [
    {
      id: 1,
      companyId: 1,
      email: "rajesh@mehtajewellers.in",
      fullName: "Rajesh Mehta",
      password: "Password@123", // Will hash below
      role: "ADMIN",
      createdBy: "system",
    },
    {
      id: 2,
      companyId: 1,
      email: "priya@mehtajewellers.in",
      fullName: "Priya Shah",
      password: "Password@123", // Will hash below
      role: "ACCOUNTANT",
      createdBy: "system",
    },
  ];

  for (const u of usersToSeed) {
    const hashedPassword = await bcrypt.hash(u.password, 12);
    await prisma.user
      .upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: u.id,
          companyId: u.companyId,
          email: u.email,
          fullName: u.fullName,
          password: hashedPassword,
          role: u.role,
          createdBy: u.createdBy,
        },
      })
      .catch((err) => console.error(`Error seeding user ${u.email}:`, err));
  }
}

async function ensureSqliteIamTables() {
  await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    max_users INTEGER NOT NULL DEFAULT 5,
    max_companies_per_user INTEGER NOT NULL DEFAULT 3,
    features TEXT NOT NULL,
    price_monthly REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
  )`);

  await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP,
    mfa_secret TEXT,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    legacy_user_id INTEGER UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
  )`);

  await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    legal_name TEXT,
    registration_number TEXT,
    tax_id TEXT,
    currency_code TEXT NOT NULL DEFAULT 'USD',
    fiscal_year_start TEXT NOT NULL DEFAULT '01-01',
    country_code TEXT NOT NULL,
    timezone TEXT NOT NULL,
    logo_url TEXT,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'trial',
    trial_ends_at TIMESTAMP,
    owner_id TEXT NOT NULL,
    legacy_company_id INTEGER UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
  )`);

  await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY NOT NULL,
    company_id TEXT,
    name TEXT NOT NULL,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(company_id, name)
  )`);

  await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
  )`);

  await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    PRIMARY KEY(role_id, permission_id)
  )`);

  await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS user_company_memberships (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    invited_by TEXT,
    invitation_token TEXT,
    invitation_expires_at TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending',
    joined_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(user_id, company_id)
  )`);

  await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS active_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    company_id TEXT,
    token_hash TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
  )`);

  await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    company_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)`);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS memberships_user_company_idx ON user_company_memberships(user_id, company_id)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS memberships_company_idx ON user_company_memberships(company_id)`,
  );
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS active_sessions_token_hash_idx ON active_sessions(token_hash)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS active_sessions_user_id_idx ON active_sessions(user_id)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS audit_logs_company_created_idx ON audit_logs(company_id, created_at)`);
}

async function seedIamData() {
  const starterPlanId = uuid();
  await prisma.$executeRawUnsafe(
    `INSERT INTO subscription_plans (id, name, max_users, max_companies_per_user, features, price_monthly, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    starterPlanId,
    "Starter",
    10,
    3,
    JSON.stringify({ reports: true, inventory: true, payroll: true }),
    29,
  );

  const enterprisePlanId = uuid();
  await prisma.$executeRawUnsafe(
    `INSERT INTO subscription_plans (id, name, max_users, max_companies_per_user, features, price_monthly, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    enterprisePlanId,
    "Enterprise",
    1000,
    100,
    JSON.stringify({ reports: true, inventory: true, payroll: true, sso: true }),
    499,
  );

  const users = [
    {
      id: uuid(),
      email: "rajesh@mehtajewellers.in",
      fullName: "Rajesh Mehta",
      passwordHash: await bcrypt.hash("Password@123", 12),
      legacyUserId: 1,
      isEmailVerified: true,
    },
    {
      id: uuid(),
      email: "priya@mehtajewellers.in",
      fullName: "Priya Shah",
      passwordHash: await bcrypt.hash("Password@123", 12),
      legacyUserId: 2,
      isEmailVerified: true,
    },
  ];

  for (const user of users) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO users
      (id, email, password_hash, full_name, is_email_verified, legacy_user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (email) DO NOTHING`,
      user.id,
      user.email.toLowerCase(),
      user.passwordHash,
      user.fullName,
      user.isEmailVerified,
      user.legacyUserId,
    );
  }

  const ownerRow = (await prisma.$queryRawUnsafe(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    "rajesh@mehtajewellers.in",
  )) as Array<{ id: string }>;

  const ownerId = ownerRow[0]?.id;
  if (!ownerId) {
    console.error("Owner user not found in users table during seedIamData.");
    return;
  }

  const planRow = (await prisma.$queryRawUnsafe(
    `SELECT id FROM subscription_plans WHERE name = 'Starter' LIMIT 1`,
  )) as Array<{ id: string }>;
  const starterId = planRow[0]?.id ?? starterPlanId;

  const defaultCompanyId = uuid();
  await prisma.$executeRawUnsafe(
    `INSERT INTO companies
    (id, name, legal_name, tax_id, currency_code, fiscal_year_start, country_code, timezone, plan_id, status, owner_id, legacy_company_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (legacy_company_id) DO NOTHING`,
    defaultCompanyId,
    "Mehta Jewellers",
    "Mehta Jewellers Pvt. Ltd.",
    "24AAACM1234A1Z1",
    "INR",
    "04-01",
    "IN",
    "Asia/Kolkata",
    starterId,
    "active",
    ownerId,
    1,
  );

  const companyRow = (await prisma.$queryRawUnsafe(
    `SELECT id FROM companies WHERE legacy_company_id = 1 LIMIT 1`,
  )) as Array<{ id: string }>;
  const companyId = companyRow[0]?.id;
  if (!companyId) {
    console.error("Company not found in companies table during seedIamData.");
    return;
  }

  // 1. Bulk insert roles
  if (SYSTEM_ROLES.length > 0) {
    const roleValues: string[] = [];
    const roleParams: any[] = [];
    let pIdx = 1;
    for (const roleName of SYSTEM_ROLES) {
      roleValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
      roleParams.push(uuid(), roleName, `${roleName} system role`);
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO roles (id, name, description, is_system_role, created_at, updated_at) VALUES ${roleValues.join(", ")} ON CONFLICT DO NOTHING`,
      ...roleParams
    );
  }

  // 2. Bulk insert permissions
  if (PERMISSIONS.length > 0) {
    const permValues: string[] = [];
    const permParams: any[] = [];
    let pIdx = 1;
    for (const permission of PERMISSIONS) {
      permValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
      permParams.push(uuid(), permission.code, permission.module, permission.description);
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO permissions (id, code, module, description, created_at, updated_at) VALUES ${permValues.join(", ")} ON CONFLICT (code) DO NOTHING`,
      ...permParams
    );
  }

  const roles = (await prisma.$queryRawUnsafe(
    `SELECT id, name FROM roles WHERE company_id IS NULL`,
  )) as Array<{ id: string; name: string }>;
  const permissions = (await prisma.$queryRawUnsafe(
    `SELECT id, code FROM permissions`,
  )) as Array<{ id: string; code: string }>;
  const permissionIdByCode = new Map(permissions.map((permission) => [permission.code, permission.id]));

  // 3. Bulk insert role_permissions
  const rpValues: string[] = [];
  const rpParams: any[] = [];
  for (const role of roles) {
    const codes = ROLE_PERMISSION_MAP[role.name as keyof typeof ROLE_PERMISSION_MAP] ?? [];
    for (const code of codes) {
      const permissionId = permissionIdByCode.get(code);
      if (!permissionId) continue;
      rpValues.push(`(role_id, permission_id)`); // Placeholder to track count
      rpParams.push(role.id, permissionId);
    }
  }

  const batchSize = 100;
  for (let i = 0; i < rpValues.length; i += batchSize) {
    const chunkParams = rpParams.slice(i * 2, (i + batchSize) * 2);
    const chunkValCount = chunkParams.length / 2;
    const reindexedValues: string[] = [];
    for (let c = 0; c < chunkValCount; c++) {
      reindexedValues.push(`($${c * 2 + 1}, $${c * 2 + 2}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at) VALUES ${reindexedValues.join(", ")} ON CONFLICT (role_id, permission_id) DO NOTHING`,
      ...chunkParams
    );
  }

  const ownerRole = roles.find((role) => role.name === "owner");
  const accountantRole = roles.find((role) => role.name === "accountant");
  const priya = (await prisma.$queryRawUnsafe(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    "priya@mehtajewellers.in",
  )) as Array<{ id: string }>;

  if (ownerRole) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_company_memberships
      (id, user_id, company_id, role_id, status, joined_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (user_id, company_id) DO NOTHING`,
      uuid(),
      ownerId,
      companyId,
      ownerRole.id,
    );
  }

  if (accountantRole && priya[0]?.id) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_company_memberships
      (id, user_id, company_id, role_id, invited_by, status, joined_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (user_id, company_id) DO NOTHING`,
      uuid(),
      priya[0].id,
      companyId,
      accountantRole.id,
      ownerId,
    );
  }
}

async function main() {
  console.log("Starting seed Legacy Data...");
  await seedLegacyData();
  console.log("Legacy Data seeded. Ensuring IAM tables...");
  await ensureSqliteIamTables();
  console.log("IAM tables ensured. Seeding IAM Data...");
  await seedIamData();
  console.log("Seed completed.");
}

async function runWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await main();
      return;
    } catch (error: any) {
      console.error(`Attempt ${i + 1} failed: ${error.message ?? error}`);
      if (i < retries - 1) {
        console.log(`Waiting ${delay}ms before next retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

runWithRetry()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed script failed completely:");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
