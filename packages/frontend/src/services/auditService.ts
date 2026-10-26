import { api } from "@/lib/axios";

export interface FieldDiff {
  field: string;
  label: string;
  old: any;
  new: any;
}

export interface AuditEventRow {
  id: string;
  occurredAt: string;
  companyId: number;
  actorType: "USER" | "SYSTEM" | "API" | "SUPPORT";
  actorId: string;
  actorName: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  source: "UI" | "API" | "IMPORT" | "JOB" | "MIGRATION";
  eventType: string;
  entityType: string;
  entityId: string;
  entityNumber?: string;
  entityDate?: string;
  amountBefore?: number;
  amountAfter?: number;
  summary: string;
  changesJson?: string;
  diffs: FieldDiff[];
  revisionBefore?: number;
  revisionAfter?: number;
  reason?: string;
  causedByEventId?: string;
  prevHash: string;
  hash: string;
}

export interface AuditListResult {
  items: AuditEventRow[];
  nextCursor?: string;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalEvents: number;
  brokenAtEventId?: string;
  brokenAtDate?: string;
  error?: string;
}

export interface StatutoryReportResult {
  company: {
    name: string;
    gstin: string;
    pan: string;
  };
  period: {
    from: string;
    to: string;
  };
  chainVerification: ChainVerificationResult;
  generatedAt: string;
  events: Array<{
    id: string;
    timestampIST: string;
    actorName: string;
    actorRole: string;
    action: string;
    entity: string;
    summary: string;
    diffs: FieldDiff[];
    reason: string;
    hash: string;
  }>;
}

export const auditService = {
  async listEvents(params: {
    from?: string;
    to?: string;
    actorId?: string;
    category?: string;
    entityType?: string;
    search?: string;
    source?: string;
    indirectOnly?: boolean;
    failedOnly?: boolean;
    cursor?: string;
    limit?: number;
  }) {
    const response = await api.get("/audit/events", { params });
    return response.data.data as AuditListResult;
  },

  async getEntityHistory(entityType: string, entityId: string | number) {
    const response = await api.get(`/audit/entities/${entityType}/${entityId}/history`);
    return response.data.data as AuditEventRow[];
  },

  async verifyChain() {
    const response = await api.post("/audit/verify-chain");
    return response.data.data as ChainVerificationResult;
  },

  async getStatutoryReport(from?: string, to?: string) {
    const response = await api.get("/audit/statutory-report", { params: { from, to } });
    return response.data.data as StatutoryReportResult;
  },

  async restoreEntity(entityType: string, entityId: string | number, reason?: string) {
    const response = await api.post(`/audit/entities/${entityType}/${entityId}/restore`, { reason });
    return response.data.data as { restored: boolean };
  },
};
