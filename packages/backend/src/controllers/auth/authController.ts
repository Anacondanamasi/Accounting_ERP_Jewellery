import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { loginSchema } from "@jewelledger/shared";
import { env } from "../../lib/env";
import { fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { AuditService } from "../../services/audit/auditService";

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid login request", parsed.error.issues);
  }

  try {
    const { email, password } = parsed.data;
    console.log(`Login attempt for: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      console.log(`User not found: ${email}`);
      return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Password mismatch for: ${email}`);
      await AuditService.recordEvent(prisma, {
        companyId: user.companyId,
        actor: { id: user.id, name: user.fullName || email, role: user.role, type: "USER" },
        eventType: "auth.failed_login",
        entityType: "UserSession",
        entityId: user.id,
        summary: `Failed sign-in attempt for ${email} (incorrect password)`,
        ipAddress: req.ip || req.socket?.remoteAddress || undefined,
        userAgent: req.get("user-agent") || undefined,
      });
      return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (!user.isActive) {
      return fail(res, 403, "ACCOUNT_INACTIVE", "Account is deactivated");
    }

    const accessToken = jwt.sign(
      { sub: user.id, companyId: user.companyId, role: user.role },
      env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    await AuditService.recordEvent(prisma, {
      companyId: user.companyId,
      actor: { id: user.id, name: user.fullName || email, role: user.role, type: "USER" },
      eventType: "auth.login_success",
      entityType: "UserSession",
      entityId: user.id,
      summary: `User ${user.fullName || email} (${user.role}) successfully signed in`,
      ipAddress: req.ip || req.socket?.remoteAddress || undefined,
      userAgent: req.get("user-agent") || undefined,
    });

    return ok(res, {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        companyId: user.companyId,
      },
      companies: [user.company],
    });
  } catch (error) {
    console.error("Login failed while accessing the database", error);
    return fail(res, 503, "DATABASE_UNAVAILABLE", "Database connection unavailable");
  }
};

export const me = async (req: Request, res: Response) => {
  if (!req.auth) return fail(res, 401, "UNAUTHORIZED", "Not authenticated");
  
  const user = await prisma.user.findUnique({
    where: { id: Number(req.auth.userId) },
    include: { company: true }
  });

  if (!user) return fail(res, 404, "USER_NOT_FOUND", "User not found");

  return ok(res, {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
    },
    permissions: ["*"],
    companyId: user.companyId,
  });
};

export const refresh = async (req: Request, res: Response) => {
  if (!req.auth) return fail(res, 401, "UNAUTHORIZED", "Not authenticated");

  const accessToken = jwt.sign(
    { sub: req.auth.userId, companyId: req.auth.companyId, role: req.auth.role },
    env.JWT_SECRET,
    { expiresIn: "1d" },
  );
  return ok(res, { accessToken });
};

export const logout = async (_req: Request, res: Response) => ok(res, true, "Logged out");
export const forgotPassword = async (_req: Request, res: Response) =>
  ok(res, true, "Reset link sent");
export const resetPassword = async (_req: Request, res: Response) =>
  ok(res, true, "Password has been reset");
