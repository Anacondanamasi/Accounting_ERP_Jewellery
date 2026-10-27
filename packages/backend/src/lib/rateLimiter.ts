type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export const consumeRateLimit = (key: string, limit: number, windowMs: number) => {
  // In development, relax rate limits to prevent local lockouts
  const isDev = process.env.NODE_ENV !== "production";
  const effectiveLimit = isDev ? Math.max(limit * 10, 50) : limit;

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: effectiveLimit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= effectiveLimit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: true, remaining: effectiveLimit - bucket.count, resetAt: bucket.resetAt };
};

export const resetRateLimit = (key: string) => {
  buckets.delete(key);
};

export const clearAllRateLimits = () => {
  buckets.clear();
};
