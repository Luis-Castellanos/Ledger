import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, rateLimitHeaders, resetRateLimitStore } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests within the configured window and reports remaining capacity", () => {
    const first = checkRateLimit({ key: "user_1:export", limit: 2, windowMs: 60_000 }, 1_000);
    const second = checkRateLimit({ key: "user_1:export", limit: 2, windowMs: 60_000 }, 2_000);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks requests after the configured limit until the window resets", () => {
    checkRateLimit({ key: "user_1:import", limit: 1, windowMs: 60_000 }, 1_000);
    const blocked = checkRateLimit({ key: "user_1:import", limit: 1, windowMs: 60_000 }, 2_000);
    const reset = checkRateLimit({ key: "user_1:import", limit: 1, windowMs: 60_000 }, 61_000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(59);
    expect(reset.allowed).toBe(true);
  });
});

describe("rateLimitHeaders", () => {
  it("serializes standard retry headers", () => {
    const result = checkRateLimit({ key: "user_1:export", limit: 1, windowMs: 60_000 }, 1_000);

    expect(rateLimitHeaders(result)).toEqual({
      "Retry-After": "60",
      "X-RateLimit-Limit": "1",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "1970-01-01T00:01:01.000Z",
    });
  });
});
