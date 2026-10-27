import type { Request, Response } from "express";
import crypto from "crypto";
import {
  createCompanySchema,
  createRoleSchema,
  inviteMemberSchema,
  requestOwnershipTransferSchema,
  updateMemberRoleSchema,
  updateRoleSchema,
} from "@jewelledger/shared";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { writeAuditLog } from "../../lib/audit";
import {
  createSignedToken,
  hashPassword,
  normalizeEmail,
  signAccessToken,
  verifyAccessToken,
  verifySignedToken,
} from "../../lib/security";
import { consumeRateLimit } from "../../lib/rateLimiter";
import { invalidatePermissionCache } from "../../lib/permissionCache";

type CompanyRow = {
  id: string;
  name: string;
  legal_name: string | null;
  registration_number: string | null;
  tax_id: string | null;
  currency_code: string;
  fiscal_year_start: string;
  country_code: string;
  timezone: string;
  logo_url: string | null;
  status: "active" | "suspended" | "trial" | "cancelled";
  trial_ends_at: string | null;
  plan_id: string;
  owner_id: string;
  legacy_company_id: number | null;
  plan_name: string;
};

const requireUser = (req: Request, res: Response) => {
  if (!req.auth?.userId) {
    fail(res, 401, "UNAUTHORIZED", "Please sign in to continue.");
    return null;
  }
  return String(req.auth.userId);
};

const getCompanyMembership = async (userId: string, companyId: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT m.id, m.status, r.name AS role_name
      FROM user_company_memberships m
      INNER JOIN roles r ON r.id = m.role_id
      WHERE m.user_id = $1 AND m.company_id = $2 AND m.deleted_at IS NULL
      LIMIT 1`,
    userId,
    companyId,
  )) as Array<{ id: string; status: string; role_name: string }>;
  return rows[0] ?? null;
};

const getDefaultPlanId = async () => {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id FROM subscription_plans WHERE deleted_at IS NULL ORDER BY price_monthly ASC LIMIT 1`,
  )) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
};

const getSystemRoleId = async (roleName: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id FROM roles WHERE company_id IS NULL AND name = $1 AND deleted_at IS NULL LIMIT 1`,
    roleName,
  )) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
};

const invalidateCompanyPermissionCache = async (companyId: string) => {
  const memberships = (await prisma.$queryRawUnsafe(
    `SELECT user_id FROM user_company_memberships
      WHERE company_id = $1 AND deleted_at IS NULL`,
    companyId,
  )) as Array<{ user_id: string }>;
  memberships.forEach((membership) => invalidatePermissionCache(membership.user_id, companyId));
};

export const createCompany = async (req: Request, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const parsed = createCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Please check the company details.", parsed.error.issues);
    }

    const planId = await getDefaultPlanId();
    if (!planId) {
      return fail(res, 500, "PLAN_MISSING", "Company setup is unavailable. Please contact support.");
    }

    const ownerRoleId = await getSystemRoleId("owner");
    if (!ownerRoleId) {
      return fail(res, 500, "ROLE_MISSING", "Company setup is unavailable. Please contact support.");
    }

    const companyId = crypto.randomUUID();
    const legacyCompany = await prisma.company.create({
      data: {
        name: parsed.data.name,
        gstin: parsed.data.taxId ?? "PENDING",
        city: null,
        state: null,
        createdBy: userId,
      },
    });

    console.log("Creating company with params:", {
      userId,
      companyId,
      planId,
      ownerRoleId,
      legacyCompanyId: legacyCompany.id,
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO companies
        (id, name, legal_name, registration_number, tax_id, currency_code, fiscal_year_start, country_code, timezone, industry, logo_url, plan_id, status, trial_ends_at, owner_id, legacy_company_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'trial', CURRENT_TIMESTAMP + INTERVAL '14 day', $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      companyId,
      parsed.data.name,
      parsed.data.legalName ?? null,
      parsed.data.registrationNumber ?? null,
      parsed.data.taxId ?? null,
      parsed.data.currencyCode.toUpperCase(),
      parsed.data.fiscalYearStart,
      parsed.data.countryCode.toUpperCase(),
      parsed.data.timezone,
      parsed.data.industry ?? null,
      parsed.data.logoUrl ?? null,
      planId,
      userId,
      legacyCompany.id,
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO user_company_memberships
        (id, user_id, company_id, role_id, status, joined_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      crypto.randomUUID(),
      userId,
      companyId,
      ownerRoleId,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE users SET last_active_org_id = $1 WHERE id = $2`,
      companyId,
      userId,
    );

    await writeAuditLog({
      req,
      action: "company.created",
      entityType: "company",
      entityId: companyId,
      companyId,
      userId,
      newValues: parsed.data,
    });

    const accessToken = signAccessToken({
      sub: userId,
      role: "owner",
      companyId,
      legacyCompanyId: legacyCompany.id,
    });

    return created(res, {
      id: companyId,
      name: parsed.data.name,
      status: "trial",
      legacyCompanyId: legacyCompany.id,
      accessToken,
      membership: {
        userId,
        role: "owner",
        status: "active",
      },
    });
  } catch (error: any) {
    console.error("Error creating company:", error);
    return fail(res, 500, "INTERNAL_ERROR", error.message || "An unexpected error occurred during company creation.");
  }
};

