import { beforeEach, describe, expect, it } from "vitest";
import { checkMemoryRateLimit, checkUserMutationRateLimit, rateLimitHeaders, resetRateLimitStore, usesDurableRateLimitStore } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests within the configured window and reports remaining capacity", () => {
    const first = checkMemoryRateLimit({ key: "user_1:export", limit: 2, windowMs: 60_000 }, 1_000);
    const second = checkMemoryRateLimit({ key: "user_1:export", limit: 2, windowMs: 60_000 }, 2_000);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(first.store).toBe("memory");
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks requests after the configured limit until the window resets", () => {
    checkMemoryRateLimit({ key: "user_1:import", limit: 1, windowMs: 60_000 }, 1_000);
    const blocked = checkMemoryRateLimit({ key: "user_1:import", limit: 1, windowMs: 60_000 }, 2_000);
    const reset = checkMemoryRateLimit({ key: "user_1:import", limit: 1, windowMs: 60_000 }, 61_000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(59);
    expect(reset.allowed).toBe(true);
  });

  it("scopes generic mutation limits by user and action", async () => {
    const first = await checkUserMutationRateLimit("user_1", "transactions");
    const second = await checkUserMutationRateLimit("user_1", "categories");

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(first.remaining).toBe(59);
    expect(second.remaining).toBe(59);
  });
});

describe("rateLimitHeaders", () => {
  it("serializes standard retry headers", () => {
    const result = checkMemoryRateLimit({ key: "user_1:export", limit: 1, windowMs: 60_000 }, 1_000);

    expect(rateLimitHeaders(result)).toEqual({
      "Retry-After": "60",
      "X-RateLimit-Limit": "1",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "1970-01-01T00:01:01.000Z",
    });
  });
});

describe("usesDurableRateLimitStore", () => {
  it("uses the database-backed limiter only for production with DATABASE_URL", () => {
    expect(usesDurableRateLimitStore({ NODE_ENV: "production", DATABASE_URL: "postgres://example" })).toBe(true);
    expect(usesDurableRateLimitStore({ NODE_ENV: "production" })).toBe(false);
    expect(usesDurableRateLimitStore({ NODE_ENV: "development", DATABASE_URL: "postgres://example" })).toBe(false);
  });
});
