import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

type TxClient = Prisma.TransactionClient;

export interface ActorContext {
  id?: string | number;
  name?: string;
  role?: string;
  type?: "USER" | "SYSTEM" | "API" | "SUPPORT";
}

export interface AuditRecordInput {
  companyId: number;
  actor: ActorContext;
  source?: "UI" | "API" | "IMPORT" | "JOB" | "MIGRATION";
  eventType: string;
  entityType: string;
  entityId: string | number;
  entityNumber?: string;
  entityDate?: Date | string;
  amountBefore?: number;
  amountAfter?: number;
  summary?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  reason?: string;
  causedByEventId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export interface FieldDiff {
  field: string;
  label: string;
  old: any;
  new: any;
}

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

// Field Friendly Labels
const FIELD_LABEL_MAP: Record<string, string> = {
  placeOfSupply: "Place of Supply",
  grandTotal: "Total Amount",
  taxableAmount: "Taxable Value",
  subTotal: "Subtotal",
  discount: "Discount",
  cgst: "CGST",
  sgst: "SGST",
  igst: "IGST",
  status: "Status",
  date: "Date",
  dueDate: "Due Date",
  customerId: "Customer",
  supplierId: "Supplier",
  notes: "Notes",
  narration: "Narration",
  invoiceNo: "Invoice Number",
  billNo: "Bill Number",
  reference: "Reference",
  creditLimit: "Credit Limit",
  gstin: "GSTIN",
  pan: "PAN",
  name: "Name",
  email: "Email",
  mobile: "Phone",
  bankName: "Bank Name",
  accountNo: "Account Number",
  lockDate: "Lock Date",
};

/**
 * Masks sensitive values in accordance with DPDP Act & PCI/Banking standards
 */
export const maskSensitiveValue = (field: string, val: any): any => {
  if (val === undefined || val === null) return val;
  const str = String(val);

  if (/password|secret|token|apiKey/i.test(field)) {
    return "[MASKED]";
  }
  if (/pan/i.test(field) && str.length === 10) {
    return `${str.slice(0, 5)}****${str.slice(9)}`;
  }
  if (/accountNo|bankAccount|accountNumber/i.test(field) && str.length > 4) {
    return `••••${str.slice(-4)}`;
  }
  if (/aadhaar/i.test(field) && str.length >= 12) {
    return `••••••••${str.slice(-4)}`;
  }
  return val;
};

/**
 * Calculates field-level diffs with sensitive data masking
 */
export const computeFieldDiffs = (
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined
): FieldDiff[] => {
  if (!before && !after) return [];
  const diffs: FieldDiff[] = [];

  const ignoredKeys = new Set([
    "updatedAt",
    "createdAt",
    "id",
    "companyId",
    "createdBy",
    "reversalOf",
    "lines",
    "items",
  ]);

  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const key of allKeys) {
    if (ignoredKeys.has(key)) continue;

    const oldVal = before ? before[key] : undefined;
    const newVal = after ? after[key] : undefined;

    // Normalize dates
    const oldNorm = oldVal instanceof Date ? oldVal.toISOString() : oldVal;
    const newNorm = newVal instanceof Date ? newVal.toISOString() : newVal;

    if (JSON.stringify(oldNorm) !== JSON.stringify(newNorm)) {
      diffs.push({
        field: key,
        label: FIELD_LABEL_MAP[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
        old: maskSensitiveValue(key, oldVal),
        new: maskSensitiveValue(key, newVal),
      });
    }
  }

  return diffs;
};

/**
 * Computes deterministic canonical SHA-256 hash for an audit record
 */
export const computeCanonicalHash = (payload: {
  occurredAt: string;
  companyId: number;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  amountAfter?: number | null;
  changesJson?: string | null;
  prevHash: string;
}): string => {
  const canonicalString = [
    payload.occurredAt,
    payload.companyId,
    payload.actorId,
    payload.eventType,
    payload.entityType,
    payload.entityId,
    payload.amountAfter !== undefined && payload.amountAfter !== null ? payload.amountAfter : "",
    payload.changesJson || "",
    payload.prevHash,
  ].join("|");

  return crypto.createHash("sha256").update(canonicalString, "utf8").digest("hex");
};

export class AuditService {
  /**
   * Records an immutable audit event chained to the company's hash trail.
   * Can be called with either Prisma transaction client or default prisma.
   */
  static async recordEvent(
    txOrPrisma: TxClient | typeof prisma,
    input: AuditRecordInput
  ) {
    const occurredAt = new Date();
    const eventId = crypto.randomUUID();

    const diffs = computeFieldDiffs(input.before, input.after);
    const changesJson = diffs.length > 0 ? JSON.stringify(diffs) : null;

    // Generate human summary if not provided
    let summary = input.summary;
    const actorName = input.actor.name || input.actor.id || "System";
    const entityLabel = `${input.entityType} ${input.entityNumber || `#${input.entityId}`}`;

    if (!summary) {
      if (!input.before && input.after) {
        summary = `${actorName} created ${entityLabel}${input.amountAfter ? ` for ₹${input.amountAfter.toLocaleString("en-IN")}` : ""}`;
      } else if (input.before && !input.after) {
        summary = `${actorName} deleted/voided ${entityLabel}`;
      } else if (diffs.length > 0) {
        const diffSummaries = diffs.slice(0, 3).map((d) => `${d.label} from ${JSON.stringify(d.old)} to ${JSON.stringify(d.new)}`);
        summary = `${actorName} updated ${entityLabel}: changed ${diffSummaries.join(", ")}${diffs.length > 3 ? ` (+${diffs.length - 3} more)` : ""}`;
      } else {
        summary = `${actorName} performed ${input.eventType} on ${entityLabel}`;
      }
    }

    // Get previous hash in chain for this company
    const latestEvent = await txOrPrisma.auditEvent.findFirst({
      where: { companyId: input.companyId },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      select: { hash: true },
    });

    const prevHash = latestEvent?.hash || GENESIS_HASH;

    // Calculate current hash
    const hash = computeCanonicalHash({
      occurredAt: occurredAt.toISOString(),
      companyId: input.companyId,
      actorId: String(input.actor.id || "system"),
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: String(input.entityId),
      amountAfter: input.amountAfter,
      changesJson,
      prevHash,
    });

    // Count revisions for this entity
    const prevCount = await txOrPrisma.auditEvent.count({
      where: {
        companyId: input.companyId,
        entityType: input.entityType,
        entityId: String(input.entityId),
      },
    });

    const revisionBefore = prevCount > 0 ? prevCount : undefined;
    const revisionAfter = prevCount + 1;

    return txOrPrisma.auditEvent.create({
      data: {
        id: eventId,
        occurredAt,
        companyId: input.companyId,
        actorType: input.actor.type || "USER",
        actorId: String(input.actor.id || "system"),
        actorName: String(actorName),
        actorRole: input.actor.role || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        sessionId: input.sessionId || null,
        requestId: input.requestId || null,
        source: input.source || "UI",
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: String(input.entityId),
        entityNumber: input.entityNumber || null,
        entityDate: input.entityDate ? new Date(input.entityDate) : null,
        amountBefore: input.amountBefore ?? null,
        amountAfter: input.amountAfter ?? null,
        summary,
        changesJson,
        revisionBefore,
        revisionAfter,
        reason: input.reason || null,
        causedByEventId: input.causedByEventId || null,
        prevHash,
        hash,
      },
    });
  }