export const listCompanies = async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT
      c.id,
      c.name,
      c.logo_url,
      c.status,
      c.trial_ends_at,
      c.legacy_company_id,
      sp.name AS plan_name,
      r.name AS role_name,
      m.status AS membership_status
    FROM user_company_memberships m
    INNER JOIN companies c ON c.id = m.company_id
    INNER JOIN subscription_plans sp ON sp.id = c.plan_id
    INNER JOIN roles r ON r.id = m.role_id
    WHERE m.user_id = $1
      AND m.deleted_at IS NULL
      AND c.deleted_at IS NULL
    ORDER BY c.name ASC`,
    userId,
  )) as Array<{
    id: string;
    name: string;
    logo_url: string | null;
    status: string;
    trial_ends_at: string | null;
    legacy_company_id: number | null;
    plan_name: string;
    role_name: string;
    membership_status: string;
  }>;

  return ok(
    res,
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
      status: row.status,
      trialEndsAt: row.trial_ends_at,
      legacyCompanyId: row.legacy_company_id,
      planName: row.plan_name,
      role: row.role_name,
      membershipStatus: row.membership_status,
    })),
  );
};

export const switchCompany = async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const targetCompanyId = req.params.id;
  const membership = await getCompanyMembership(userId, targetCompanyId);
  if (!membership || membership.status !== "active") {
    return fail(res, 403, "ACCESS_DENIED", "You do not have active membership in this organisation.");
  }

  await prisma.$executeRawUnsafe(
    `UPDATE users SET last_active_org_id = $1 WHERE id = $2`,
    targetCompanyId,
    userId,
  );

  const compRows = (await prisma.$queryRawUnsafe(
    "SELECT legacy_company_id FROM companies WHERE id = $1 LIMIT 1",
    targetCompanyId,
  )) as Array<{ legacy_company_id: number | null }>;
  const legacyCompanyId = compRows[0]?.legacy_company_id ?? null;

  const accessToken = signAccessToken({
    sub: userId,
    role: membership.role_name,
    companyId: targetCompanyId,
    legacyCompanyId,
  });

  return ok(
    res,
    { activeCompanyId: targetCompanyId, legacyCompanyId, accessToken },
    "Switched organisation successfully.",
  );
};

export const getCompanyById = async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const companyId = req.params.id;

  const membership = await getCompanyMembership(userId, companyId);
  if (!membership || membership.status !== "active") {
    return fail(res, 403, "ACCESS_DENIED", "You do not have access to this company.");
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT
      c.*,
      sp.name AS plan_name
    FROM companies c
    INNER JOIN subscription_plans sp ON sp.id = c.plan_id
    WHERE c.id = $1 AND c.deleted_at IS NULL
    LIMIT 1`,
    companyId,
  )) as CompanyRow[];

  const company = rows[0];
  if (!company) {
    return fail(res, 404, "COMPANY_NOT_FOUND", "Company not found.");
  }

  return ok(res, {
    id: company.id,
    name: company.name,
    legalName: company.legal_name,
    registrationNumber: company.registration_number,
    taxId: company.tax_id,
    currencyCode: company.currency_code,
    fiscalYearStart: company.fiscal_year_start,
    countryCode: company.country_code,
    timezone: company.timezone,
    logoUrl: company.logo_url,
    status: company.status,
    trialEndsAt: company.trial_ends_at,
    planName: company.plan_name,
    ownerId: company.owner_id,
    legacyCompanyId: company.legacy_company_id,
  });
};

