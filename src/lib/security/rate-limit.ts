import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

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
  store: "memory" | "database";
  unavailable?: boolean;
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

export async function checkRateLimit(policy: RateLimitPolicy, now = Date.now()): Promise<RateLimitResult> {
  if (usesDurableRateLimitStore()) {
    return checkDatabaseRateLimit(policy, now);
  }

  return checkMemoryRateLimit(policy, now);
}

export function checkMemoryRateLimit(policy: RateLimitPolicy, now = Date.now()): RateLimitResult {
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
    store: "memory",
  };
}

export function rateLimitExceededResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: result.unavailable ? "Rate limit store unavailable. Try again shortly." : "Too many requests. Try again shortly." },
    {
      status: result.unavailable ? 503 : 429,
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

export function usesDurableRateLimitStore(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "production" && Boolean(env.DATABASE_URL);
}

async function checkDatabaseRateLimit(policy: RateLimitPolicy, now: number): Promise<RateLimitResult> {
  try {
    const [{ getDb }, { rateLimits }] = await Promise.all([import("@/lib/db/client"), import("@/lib/db/schema")]);
    const nowDate = new Date(now);
    const nextResetAt = new Date(now + policy.windowMs);
    const [bucket] = await getDb()
      .insert(rateLimits)
      .values({
        key: policy.key,
        count: 1,
        resetAt: nextResetAt,
        updatedAt: nowDate,
      })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql<number>`case when ${rateLimits.resetAt} <= ${nowDate} then 1 else ${rateLimits.count} + 1 end`,
          resetAt: sql<Date>`case when ${rateLimits.resetAt} <= ${nowDate} then ${nextResetAt} else ${rateLimits.resetAt} end`,
          updatedAt: nowDate,
        },
      })
      .returning({
        count: rateLimits.count,
        resetAt: rateLimits.resetAt,
      });

    if (!bucket) {
      throw new Error("Rate limit bucket was not returned.");
    }

    const remaining = Math.max(policy.limit - bucket.count, 0);
    const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt.getTime() - now) / 1000), 0);

    return {
      allowed: bucket.count <= policy.limit,
      limit: policy.limit,
      remaining,
      resetAt: bucket.resetAt,
      retryAfterSeconds,
      store: "database",
    };
  } catch {
    return {
      allowed: false,
      limit: policy.limit,
      remaining: 0,
      resetAt: new Date(now + policy.windowMs),
      retryAfterSeconds: Math.max(Math.ceil(policy.windowMs / 1000), 0),
      store: "database",
      unavailable: true,
    };
  }
}