  /**
   * Verifies the cryptographic integrity of the audit chain for a company.
   * Proves that no records have been altered, injected, or deleted.
   */
  static async verifyChain(companyId: number): Promise<{
    isValid: boolean;
    totalEvents: number;
    brokenAtEventId?: string;
    brokenAtDate?: string;
    error?: string;
  }> {
    const events = await prisma.auditEvent.findMany({
      where: { companyId },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    });

    if (events.length === 0) {
      return { isValid: true, totalEvents: 0 };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < events.length; i++) {
      const evt = events[i];

      // Check pointer link
      if (evt.prevHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalEvents: events.length,
          brokenAtEventId: evt.id,
          brokenAtDate: evt.occurredAt.toISOString(),
          error: `Chain broken at event #${i + 1} (${evt.id}): expected prevHash ${expectedPrevHash}, found ${evt.prevHash}`,
        };
      }

      // Recompute hash
      const recomputedHash = computeCanonicalHash({
        occurredAt: evt.occurredAt.toISOString(),
        companyId: evt.companyId,
        actorId: evt.actorId,
        eventType: evt.eventType,
        entityType: evt.entityType,
        entityId: evt.entityId,
        amountAfter: evt.amountAfter,
        changesJson: evt.changesJson,
        prevHash: evt.prevHash,
      });

      if (recomputedHash !== evt.hash) {
        return {
          isValid: false,
          totalEvents: events.length,
          brokenAtEventId: evt.id,
          brokenAtDate: evt.occurredAt.toISOString(),
          error: `Tamper detected on event #${i + 1} (${evt.id}): recomputed hash ${recomputedHash} does not match stored hash ${evt.hash}`,
        };
      }

      expectedPrevHash = evt.hash;
    }