export const updateCompany = async (req: Request, res: Response) => {
  const companyId = req.params.id;
  if (req.companyContext?.company.id !== companyId) {
    return fail(res, 403, "ACCESS_DENIED", "Your selected company does not match this request.");
  }

  const allowedFields = [
    "name",
    "legalName",
    "registrationNumber",
    "taxId",
    "currencyCode",
    "fiscalYearStart",
    "countryCode",
    "timezone",
    "logoUrl",
  ] as const;
  const updates = Object.fromEntries(
    allowedFields
      .filter((field) => req.body?.[field] !== undefined)
      .map((field) => [field, req.body[field]]),
  );

  if (!Object.keys(updates).length) {
    return fail(res, 400, "NO_CHANGES", "No changes were submitted.");
  }

  await prisma.$executeRawUnsafe(
    `UPDATE companies
      SET
        name = COALESCE($1, name),
        legal_name = COALESCE($2, legal_name),
        registration_number = COALESCE($3, registration_number),
        tax_id = COALESCE($4, tax_id),
        currency_code = COALESCE($5, currency_code),
        fiscal_year_start = COALESCE($6, fiscal_year_start),
        country_code = COALESCE($7, country_code),
        timezone = COALESCE($8, timezone),
        logo_url = COALESCE($9, logo_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10`,
    updates.name ?? null,
    updates.legalName ?? null,
    updates.registrationNumber ?? null,
    updates.taxId ?? null,
    updates.currencyCode ? String(updates.currencyCode).toUpperCase() : null,
    updates.fiscalYearStart ?? null,
    updates.countryCode ? String(updates.countryCode).toUpperCase() : null,
    updates.timezone ?? null,
    updates.logoUrl ?? null,
    companyId,
  );

  await writeAuditLog({
    req,
    action: "company.updated",
    entityType: "company",
    entityId: companyId,
    companyId,
    oldValues: null,
    newValues: updates,
  });

  return ok(res, true, "Company updated.");
};

