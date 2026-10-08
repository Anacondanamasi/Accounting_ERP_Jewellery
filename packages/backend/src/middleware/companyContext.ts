import type { NextFunction, Request, Response } from "express";
import { fail } from "../lib/apiResponse";
import { prisma } from "../lib/prisma";
import {
  getCachedPermissions,
  setCachedPermissions,
} from "../lib/permissionCache";

type MembershipRow = {
  membership_id: string;
  membership_status: "pending" | "active" | "suspended" | "revoked";
  role_id: string;
  role_name: string;
  is_system_role: number;
  company_id: string;
  company_name: string;
  company_status: "active" | "suspended" | "trial" | "cancelled";
  legacy_company_id: number | null;
};

const readOnlyMethod = (method: string) =>
  method === "GET" || method === "HEAD" || method === "OPTIONS";

export const requireCompanyContext = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth?.userId) {
    return fail(res, 401, "UNAUTHORIZED", "Please sign in to continue.");
  }

  const companyIdHeader = req.get("x-company-id");
  const companyIdQuery = typeof req.query.companyId === "string" ? req.query.companyId : null;
  const companyId = companyIdHeader ?? companyIdQuery;

  if (!companyId) {
    return fail(res, 403, "COMPANY_REQUIRED", "Please choose a company to continue.");
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT 
      m.id AS membership_id,
      m.status AS membership_status,
      r.id AS role_id,
      r.name AS role_name,
      r.is_system_role AS is_system_role,
      c.id AS company_id,
      c.name AS company_name,
      c.status AS company_status,
      c.legacy_company_id AS legacy_company_id
    FROM user_company_memberships m
    INNER JOIN companies c ON c.id = m.company_id
    INNER JOIN roles r ON r.id = m.role_id
    WHERE m.user_id = $1
      AND m.company_id = $2
      AND m.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND r.deleted_at IS NULL
    LIMIT 1`,
    String(req.auth.userId),
    companyId,
  )) as MembershipRow[];

  const membership = rows[0];
  if (!membership || membership.membership_status !== "active") {
    return fail(res, 403, "ACCESS_DENIED", "You do not have access to this company.");
  }

  if (membership.company_status !== "active" && membership.company_status !== "trial" && membership.company_status !== "suspended") {
    return fail(res, 403, "COMPANY_UNAVAILABLE", "This company is not available right now.");
  }

  if (membership.company_status === "suspended" && !readOnlyMethod(req.method)) {
    return fail(res, 403, "COMPANY_SUSPENDED", "This company is suspended. Contact support to restore write access.");
  }

  const authUserId = String(req.auth.userId);
  let permissions = getCachedPermissions(authUserId, companyId);
  if (!permissions) {
    const permissionRows = (await prisma.$queryRawUnsafe(
      `SELECT p.code AS code
      FROM role_permissions rp
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = $1
        AND rp.deleted_at IS NULL
        AND p.deleted_at IS NULL`,
      membership.role_id,
    )) as Array<{ code: string }>;
    permissions = permissionRows.map((row) => row.code);
    setCachedPermissions(authUserId, companyId, permissions);
  }

  req.companyContext = {
    company: {
      id: membership.company_id,
      name: membership.company_name,
      status: membership.company_status,
      legacyCompanyId: membership.legacy_company_id ?? null,
    },
    membership: {
      id: membership.membership_id,
      status: membership.membership_status,
    },
    role: {
      id: membership.role_id,
      name: membership.role_name,
      isSystemRole: Boolean(membership.is_system_role),
    },
    permissions,
  };

  req.auth.companyId = membership.legacy_company_id ?? null;
  req.auth.legacyCompanyId = membership.legacy_company_id ?? null;
  req.auth.role = membership.role_name;

  return next();
};

export const requirePermission = (code: string) => (req: Request, res: Response, next: NextFunction) => {
  const permissions = req.companyContext?.permissions ?? [];
  if (!permissions.includes(code)) {
    return fail(
      res,
      403,
      "PERMISSION_REQUIRED",
      `You don't have permission: ${code} in company [${req.companyContext?.company.name ?? "Unknown"}]`,
    );
  }
  return next();
};
