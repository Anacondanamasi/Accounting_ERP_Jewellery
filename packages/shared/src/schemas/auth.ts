import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number");

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: passwordSchema,
  fullName: z.string().min(2, "Please enter your full name"),
  phone: z.string().min(6).max(20).optional().nullable(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  legalName: z.string().max(160).optional().nullable(),
  registrationNumber: z.string().max(64).optional().nullable(),
  taxId: z.string().max(64).optional().nullable(),
  currencyCode: z.string().length(3).default("USD"),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/).default("01-01"),
  countryCode: z.string().length(2),
  timezone: z.string().min(2).max(64),
  industry: z.string().max(80).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
});

export const updateMemberRoleSchema = z.object({
  roleId: z.string().uuid(),
});

export const createRoleSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().min(2).max(240),
  permissionCodes: z.array(z.string().min(3)).min(1),
});

export const updateRoleSchema = z.object({
  description: z.string().min(2).max(240).optional(),
  permissionCodes: z.array(z.string().min(3)).min(1),
});

export const requestOwnershipTransferSchema = z.object({
  targetUserId: z.string().uuid(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type RequestOwnershipTransferInput = z.infer<typeof requestOwnershipTransferSchema>;