export const inviteMember = async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const companyId = req.params.id;

  if (req.companyContext?.company.id !== companyId) {
    return fail(res, 403, "ACCESS_DENIED", "Your selected company does not match this request.");
  }

  const inviteLimit = consumeRateLimit(`invite:${companyId}`, 20, 60 * 60 * 1000);
  if (!inviteLimit.allowed) {
    return fail(res, 429, "RATE_LIMITED", "Too many invites sent. Please try again later.");
  }

  const parsed = inviteMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Please check invite details.", parsed.error.issues);
  }

  const email = normalizeEmail(parsed.data.email);
  const roleRows = (await prisma.$queryRawUnsafe(
    `SELECT id, name FROM roles WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    parsed.data.roleId,
  )) as Array<{ id: string; name: string }>;
  if (!roleRows[0]) {
    return fail(res, 404, "ROLE_NOT_FOUND", "Selected role was not found.");
  }

  let userRows = (await prisma.$queryRawUnsafe(
    `SELECT id, email FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
    email,
  )) as Array<{ id: string; email: string }>;

  if (!userRows[0]) {
    const tempPassword = await hashPassword(crypto.randomBytes(24).toString("hex"));
    const newUserId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO users
      (id, email, password_hash, full_name, is_email_verified, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      newUserId,
      email,
      tempPassword,
      email.split("@")[0] || "New User",
    );
    userRows = [{ id: newUserId, email }];
  }

  const inviteToken = createSignedToken(
    { type: "invite", companyId, email, userId: userRows[0].id },
    "7d",
  );
  const tokenHash = crypto.createHash("sha256").update(inviteToken).digest("hex");

  await prisma.$executeRawUnsafe(
    `INSERT INTO invitations
      (id, company_id, email, role_id, token_hash, expires_at, status, invited_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '7 day', 'pending', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    crypto.randomUUID(),
    companyId,
    email,
    parsed.data.roleId,
    tokenHash,
    userId,
  );

  const existingMembership = (await prisma.$queryRawUnsafe(
    `SELECT id, status FROM user_company_memberships
      WHERE user_id = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1`,
    userRows[0].id,
    companyId,
  )) as Array<{ id: string; status: string }>;

  if (existingMembership[0]) {
    await prisma.$executeRawUnsafe(
      `UPDATE user_company_memberships
      SET role_id = $1, invited_by = $2, invitation_token = $3, invitation_expires_at = CURRENT_TIMESTAMP + INTERVAL '7 day',
          status = 'pending', updated_at = CURRENT_TIMESTAMP
      WHERE id = $4`,
      parsed.data.roleId,
      userId,
      inviteToken,
      existingMembership[0].id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_company_memberships
        (id, user_id, company_id, role_id, invited_by, invitation_token, invitation_expires_at, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP + INTERVAL '7 day', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      crypto.randomUUID(),
      userRows[0].id,
      companyId,
      parsed.data.roleId,
      userId,
      inviteToken,
    );
  }

  await invalidateCompanyPermissionCache(companyId);

  const inviteLink = `${process.env.FRONTEND_APP_URL ?? "http://localhost:5173"}/invitations/accept?token=${inviteToken}`;

  await writeAuditLog({
    req,
    action: "membership.invited",
    entityType: "membership",
    companyId,
    userId,
    newValues: { email, roleId: parsed.data.roleId },
  });

  return ok(res, { inviteLinkPreview: inviteLink }, "Invitation sent.");
};

export const acceptInvitation = async (req: Request, res: Response) => {
  if (!req.auth?.userId && req.headers.authorization?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(req.headers.authorization.slice(7));
      req.auth = {
        userId: payload.sub,
        companyId: payload.companyId ?? null,
        legacyCompanyId: payload.legacyCompanyId ?? null,
        role: payload.role,
      };
    } catch {
      // ignore invalid token and continue as unauthenticated
    }
  }

  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    return fail(res, 400, "TOKEN_REQUIRED", "Invitation link is invalid.");
  }

  let payload: { type: string; companyId: string; email: string; userId: string };
  try {
    payload = verifySignedToken<typeof payload>(token);
    if (!payload || payload.type !== "invite") throw new Error("invalid");
  } catch {
    return fail(res, 400, "TOKEN_INVALID", "Invitation link is invalid.");
  }

  const membershipRows = (await prisma.$queryRawUnsafe(
    `SELECT m.id, m.user_id, m.company_id, m.status, m.invitation_expires_at, u.email
      FROM user_company_memberships m
      INNER JOIN users u ON u.id = m.user_id
      WHERE m.invitation_token = $1 AND m.deleted_at IS NULL
      LIMIT 1`,
    token,
  )) as Array<{
    id: string;
    user_id: string;
    company_id: string;
    status: string;
    invitation_expires_at: string | null;
    email: string;
  }>;

  const membership = membershipRows[0];
  if (!membership) {
    return fail(res, 404, "INVITE_NOT_FOUND", "Invitation not found.");
  }

  if (membership.invitation_expires_at && new Date(membership.invitation_expires_at).getTime() < Date.now()) {
    return fail(res, 400, "INVITE_EXPIRED", "Invitation expired. Ask your admin for a new invite.");
  }

  if (!req.auth?.userId) {
    return ok(res, {
      requiresAuth: true,
      email: membership.email,
      companyId: membership.company_id,
    });
  }

  const currentUserRows = (await prisma.$queryRawUnsafe(
    `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
    req.auth.userId,
  )) as Array<{ id: string; email: string }>;

  const currentUser = currentUserRows[0];
  if (!currentUser) {
    return fail(res, 401, "UNAUTHORIZED", "Please sign in to continue.");
  }

  if (currentUser.email !== membership.email) {
    return fail(
      res,
      409,
      "ACCOUNT_MISMATCH",
      `This invite is for ${membership.email}. Please switch account to continue.`,
    );
  }

  await prisma.$executeRawUnsafe(
    `UPDATE user_company_memberships
      SET status = 'active', joined_at = CURRENT_TIMESTAMP, invitation_token = NULL, invitation_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    membership.id,
  );

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.$executeRawUnsafe(
    `UPDATE invitations
      SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1`,
    tokenHash,
  );

  await prisma.$executeRawUnsafe(
    `UPDATE users SET last_active_org_id = $1 WHERE id = $2`,
    membership.company_id,
    currentUser.id,
  );

  invalidatePermissionCache(currentUser.id, membership.company_id);

  await writeAuditLog({
    req,
    action: "membership.accepted",
    entityType: "membership",
    entityId: membership.id,
    companyId: membership.company_id,
    userId: currentUser.id,
  });

  return ok(res, { companyId: membership.company_id }, "Invitation accepted.");
};

export const listMembers = async (req: Request, res: Response) => {
  const companyId = req.params.id;
  if (req.companyContext?.company.id !== companyId) {
    return fail(res, 403, "ACCESS_DENIED", "Your selected company does not match this request.");
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT
      u.id AS user_id,
      u.email,
      u.full_name,
      r.id AS role_id,
      r.name AS role_name,
      m.status,
      m.joined_at
    FROM user_company_memberships m
    INNER JOIN users u ON u.id = m.user_id
    INNER JOIN roles r ON r.id = m.role_id
    WHERE m.company_id = $1 AND m.deleted_at IS NULL
    ORDER BY m.created_at ASC`,
    companyId,
  )) as Array<{
    user_id: string;
    email: string;
    full_name: string;
    role_id: string;
    role_name: string;
    status: string;
    joined_at: string | null;
  }>;

  return ok(
    res,
    rows.map((row) => ({
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      roleId: row.role_id,
      role: row.role_name,
      status: row.status,
      joinedAt: row.joined_at,
    })),
  );
};

