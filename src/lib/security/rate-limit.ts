import { NextResponse } from "next/server";

export type RateLimitPolicy = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalRateLimitStore = globalThis as typeof globalThis & {
  __vaultRateLimitStore?: Map<string, RateLimitBucket>;
};

const store = globalRateLimitStore.__vaultRateLimitStore ?? new Map<string, RateLimitBucket>();
globalRateLimitStore.__vaultRateLimitStore = store;

export const rateLimitPolicies = {
  exportGeneration: { limit: 10, windowMs: 60_000 },
  importMutation: { limit: 30, windowMs: 60_000 },
} as const;

export function checkRateLimit(policy: RateLimitPolicy, now = Date.now()): RateLimitResult {
  const existing = store.get(policy.key);
  const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + policy.windowMs } : existing;

  bucket.count += 1;
  store.set(policy.key, bucket);

  const remaining = Math.max(policy.limit - bucket.count, 0);
  const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 0);

  return {
    allowed: bucket.count <= policy.limit,
    limit: policy.limit,
    remaining,
    resetAt: new Date(bucket.resetAt),
    retryAfterSeconds,
  };
}

export function rateLimitExceededResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: rateLimitHeaders(result),
    },
  );
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
  };
}

export function resetRateLimitStore() {
  store.clear();
}
