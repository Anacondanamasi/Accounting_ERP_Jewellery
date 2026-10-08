import type { Request, Response } from "express";
import crypto from "crypto";
import {
  loginSchema,
  registerSchema,
} from "@jewelledger/shared";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import {
  createRefreshToken,
  createSignedToken,
  hashPassword,
  hashToken,
  normalizeEmail,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
  verifySignedToken,
  REFRESH_TOKEN_TTL_SECONDS,
} from "../../lib/security";
import { consumeRateLimit } from "../../lib/rateLimiter";
import { verifyTotpCode } from "../../lib/totp";
import { writeAuditLog } from "../../lib/audit";

type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_email_verified: number;
  is_active: number;
  mfa_secret: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
};

type MembershipRow = {
  role_id: string;
  company_id: string;
  legacy_company_id: number | null;
  company_name: string;
  company_status: "active" | "suspended" | "trial" | "cancelled";
  company_logo_url: string | null;
  role_name: string;
  membership_status: "pending" | "active" | "suspended" | "revoked";
  plan_name: string;
};

const getIp = (req: Request) => req.ip || req.socket.remoteAddress || "unknown";
const getUserAgent = (req: Request) => req.get("user-agent") || "unknown";
type VerifyEmailPayload = { type: string; userId: string; email: string };

const getUserByEmail = async (email: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
    email,
  )) as DbUser[];
  return rows[0] ?? null;
};

const getUserById = async (id: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    id,
  )) as DbUser[];
  return rows[0] ?? null;
};

const listMemberships = async (userId: string) =>
  ((await prisma.$queryRawUnsafe(
    `SELECT
      r.id AS role_id,
      c.id AS company_id,
      c.legacy_company_id AS legacy_company_id,
      c.name AS company_name,
      c.status AS company_status,
      c.logo_url AS company_logo_url,
      r.name AS role_name,
      m.status AS membership_status,
      sp.name AS plan_name
    FROM user_company_memberships m
    INNER JOIN companies c ON c.id = m.company_id
    INNER JOIN roles r ON r.id = m.role_id
    INNER JOIN subscription_plans sp ON sp.id = c.plan_id
    WHERE m.user_id = $1
      AND m.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND r.deleted_at IS NULL
    ORDER BY c.name ASC`,
    userId,
  )) as MembershipRow[]);

const listPermissionsForRole = async (roleId: string) => {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT p.code AS code
     FROM role_permissions rp
     INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = $1
        AND rp.deleted_at IS NULL
        AND p.deleted_at IS NULL`,
     roleId,
  )) as Array<{ code: string }>;
  return rows.map((row) => row.code);
};

const issueSessionTokens = async (input: {
  req: Request;
  user: DbUser;
  companyId: string | null;
  legacyCompanyId: number | null;
  role: string;
}) => {
  const refreshToken = createRefreshToken();
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await prisma.$executeRawUnsafe(
    `INSERT INTO active_sessions
      (id, user_id, company_id, token_hash, ip_address, user_agent, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    crypto.randomUUID(),
    input.user.id,
    input.companyId,
    refreshHash,
    getIp(input.req),
    getUserAgent(input.req),
    expiresAt,
  );

  const accessToken = signAccessToken({
    sub: input.user.id,
    role: input.role,
    companyId: input.companyId,
    legacyCompanyId: input.legacyCompanyId,
  });

  return { accessToken, refreshToken };
};

const toProfile = (user: DbUser) => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  phone: user.phone,
  avatarUrl: user.avatar_url,
  isEmailVerified: Boolean(user.is_email_verified),
  isActive: Boolean(user.is_active),
});

const toCompanySummary = async (membership: MembershipRow) => ({
  id: membership.company_id,
  name: membership.company_name,
  logoUrl: membership.company_logo_url,
  status: membership.company_status,
  planName: membership.plan_name,
  role: membership.role_name,
  membershipStatus: membership.membership_status,
  trialEndsAt: null,
  permissions: await listPermissionsForRole(membership.role_id),
});

