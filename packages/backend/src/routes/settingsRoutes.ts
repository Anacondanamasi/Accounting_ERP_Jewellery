import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/companyContext";
import {
  getAuditLog,
  getCompanySettings,
  getIntegrations,
  getNumberSeries,
  getUsers,
  inviteUser,
  removeUser,
  updateCompanySettings,
  updateIntegration,
  updateNumberSeries,
  updateUserRole,
} from "../controllers/settings/settingsController";
import {
  archiveSettingsCenterRecord,
  getSettingsCenterDefinition,
  getSettingsCenterRecords,
  searchSettingsCenter,
  updateSettingsCenterMeta,
  upsertSettingsCenterRecord,
} from "../controllers/settings/settingsCenterController";

export const settingsRoutes = Router();
settingsRoutes.use(authMiddleware);

settingsRoutes.get("/company", getCompanySettings);
settingsRoutes.put("/company", requirePermission("settings.company.update"), updateCompanySettings);

settingsRoutes.get("/users", getUsers);
settingsRoutes.post("/users/invite", inviteUser);
settingsRoutes.put("/users/:id/role", updateUserRole);
settingsRoutes.delete("/users/:id", removeUser);

settingsRoutes.get("/number-series", getNumberSeries);
settingsRoutes.put("/number-series/:type", updateNumberSeries);

settingsRoutes.get("/audit-log", getAuditLog);

settingsRoutes.get("/integrations", getIntegrations);
settingsRoutes.put("/integrations/:key", updateIntegration);

settingsRoutes.get("/center/definition", getSettingsCenterDefinition);
settingsRoutes.get("/center/search", searchSettingsCenter);
settingsRoutes.get("/center/records/:section", getSettingsCenterRecords);
settingsRoutes.put("/center/records/:section", upsertSettingsCenterRecord);
settingsRoutes.put("/center/records/:section/:recordKey", upsertSettingsCenterRecord);
settingsRoutes.delete("/center/records/:section/:recordKey", archiveSettingsCenterRecord);
settingsRoutes.put("/center/meta", updateSettingsCenterMeta);