export const updateMemberRole = async (req: Request, res: Response) => {
  const companyId = req.params.id;
  const targetUserId = req.params.userId;
  if (req.companyContext?.company.id !== companyId) {
    return fail(res, 403, "ACCESS_DENIED", "Your selected company does not match this request.");
  }

  const parsed = updateMemberRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Please choose a role.");
  }

  const existingRows = (await prisma.$queryRawUnsafe(
    `SELECT m.id, r.name AS role_name
      FROM user_company_memberships m
      INNER JOIN roles r ON r.id = m.role_id
      WHERE m.company_id = $1 AND m.user_id = $2 AND m.deleted_at IS NULL
      LIMIT 1`,
    companyId,
    targetUserId,
  )) as Array<{ id: string; role_name: string }>;

  const existing = existingRows[0];
  if (!existing) {
    return fail(res, 404, "MEMBER_NOT_FOUND", "Member not found.");
  }

  if (existing.role_name === "owner") {
    return fail(res, 409, "OWNER_PROTECTED", "Owner role cannot be changed without ownership transfer.");
  }

  await prisma.$executeRawUnsafe(
    `UPDATE user_company_memberships
      SET role_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
    parsed.data.roleId,
    existing.id,
  );

  invalidatePermissionCache(targetUserId, companyId);

  await writeAuditLog({
    req,
    action: "membership.role_updated",
    entityType: "membership",
    entityId: existing.id,
    companyId,
    oldValues: { role: existing.role_name },
    newValues: { roleId: parsed.data.roleId },
  });

  return ok(res, true, "Role updated.");
};

export const revokeMember = async (req: Request, res: Response) => {
  const companyId = req.params.id;
  const targetUserId = req.params.userId;
  if (req.companyContext?.company.id !== companyId) {
    return fail(res, 403, "ACCESS_DENIED", "Your selected company does not match this request.");
  }

  const existingRows = (await prisma.$queryRawUnsafe(
    `SELECT m.id, r.name AS role_name
      FROM user_company_memberships m
      INNER JOIN roles r ON r.id = m.role_id
      WHERE m.company_id = $1 AND m.user_id = $2 AND m.deleted_at IS NULL
      LIMIT 1`,
    companyId,
    targetUserId,
  )) as Array<{ id: string; role_name: string }>;

  const existing = existingRows[0];
  if (!existing) {
    return fail(res, 404, "MEMBER_NOT_FOUND", "Member not found.");
  }

  if (existing.role_name === "owner") {
    return fail(res, 409, "OWNER_PROTECTED", "Owner cannot be removed without ownership transfer.");
  }

  await prisma.$executeRawUnsafe(
    `UPDATE user_company_memberships
      SET status = 'revoked', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    existing.id,
  );

  invalidatePermissionCache(targetUserId, companyId);

  await writeAuditLog({
    req,
    action: "membership.revoked",
    entityType: "membership",
    entityId: existing.id,
    companyId,
    userId: req.auth?.userId ? String(req.auth.userId) : null,
  });

  return ok(res, true, "Member removed.");
};