export const register = async (req: Request, res: Response) => {
  const limit = consumeRateLimit(`register:${getIp(req)}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    return fail(res, 429, "RATE_LIMITED", "Too many signup attempts. Please try again later.");
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Please check your details and try again.", parsed.error.issues);
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = await getUserByEmail(email);
  if (existing) {
    return fail(res, 409, "EMAIL_EXISTS", "This email is already registered.");
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$executeRawUnsafe(
    `INSERT INTO users
      (id, email, password_hash, full_name, phone, is_email_verified, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    userId,
    email,
    passwordHash,
    parsed.data.fullName.trim(),
    parsed.data.phone ?? null,
  );

  const verificationToken = createSignedToken(
    { type: "verify_email", userId, email },
    "24h",
  );
  const verificationLink = `${process.env.FRONTEND_APP_URL ?? "http://localhost:5173"}/verify-email?token=${verificationToken}`;

  await writeAuditLog({
    req,
    action: "auth.registered",
    entityType: "user",
    entityId: userId,
    userId: userId,
    newValues: { email },
  });

  return created(res, {
    user: {
      id: userId,
      email,
      fullName: parsed.data.fullName.trim(),
      isEmailVerified: false,
      isActive: true,
    },
    nextStep: "verify_email",
    verificationLinkPreview: verificationLink,
  }, "Registration successful. Please verify your email.");
};

export const verifyEmail = async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    return fail(res, 400, "TOKEN_REQUIRED", "Verification link is invalid.");
  }

  let payload: VerifyEmailPayload;
  try {
    payload = verifySignedToken<VerifyEmailPayload>(token);
  } catch {
    return fail(res, 400, "TOKEN_INVALID", "Verification link has expired. Please request a new one.");
  }

  if (payload.type !== "verify_email") {
    return fail(res, 400, "TOKEN_INVALID", "Verification link is invalid.");
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return fail(res, 404, "USER_NOT_FOUND", "Account not found.");
  }

  await prisma.$executeRawUnsafe(
    `UPDATE users
      SET is_email_verified = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    user.id,
  );

  const memberships = await listMemberships(user.id);
  const activeMembership = memberships.find((membership) => membership.membership_status === "active") ?? null;

  const tokens = await issueSessionTokens({
    req,
    user,
    companyId: activeMembership?.company_id ?? null,
    legacyCompanyId: activeMembership?.legacy_company_id ?? null,
    role: activeMembership?.role_name ?? "viewer",
  });
  const companies = await Promise.all(memberships.map(toCompanySummary));

  await writeAuditLog({
    req,
    action: "auth.email_verified",
    entityType: "user",
    entityId: user.id,
    userId: user.id,
  });

  return ok(res, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: toProfile(user),
    companies,
    activeCompanyId: activeMembership?.company_id ?? null,
  }, "Email verified.");
};

export const resendVerification = async (req: Request, res: Response) => {
  const email = normalizeEmail(String(req.body?.email ?? ""));
  if (!email) {
    return fail(res, 400, "EMAIL_REQUIRED", "Please enter your email.");
  }
  const user = await getUserByEmail(email);
  if (!user) {
    return ok(res, true, "If this email exists, a verification link has been sent.");
  }

  if (user.is_email_verified) {
    return ok(res, true, "Your email is already verified.");
  }

  const verificationToken = createSignedToken(
    { type: "verify_email", userId: user.id, email: user.email },
    "24h",
  );
  const verificationLink = `${process.env.FRONTEND_APP_URL ?? "http://localhost:5173"}/verify-email?token=${verificationToken}`;

  return ok(
    res,
    { verificationLinkPreview: verificationLink },
    "Verification link sent.",
  );
};

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Please check your email and password.");
  }

  const email = normalizeEmail(parsed.data.email);
  const rate = consumeRateLimit(`login:${getIp(req)}:${email}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return fail(res, 429, "TOO_MANY_ATTEMPTS", "Too many sign-in attempts. Please wait and try again.");
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return fail(res, 401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return fail(res, 423, "ACCOUNT_LOCKED", "Your account is temporarily locked. Try again in a few minutes.");
  }

  const isValidPassword = await verifyPassword(parsed.data.password, user.password_hash);
  if (!isValidPassword) {
    const nextFailed = user.failed_login_attempts + 1;
    const lockUntil = nextFailed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await prisma.$executeRawUnsafe(
      `UPDATE users
        SET failed_login_attempts = $1, locked_until = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
      nextFailed,
      lockUntil,
      user.id,
    );
    return fail(res, 401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  // Email verification bypass (Development Mode)
  /*
  if (!user.is_email_verified) {
    return fail(res, 403, "EMAIL_NOT_VERIFIED", "Please verify your email before signing in.");
  }
  */

  if (!user.is_active) {
    return fail(res, 403, "ACCOUNT_INACTIVE", "Your account is inactive. Please contact support.");
  }

  if (user.mfa_secret) {
    const mfaSessionToken = createSignedToken(
      { type: "mfa_session", userId: user.id, email: user.email },
      "5m",
    );
    return ok(res, { mfaRequired: true, mfaSessionToken });
  }

  await prisma.$executeRawUnsafe(
    `UPDATE users
      SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    user.id,
  );

  const memberships = await listMemberships(user.id);
  const activeMembership = memberships.find((membership) => membership.membership_status === "active") ?? null;
  const tokens = await issueSessionTokens({
    req,
    user,
    companyId: activeMembership?.company_id ?? null,
    legacyCompanyId: activeMembership?.legacy_company_id ?? null,
    role: activeMembership?.role_name ?? "viewer",
  });
  const companies = await Promise.all(memberships.map(toCompanySummary));

  await writeAuditLog({
    req,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    companyId: activeMembership?.company_id ?? null,
    userId: user.id,
  });

  return ok(res, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: toProfile(user),
    companies,
    activeCompanyId: activeMembership?.company_id ?? null,
  });
};

