import { PrismaClient } from "@prisma/client";
import { getTenantContext } from "../context/tenantContext";

const basePrisma = new PrismaClient();

// Intercept and wrap $transaction to set default interactive/batch transaction timeouts (60s),
// preventing P2028 timeout errors on high-latency cloud database connections.
const originalTransaction = basePrisma.$transaction.bind(basePrisma);
Object.defineProperty(basePrisma, "$transaction", {
  value: function (args: any, options?: any) {
    const opt = { maxWait: 30000, timeout: 60000, ...options };
    return originalTransaction(args, opt);
  },
  writable: true,
  configurable: true,
});

// Models that are global/system-wide and do NOT have companyId
const GLOBAL_MODELS = new Set([
  "Company",
  "TenantCompany",
  "User",
  "TenantUser",
  "SubscriptionPlan",
  "RoleDefinition",
  "PermissionDefinition",
  "RolePermission",
  "ActiveSession",
  "UserCompanyMembership",
  "IdentityAuditLog",
  "HSNMaster",
]);

// Child models that scope through their parent relation
const CHILD_RELATION_SCOPES: Record<string, string> = {
  AssetCostComponent: "fixedAsset",
  DepreciationRunLine: "depreciationRun",
  BankRuleVersion: "rule",
};

export const prisma = (basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }: any) {
        const ctx = getTenantContext();
        if (ctx?.companyId && !GLOBAL_MODELS.has(model)) {
          const relation = CHILD_RELATION_SCOPES[model];
          if (relation) {
            args.where = { ...args.where, [relation]: { companyId: ctx.companyId } };
          } else {
            if (args.where?.companyId && args.where.companyId !== ctx.companyId) {
              throw new Error(`SECURITY_CROSS_TENANT_VIOLATION: Attempted to query ${model} with foreign companyId ${args.where.companyId}`);
            }
            args.where = { ...args.where, companyId: ctx.companyId };
          }
        }
        return query(args);
      },
      async findFirst({ model, args, query }: any) {
        const ctx = getTenantContext();
        if (ctx?.companyId && !GLOBAL_MODELS.has(model)) {
          const relation = CHILD_RELATION_SCOPES[model];
          if (relation) {
            args.where = { ...args.where, [relation]: { companyId: ctx.companyId } };
          } else {
            if (args.where?.companyId && args.where.companyId !== ctx.companyId) {
              throw new Error(`SECURITY_CROSS_TENANT_VIOLATION: Attempted to query ${model} with foreign companyId ${args.where.companyId}`);
            }
            args.where = { ...args.where, companyId: ctx.companyId };
          }
        }
        return query(args);
      },
      async findUnique({ model, args, query }: any) {
        const record = await query(args);
        const ctx = getTenantContext();
        if (ctx?.companyId && !GLOBAL_MODELS.has(model) && record) {
          if ("companyId" in record && record.companyId !== ctx.companyId) {
            return null; // Fail closed: hide foreign record
          }
        }
        return record;
      },
      async count({ model, args, query }: any) {
        const ctx = getTenantContext();
        if (ctx?.companyId && !GLOBAL_MODELS.has(model)) {
          const relation = CHILD_RELATION_SCOPES[model];
          if (relation) {
            args.where = { ...args.where, [relation]: { companyId: ctx.companyId } };
          } else {
            if (args.where?.companyId && args.where.companyId !== ctx.companyId) {
              throw new Error(`SECURITY_CROSS_TENANT_VIOLATION: Attempted to count ${model} with foreign companyId ${args.where.companyId}`);
            }
            args.where = { ...args.where, companyId: ctx.companyId };
          }
        }
        return query(args);
      },
      async create({ model, args, query }: any) {
        const ctx = getTenantContext();
        if (ctx?.companyId && !GLOBAL_MODELS.has(model) && !CHILD_RELATION_SCOPES[model]) {
          if (args.data?.companyId && args.data.companyId !== ctx.companyId) {
            throw new Error(`SECURITY_CROSS_TENANT_VIOLATION: Attempted to create ${model} with foreign companyId ${args.data.companyId}`);
          }
          args.data = { ...args.data, companyId: ctx.companyId };
        }
        return query(args);
      },
      async updateMany({ model, args, query }: any) {
        const ctx = getTenantContext();
        if (ctx?.companyId && !GLOBAL_MODELS.has(model)) {
          const relation = CHILD_RELATION_SCOPES[model];
          if (relation) {
            args.where = { ...args.where, [relation]: { companyId: ctx.companyId } };
          } else {
            args.where = { ...args.where, companyId: ctx.companyId };
          }
        }
        return query(args);
      },
      async deleteMany({ model, args, query }: any) {
        const ctx = getTenantContext();
        if (ctx?.companyId && !GLOBAL_MODELS.has(model)) {
          const relation = CHILD_RELATION_SCOPES[model];
          if (relation) {
            args.where = { ...args.where, [relation]: { companyId: ctx.companyId } };
          } else {
            args.where = { ...args.where, companyId: ctx.companyId };
          }
        }
        return query(args);
      },
    },
  },
}) as unknown) as PrismaClient;