export const listRoles = async (req: Request, res: Response) => {
  const companyId = req.params.id;
  if (req.companyContext?.company.id !== companyId) {
    return fail(res, 403, "ACCESS_DENIED", "Your selected company does not match this request.");
  }

  const roles = (await prisma.$queryRawUnsafe(
    `SELECT id, company_id, name, is_system_role, description
      FROM roles
      WHERE deleted_at IS NULL AND (company_id IS NULL OR company_id = $1)
      ORDER BY is_system_role DESC, name ASC`,
    companyId,
  )) as Array<{
    id: string;
    company_id: string | null;
    name: string;
    is_system_role: number;
    description: string;
  }>;

  const rolePermissions = (await prisma.$queryRawUnsafe(
    `SELECT rp.role_id, p.code
      FROM role_permissions rp
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.deleted_at IS NULL AND p.deleted_at IS NULL`,
  )) as Array<{ role_id: string; code: string }>;

  const byRole = new Map<string, string[]>();
  rolePermissions.forEach((row) => {
    byRole.set(row.role_id, [...(byRole.get(row.role_id) ?? []), row.code]);
  });

  return ok(
    res,
    roles.map((role) => ({
      id: role.id,
      name: role.name,
      isSystemRole: Boolean(role.is_system_role),
      description: role.description,
      permissions: byRole.get(role.id) ?? [],
    })),
  );
};