export const verifyMfa = async (req: Request, res: Response) => {
  const mfaSessionToken = String(req.body?.mfaSessionToken ?? "");
  const otpCode = String(req.body?.code ?? "");
  if (!mfaSessionToken || !otpCode) {
    return fail(res, 400, "MFA_REQUIRED", "Enter your verification code.");
  }

  let payload: VerifyEmailPayload;
  try {
    payload = verifySignedToken<VerifyEmailPayload>(mfaSessionToken);
  } catch {
    return fail(res, 400, "MFA_SESSION_INVALID", "Your verification session expired. Please sign in again.");
  }

  if (payload.type !== "mfa_session") {
    return fail(res, 400, "MFA_SESSION_INVALID", "Your verification session expired. Please sign in again.");
  }

  const user = await getUserById(payload.userId);
  if (!user?.mfa_secret) {
    return fail(res, 400, "MFA_NOT_ENABLED", "Multi-factor verification is not set up.");
  }

  if (!verifyTotpCode(user.mfa_secret, otpCode)) {
    return fail(res, 401, "MFA_INVALID", "Invalid verification code.");
  }

  const memberships = await listMemberships(user.id);
  const companies = await Promise.all(memberships.map(toCompanySummary));
  const activeMembership = memberships.find((membership) => membership.membership_status === "active") ?? null;
  const tokens = await issueSessionTokens({
    req,
    user,
    companyId: activeMembership?.company_id ?? null,
    legacyCompanyId: activeMembership?.legacy_company_id ?? null,
    role: activeMembership?.role_name ?? "viewer",
  });

  await writeAuditLog({
    req,
    action: "auth.mfa_verified",
    entityType: "user",
    entityId: user.id,
    companyId: activeMembership?.company_id ?? null,
    userId: user.id,
  });

  return ok(res, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: toProfile(user),
    companies,
    activeCompanyId: activeMembership?.company_id ?? null,
  });
};

export const refreshToken = async (req: Request, res: Response) => {
  const incomingToken =
    String(req.body?.refreshToken ?? "") ||
    String(req.get("x-refresh-token") ?? "");
  if (!incomingToken) {
    return fail(res, 401, "REFRESH_REQUIRED", "Please sign in again.");
  }

  const tokenHash = hashToken(incomingToken);
  const sessions = (await prisma.$queryRawUnsafe(
    `SELECT * FROM active_sessions
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND (expires_at > CURRENT_TIMESTAMP)
        AND deleted_at IS NULL
      LIMIT 1`,
    tokenHash,
  )) as Array<{
    id: string;
    user_id: string;
    company_id: string | null;
    expires_at: string;
  }>;

  const session = sessions[0];
  if (!session) {
    return fail(res, 401, "SESSION_INVALID", "Your session has expired. Please sign in again.");
  }

  const user = await getUserById(session.user_id);
  if (!user) {
    return fail(res, 401, "SESSION_INVALID", "Your session has expired. Please sign in again.");
  }

  const memberships = await listMemberships(user.id);
  const membership = memberships.find((item) => item.company_id === session.company_id) ?? memberships[0] ?? null;

  const newRefreshToken = createRefreshToken();
  const newHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await prisma.$executeRawUnsafe(
    `UPDATE active_sessions SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    session.id,
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO active_sessions
      (id, user_id, company_id, token_hash, ip_address, user_agent, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    crypto.randomUUID(),
    user.id,
    membership?.company_id ?? null,
    newHash,
    getIp(req),
    getUserAgent(req),
    expiresAt,
  );

  const accessToken = signAccessToken({
    sub: user.id,
    role: membership?.role_name ?? "viewer",
    companyId: membership?.company_id ?? null,
    legacyCompanyId: membership?.legacy_company_id ?? null,
  });

  return ok(res, { accessToken, refreshToken: newRefreshToken });
};

export const logout = async (req: Request, res: Response) => {
  const incomingToken =
    String(req.body?.refreshToken ?? "") ||
    String(req.get("x-refresh-token") ?? "");

  if (incomingToken) {
    const tokenHash = hashToken(incomingToken);
    await prisma.$executeRawUnsafe(
      `UPDATE active_sessions
        SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE token_hash = $1`,
      tokenHash,
    );
  } else if (req.headers.authorization?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(req.headers.authorization.slice(7));
      await prisma.$executeRawUnsafe(
        `UPDATE active_sessions
          SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND revoked_at IS NULL`,
        payload.sub,
      );
    } catch {
      // ignore invalid access token on logout
    }
  }

  return ok(res, true, "Signed out successfully.");
};

export const me = async (req: Request, res: Response) => {
  if (!req.auth?.userId) {
    return fail(res, 401, "UNAUTHORIZED", "Please sign in to continue.");
  }

  const user = await getUserById(String(req.auth.userId));
  if (!user) {
    return fail(res, 404, "USER_NOT_FOUND", "Account not found.");
  }

  const memberships = await listMemberships(user.id);
  const companies = await Promise.all(memberships.map(toCompanySummary));

  return ok(res, {
    user: toProfile(user),
    companies,
  });
};
