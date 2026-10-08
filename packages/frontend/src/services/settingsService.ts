import { api } from "@/lib/axios";

export interface CompanySettings {
  id: number;
  companyName: string;
  legalName: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  website?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  fiscalYearStartMonth: number;
  weightUnit: "g" | "tola";
  currency: "INR";
  timezone: string;
}

export interface SettingsUser {
  id: number;
  fullName: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "SALES" | "VIEW_ONLY";
  status: "ACTIVE" | "INVITED" | "INACTIVE";
  lastLoginAt?: string;
}

export interface NumberSeries {
  id: number;
  type: "invoice" | "journal" | "bill";
  prefix: string;
  suffix: string;
  padding: number;
  currentValue: number;
  resetPerFy: boolean;
}

export interface Integration {
  id: number;
  key: string;
  name: string;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  endpoint?: string;
  apiKeyMasked?: string;
  configuredAt?: string;
  lastSyncAt?: string;
}

export interface AuditLog {
  id: number;
  userName: string;
  module: string;
  action: string;
  tableName: string;
  recordId: number;
  ipAddress: string;
  createdAt: string;
}

export type SettingsCenterCategory =
  | "Core"
  | "Sales"
  | "Purchases"
  | "Accounting"
  | "Tax"
  | "Platform"
  | "Governance"
  | "Data"
  | "Enterprise";

export type SettingsCenterMode = "single" | "multiple";

export interface SettingsCenterSection {
  key: string;
  label: string;
  category: SettingsCenterCategory;
  mode: SettingsCenterMode;
  description: string;
  tags: string[];
  canManage: boolean;
  permissions: {
    view: string;
    manage: string;
  };
  defaultRecordKey: string | null;
}

export interface SettingsCenterDefinition {
  sections: SettingsCenterSection[];
  favorites: string[];
  recent: string[];
}

export interface SettingsCenterRecord {
  id: string;
  recordKey: string;
  payload: Record<string, unknown>;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  sortOrder: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsCenterRecordsResponse {
  section: string;
  mode: SettingsCenterMode;
  records: SettingsCenterRecord[];
}

export interface SettingsCenterSearchResultSection {
  type: "section";
  section: string;
  label: string;
  description: string;
}

export interface SettingsCenterSearchResultRecord {
  type: "record";
  section: string;
  recordKey: string;
  payloadPreview: Record<string, unknown>;
  updatedAt: string;
}

export type SettingsCenterSearchResult = SettingsCenterSearchResultSection | SettingsCenterSearchResultRecord;

export const settingsService = {
  async getCompanySettings() {
    const response = await api.get("/settings/company");
    return response.data.data as CompanySettings;
  },
  async updateCompanySettings(payload: CompanySettings) {
    const response = await api.put("/settings/company", payload);
    return response.data.data as CompanySettings;
  },
  async getUsers() {
    const response = await api.get("/settings/users");
    return response.data.data as SettingsUser[];
  },
  async inviteUser(payload: { fullName: string; email: string; role: SettingsUser["role"] }) {
    const response = await api.post("/settings/users/invite", payload);
    return response.data.data as SettingsUser;
  },
  async updateUserRole(id: number, role: SettingsUser["role"]) {
    const response = await api.put(`/settings/users/${id}/role`, { role });
    return response.data.data as SettingsUser;
  },
  async removeUser(id: number) {
    const response = await api.delete(`/settings/users/${id}`);
    return response.data.data as boolean;
  },
  async getNumberSeries() {
    const response = await api.get("/settings/number-series");
    return response.data.data as NumberSeries[];
  },
  async updateNumberSeries(type: NumberSeries["type"], payload: Omit<NumberSeries, "id" | "type">) {
    const response = await api.put(`/settings/number-series/${type}`, payload);
    return response.data.data as NumberSeries;
  },
  async getIntegrations() {
    const response = await api.get("/settings/integrations");
    return response.data.data as Integration[];
  },
  async updateIntegration(key: string, payload: { status: Integration["status"]; endpoint?: string; apiKey?: string }) {
    const response = await api.put(`/settings/integrations/${key}`, payload);
    return response.data.data as Integration;
  },
  async getAuditLog(params: { from?: string; to?: string; user?: string; module?: string }) {
    const response = await api.get("/settings/audit-log", { params });
    return response.data.data as AuditLog[];
  },
  async getSettingsCenterDefinition() {
    const response = await api.get("/settings/center/definition");
    return response.data.data as SettingsCenterDefinition;
  },
  async getSettingsCenterRecords(section: string) {
    const response = await api.get(`/settings/center/records/${section}`);
    return response.data.data as SettingsCenterRecordsResponse;
  },
  async upsertSettingsCenterRecord(
    section: string,
    payload: {
      recordKey?: string;
      payload: Record<string, unknown>;
      sortOrder?: number;
      effectiveFrom?: string | null;
      effectiveTo?: string | null;
      status?: "ACTIVE" | "INACTIVE";
    },
  ) {
    const response = await api.put(`/settings/center/records/${section}`, payload);
    return response.data.data as SettingsCenterRecord;
  },
  async archiveSettingsCenterRecord(section: string, recordKey: string) {
    const response = await api.delete(`/settings/center/records/${section}/${recordKey}`);
    return response.data.data as boolean;
  },
  async updateSettingsCenterMeta(payload: { favorites: string[]; recent: string[] }) {
    const response = await api.put("/settings/center/meta", payload);
    return response.data.data as { favorites: string[]; recent: string[] };
  },
  async searchSettingsCenter(query: string) {
    const response = await api.get("/settings/center/search", { params: { q: query } });
    return response.data.data as {
      query: string;
      results: SettingsCenterSearchResult[];
    };
  },
};
