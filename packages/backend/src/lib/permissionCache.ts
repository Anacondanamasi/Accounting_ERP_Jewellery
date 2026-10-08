type CacheItem = {
  permissions: string[];
  expiresAt: number;
};

const permissionCache = new Map<string, CacheItem>();
const TTL_MS = 5 * 60 * 1000;

const keyFor = (userId: string, companyId: string) => `perm:${userId}:${companyId}`;

export const getCachedPermissions = (userId: string, companyId: string): string[] | null => {
  const key = keyFor(userId, companyId);
  const entry = permissionCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    permissionCache.delete(key);
    return null;
  }
  return entry.permissions;
};

export const setCachedPermissions = (userId: string, companyId: string, permissions: string[]) => {
  permissionCache.set(keyFor(userId, companyId), {
    permissions,
    expiresAt: Date.now() + TTL_MS,
  });
};

export const invalidatePermissionCache = (userId: string, companyId: string) => {
  permissionCache.delete(keyFor(userId, companyId));
};

