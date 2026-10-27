import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  companyId: number;
  companyUuid?: string;
  userId?: string;
  role?: string;
  permissions?: string[];
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Execute a callback within an isolated tenant context scope.
 */
export const runWithTenantContext = <T>(ctx: TenantContext, fn: () => T): T => {
  return tenantStorage.run(ctx, fn);
};

/**
 * Get the currently active tenant context (if inside a tenant-scoped request).
 */
export const getTenantContext = (): TenantContext | undefined => {
  return tenantStorage.getStore();
};

/**
 * Require active tenant context. Throws if executed outside tenant context.
 */
export const requireTenantContext = (): TenantContext => {
  const ctx = tenantStorage.getStore();
  if (!ctx || !ctx.companyId) {
    throw new Error("SECURITY_ERROR: Tenant context is required but was not found in the current execution scope.");
  }
  return ctx;
};