export const createRole = async (req: Request, res: Response) => {
  const companyId = req.params.id;
  if (req.companyContext?.company.id !== companyId) {
    return fail(res, 403, "ACCESS_DENIED", "Your selected company does not match this request.");
  }

  const parsed = createRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Please check role details.", parsed.error.issues);
  }

  const roleId = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO roles
      (id, company_id, name, is_system_role, description, created_at, updated_at)
      VALUES ($1, $2, $3, false, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    roleId,
    companyId,
    parsed.data.name.toLowerCase(),
    parsed.data.description,
  );

  for (const code of parsed.data.permissionCodes) {
    const permissionRows = (await prisma.$queryRawUnsafe(
      `SELECT id FROM permissions WHERE code = $1 AND deleted_at IS NULL LIMIT 1`,
      code,
    )) as Array<{ id: string }>;
    if (!permissionRows[0]) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO role_permissions
        (role_id, permission_id, created_at, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (role_id, permission_id) DO NOTHING`,
      roleId,
      permissionRows[0].id,
    );
  }

  await writeAuditLog({
    req,
    action: "role.created",
    entityType: "role",
    entityId: roleId,
    companyId,
    newValues: parsed.data,
  });

  return created(res, { id: roleId }, "Role created.");
};

export const updateRole = async (req: Request, res: Response) => {
  const companyId = req.params.id;
  const roleId = req.params.roleId;
  if (req.companyContext?.company.id !== companyId) {
    return fail(res, 403, "ACCESS_DENIED", "Your selected company does not match this request.");
  }

  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Please check role details.", parsed.error.issues);
  }

  const roleRows = (await prisma.$queryRawUnsafe(
    `SELECT id, is_system_role FROM roles WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    roleId,
  )) as Array<{ id: string; is_system_role: number }>;

  const role = roleRows[0];
  if (!role) {
    return fail(res, 404, "ROLE_NOT_FOUND", "Role not found.");
  }
  if (role.is_system_role) {
    return fail(res, 409, "SYSTEM_ROLE_LOCKED", "System roles cannot be edited.");
  }

  await prisma.$executeRawUnsafe(
    `UPDATE roles SET description = COALESCE($1, description), updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    parsed.data.description ?? null,
    roleId,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE role_permissions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE role_id = $1`,
    roleId,
  );

  for (const code of parsed.data.permissionCodes) {
    const permissionRows = (await prisma.$queryRawUnsafe(
      `SELECT id FROM permissions WHERE code = $1 AND deleted_at IS NULL LIMIT 1`,
      code,
    )) as Array<{ id: string }>;
    if (!permissionRows[0]) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO role_permissions
        (role_id, permission_id, created_at, updated_at, deleted_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
        ON CONFLICT (role_id, permission_id) DO UPDATE SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP`,
      roleId,
      permissionRows[0].id,
    );
  }

  await invalidateCompanyPermissionCache(companyId);

  await writeAuditLog({
    req,
    action: "role.updated",
    entityType: "role",
    entityId: roleId,
    companyId,
    newValues: parsed.data,
  });

  return ok(res, true, "Role updated.");
};

export const requestOwnershipTransfer = async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const companyId = req.params.id;

  const membership = await getCompanyMembership(userId, companyId);
  if (!membership || membership.role_name !== "owner") {
    return fail(res, 403, "OWNER_ONLY", "Only the company owner can initiate a transfer.");
  }

  const parsed = requestOwnershipTransferSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Please select a target user.", parsed.error.issues);
  }

  const targetUserId = parsed.data.targetUserId;
  if (targetUserId === userId) {
    return fail(res, 400, "INVALID_TARGET", "You are already the owner.");
  }

  const targetMembership = await getCompanyMembership(targetUserId, companyId);
  if (!targetMembership || targetMembership.status !== "active") {
    return fail(res, 400, "TARGET_NOT_MEMBER", "The target user must be an active member of the company.");
  }

  const transferToken = createSignedToken(
    { type: "ownership_transfer", companyId, fromUserId: userId, toUserId: targetUserId },
    "1h",
  );

  const transferLink = `${process.env.FRONTEND_APP_URL ?? "http://localhost:5173"}/settings/team/transfer/confirm?token=${transferToken}`;

  await writeAuditLog({
    req,
    action: "company.ownership_transfer_initiated",
    entityType: "company",
    entityId: companyId,
    companyId,
    userId,
    newValues: { targetUserId },
  });

  return ok(res, { transferLinkPreview: transferLink }, "Transfer initiated. Please provide the confirmation link to the target user.");
};

export const confirmOwnershipTransfer = async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    return fail(res, 400, "TOKEN_REQUIRED", "Transfer link is invalid.");
  }

  let payload: { type: string; companyId: string; fromUserId: string; toUserId: string };
  try {
    payload = verifySignedToken<typeof payload>(token);
    if (!payload || payload.type !== "ownership_transfer") throw new Error("invalid");
  } catch {
    return fail(res, 400, "TOKEN_INVALID", "Transfer link is invalid or expired.");
  }

  const targetUserId = requireUser(req, res);
  if (!targetUserId) return;

  if (targetUserId !== payload.toUserId) {
    return fail(res, 403, "USER_MISMATCH", "This transfer link was intended for another user.");
  }

  const ownerRoleId = await getSystemRoleId("owner");
  const adminRoleId = await getSystemRoleId("admin");

  if (!ownerRoleId || !adminRoleId) {
    return fail(res, 500, "SYSTEM_ERROR", "Required system roles are missing.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update Company Owner
      await tx.$executeRawUnsafe(
        `UPDATE companies SET owner_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        targetUserId,
        payload.companyId,
      );

      // 2. Demote current owner to admin
      await tx.$executeRawUnsafe(
        `UPDATE user_company_memberships SET role_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE company_id = $2 AND user_id = $3 AND deleted_at IS NULL`,
        adminRoleId,
        payload.companyId,
        payload.fromUserId,
      );

      // 3. Promote target user to owner
      await tx.$executeRawUnsafe(
        `UPDATE user_company_memberships SET role_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE company_id = $2 AND user_id = $3 AND deleted_at IS NULL`,
        ownerRoleId,
        payload.companyId,
        targetUserId,
      );
    });

    invalidatePermissionCache(payload.fromUserId, payload.companyId);
    invalidatePermissionCache(targetUserId, payload.companyId);

    await writeAuditLog({
      req,
      action: "company.ownership_transferred",
      entityType: "company",
      entityId: payload.companyId,
      companyId: payload.companyId,
      userId: targetUserId,
      oldValues: { previousOwnerId: payload.fromUserId },
      newValues: { newOwnerId: targetUserId },
    });

    return ok(res, true, "Ownership transferred successfully. You are now the owner of this company.");
  } catch (error) {
    console.error(error);
    return fail(res, 500, "TRANSFER_FAILED", "Unable to complete ownership transfer.");
  }
};
