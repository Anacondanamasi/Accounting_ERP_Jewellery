CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "max_users" INTEGER NOT NULL DEFAULT 5,
  "max_companies_per_user" INTEGER NOT NULL DEFAULT 3,
  "features" TEXT NOT NULL,
  "price_monthly" REAL NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" DATETIME
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "phone" TEXT,
  "avatar_url" TEXT,
  "is_email_verified" BOOLEAN NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT 1,
  "last_login_at" DATETIME,
  "mfa_secret" TEXT,
  "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" DATETIME,
  "legacy_user_id" INTEGER,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" DATETIME
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_legacy_user_id_key" ON "users"("legacy_user_id");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

CREATE TABLE IF NOT EXISTS "companies" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "legal_name" TEXT,
  "registration_number" TEXT,
  "tax_id" TEXT,
  "currency_code" TEXT NOT NULL DEFAULT 'USD',
  "fiscal_year_start" TEXT NOT NULL DEFAULT '01-01',
  "country_code" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "logo_url" TEXT,
  "plan_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'trial',
  "trial_ends_at" DATETIME,
  "owner_id" TEXT NOT NULL,
  "legacy_company_id" INTEGER,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" DATETIME,
  CONSTRAINT "companies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "companies_legacy_company_id_key" ON "companies"("legacy_company_id");
CREATE INDEX IF NOT EXISTS "companies_owner_id_idx" ON "companies"("owner_id");
CREATE INDEX IF NOT EXISTS "companies_plan_id_idx" ON "companies"("plan_id");
CREATE INDEX IF NOT EXISTS "companies_status_idx" ON "companies"("status");

CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT,
  "name" TEXT NOT NULL,
  "is_system_role" BOOLEAN NOT NULL DEFAULT 0,
  "description" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" DATETIME,
  CONSTRAINT "roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "roles_company_id_name_key" ON "roles"("company_id", "name");
CREATE INDEX IF NOT EXISTS "roles_is_system_role_idx" ON "roles"("is_system_role");

CREATE TABLE IF NOT EXISTS "permissions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" DATETIME
);

CREATE UNIQUE INDEX IF NOT EXISTS "permissions_code_key" ON "permissions"("code");
CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions"("module");

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" DATETIME,
  PRIMARY KEY ("role_id", "permission_id"),
  CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "user_company_memberships" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "invited_by" TEXT,
  "invitation_token" TEXT,
  "invitation_expires_at" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "joined_at" DATETIME,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" DATETIME,
  CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "memberships_user_company_key" ON "user_company_memberships"("user_id", "company_id");
CREATE INDEX IF NOT EXISTS "memberships_company_idx" ON "user_company_memberships"("company_id");
CREATE INDEX IF NOT EXISTS "memberships_user_company_idx" ON "user_company_memberships"("user_id", "company_id");
CREATE INDEX IF NOT EXISTS "memberships_status_idx" ON "user_company_memberships"("status");
CREATE INDEX IF NOT EXISTS "memberships_invitation_token_idx" ON "user_company_memberships"("invitation_token");

CREATE TABLE IF NOT EXISTS "active_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT,
  "token_hash" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "user_agent" TEXT NOT NULL,
  "expires_at" DATETIME NOT NULL,
  "revoked_at" DATETIME,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" DATETIME,
  CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "active_sessions_token_hash_idx" ON "active_sessions"("token_hash");
CREATE INDEX IF NOT EXISTS "active_sessions_user_id_idx" ON "active_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "active_sessions_company_id_idx" ON "active_sessions"("company_id");

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT,
  "user_id" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "old_values" TEXT,
  "new_values" TEXT,
  "ip_address" TEXT NOT NULL,
  "user_agent" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "audit_logs_company_created_idx" ON "audit_logs"("company_id", "created_at");
