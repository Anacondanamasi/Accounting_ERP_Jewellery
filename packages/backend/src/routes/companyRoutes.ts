import { Router } from "express";
import {
  acceptInvitation,
  confirmOwnershipTransfer,
  createCompany,
  createRole,
  getCompanyById,
  inviteMember,
  listCompanies,
  listMembers,
  listRoles,
  requestOwnershipTransfer,
  revokeMember,
  updateCompany,
  updateMemberRole,
  updateRole,
} from "../controllers/company/companyController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireCompanyContext, requirePermission } from "../middleware/companyContext";

export const companyRoutes = Router();
export const invitationRoutes = Router();

companyRoutes.use(authMiddleware);

companyRoutes.post("/companies", createCompany);
companyRoutes.get("/companies", listCompanies);
companyRoutes.get("/companies/:id", getCompanyById);
companyRoutes.patch("/companies/:id", requireCompanyContext, requirePermission("settings.company.update"), updateCompany);

companyRoutes.post(
  "/companies/:id/members/invite",
  requireCompanyContext,
  requirePermission("user_management.invite"),
  inviteMember,
);
companyRoutes.get(
  "/companies/:id/members",
  requireCompanyContext,
  requirePermission("user_management.view"),
  listMembers,
);
companyRoutes.patch(
  "/companies/:id/members/:userId/role",
  requireCompanyContext,
  requirePermission("user_management.manage_roles"),
  updateMemberRole,
);
companyRoutes.delete(
  "/companies/:id/members/:userId",
  requireCompanyContext,
  requirePermission("user_management.remove"),
  revokeMember,
);

companyRoutes.get(
  "/companies/:id/roles",
  requireCompanyContext,
  requirePermission("user_management.view"),
  listRoles,
);
companyRoutes.post(
  "/companies/:id/roles",
  requireCompanyContext,
  requirePermission("user_management.manage_roles"),
  createRole,
);
companyRoutes.patch(
  "/companies/:id/roles/:roleId",
  requireCompanyContext,
  requirePermission("user_management.manage_roles"),
  updateRole,
);

companyRoutes.post(
  "/companies/:id/transfer-ownership",
  requireCompanyContext,
  requestOwnershipTransfer,
);

invitationRoutes.post("/invitations/accept", acceptInvitation);
invitationRoutes.post("/transfer-ownership/confirm", confirmOwnershipTransfer);