    return { isValid: true, totalEvents: events.length };
  }

  /**
   * Fetches the complete revision timeline for a specific entity
   */
  static async getEntityHistory(companyId: number, entityType: string, entityId: string | number) {
    const events = await prisma.auditEvent.findMany({
      where: {
        companyId,
        entityType,
        entityId: String(entityId),
      },
      orderBy: { occurredAt: "desc" },
    });

    return events.map((e) => ({
      ...e,
      diffs: e.changesJson ? (JSON.parse(e.changesJson) as FieldDiff[]) : [],
    }));
  }

  /**
   * Lists audit events with keyset pagination and filtering
   */
  static async listEvents(
    companyId: number,
    params: {
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
    }
  ) {
    const limit = Math.min(params.limit || 50, 250);
    const where: Prisma.AuditEventWhereInput = { companyId };

    if (params.from || params.to) {
      where.occurredAt = {};
      if (params.from) where.occurredAt.gte = new Date(params.from);
      if (params.to) where.occurredAt.lte = new Date(params.to);
    }

    if (params.actorId) {
      where.actorId = params.actorId;
    }

    if (params.source) {
      where.source = params.source;
    }

    if (params.entityType) {
      where.entityType = params.entityType;
    }

    if (params.indirectOnly) {
      where.causedByEventId = { not: null };
    }

    if (params.failedOnly) {
      where.eventType = { contains: "failed" };
    }

    if (params.category) {
      // Group categories
      switch (params.category.toLowerCase()) {
        case "transactions":
          where.entityType = { in: ["Invoice", "Bill", "Expense", "Note", "Payment", "JournalEntry"] };
          break;
        case "masters":
          where.entityType = { in: ["Customer", "Supplier", "Account", "Item", "BankAccount"] };
          break;
        case "security":
          where.eventType = { startsWith: "auth." };
          break;
        case "banking":
          where.entityType = { in: ["BankAccount", "BankFeedLine", "Reconciliation", "BankRule"] };
          break;
        case "settings":
          where.entityType = { in: ["Setting", "NumberSeries", "Company"] };
          break;
      }
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { entityNumber: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { actorName: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.auditEvent.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(params.cursor
        ? {
            cursor: { id: params.cursor },
            skip: 1,
          }
        : {}),
    });

    let nextCursor: string | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items: items.map((item) => ({
        ...item,
        diffs: item.changesJson ? (JSON.parse(item.changesJson) as FieldDiff[]) : [],
      })),
      nextCursor,
    };
  }

  /**
   * Generates Companies Act Statutory Audit Trail Report
   */
  static async getStatutoryReport(companyId: number, from?: string, to?: string) {
    const where: Prisma.AuditEventWhereInput = {
      companyId,
      entityType: { in: ["Invoice", "Bill", "Expense", "Note", "JournalEntry", "Account", "Setting"] },
    };

    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to) where.occurredAt.lte = new Date(to);
    }

    const [events, verification, company] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      }),
      this.verifyChain(companyId),
      prisma.company.findUnique({ where: { id: companyId } }),
    ]);

    return {
      company: {
        name: company?.name || "Company",
        gstin: company?.gstin || "—",
        pan: company?.pan || "—",
      },
      period: {
        from: from || "Inception",
        to: to || new Date().toISOString(),
      },
      chainVerification: verification,
      generatedAt: new Date().toISOString(),
      events: events.map((e) => ({
        id: e.id,
        timestampIST: new Date(e.occurredAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        actorName: e.actorName,
        actorRole: e.actorRole || "USER",
        action: e.eventType,
        entity: `${e.entityType} ${e.entityNumber || e.entityId}`,
        summary: e.summary,
        diffs: e.changesJson ? (JSON.parse(e.changesJson) as FieldDiff[]) : [],
        reason: e.reason || "Standard operational entry",
        hash: e.hash,
      })),
    };
  }
}
