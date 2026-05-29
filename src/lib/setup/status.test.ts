import { describe, expect, it } from "vitest";
import { getHealthReport, getSetupReadiness, getSetupStatus } from "./status";

describe("getSetupStatus", () => {
  it("reports required production integrations without exposing values", () => {
    const status = getSetupStatus({
      NEXT_PUBLIC_APP_URL: "https://example.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_value",
      CLERK_SECRET_KEY: "sk_live_value",
      DATABASE_URL: "postgres://example",
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "preview",
    });

    expect(status).toEqual({
      appUrlConfigured: true,
      clerkConfigured: true,
      clerkKeyMode: "live",
      databaseConfigured: true,
      databaseReachable: null,
      nodeEnv: "production",
      rateLimitStore: "database",
      vercelDetected: true,
      vercelEnvironment: "preview",
    });
  });

  it("marks setup incomplete when required env vars are absent", () => {
    const status = getSetupStatus({});

    expect(getSetupReadiness(status)).toEqual({
      checks: [
        { key: "appUrl", label: "Canonical app URL", ready: false },
        { key: "clerkKeys", label: "Clerk authentication keys", ready: false },
        { key: "clerkLiveKeys", label: "Clerk production instance", ready: false },
        { key: "database", label: "Neon database URL", ready: false },
        { key: "databaseConnection", label: "Neon connection verified", ready: false },
        { key: "securityHeaders", label: "Security headers", ready: true },
        { key: "rateLimits", label: "Import and export rate limits", ready: true },
        { key: "observability", label: "Redacted server error logging", ready: true },
      ],
      ready: false,
      readyCount: 3,
      requiredCount: 8,
    });
  });

  it("does not mark development Clerk keys as production ready", () => {
    const status = getSetupStatus({
      NEXT_PUBLIC_APP_URL: "https://example.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      CLERK_SECRET_KEY: "sk_test_example",
      DATABASE_URL: "postgres://example",
    });

    expect(getSetupReadiness(status)).toEqual({
      checks: [
        { key: "appUrl", label: "Canonical app URL", ready: true },
        { key: "clerkKeys", label: "Clerk authentication keys", ready: true },
        { key: "clerkLiveKeys", label: "Clerk production instance", ready: false },
        { key: "database", label: "Neon database URL", ready: true },
        { key: "databaseConnection", label: "Neon connection verified", ready: false },
        { key: "securityHeaders", label: "Security headers", ready: true },
        { key: "rateLimits", label: "Import and export rate limits", ready: true },
        { key: "observability", label: "Redacted server error logging", ready: true },
      ],
      ready: false,
      readyCount: 6,
      requiredCount: 8,
    });
  });

  it("reports live Clerk keys without exposing key material", () => {
    const status = getSetupStatus({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
      CLERK_SECRET_KEY: "sk_live_example",
    });

    expect(status.clerkConfigured).toBe(true);
    expect(status.clerkKeyMode).toBe("live");
  });

  it("flags mismatched Clerk key environments", () => {
    const status = getSetupStatus({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      CLERK_SECRET_KEY: "sk_live_example",
    });

    expect(status.clerkConfigured).toBe(true);
    expect(status.clerkKeyMode).toBe("mixed");
  });

  it("builds a redacted health report for deployment smoke checks", () => {
    const report = getHealthReport(
      {
        NEXT_PUBLIC_APP_URL: "https://ledger.example.com",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
        CLERK_SECRET_KEY: "sk_live_example",
        DATABASE_URL: "postgres://example",
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      },
      new Date("2026-05-28T12:00:00.000Z"),
    );

    expect(report).toEqual({
      service: "ledger",
      ok: false,
      checkedAt: "2026-05-28T12:00:00.000Z",
      environment: "production",
      vercelEnvironment: "production",
      readiness: {
        checks: [
          { key: "appUrl", label: "Canonical app URL", ready: true },
          { key: "clerkKeys", label: "Clerk authentication keys", ready: true },
          { key: "clerkLiveKeys", label: "Clerk production instance", ready: true },
          { key: "database", label: "Neon database URL", ready: true },
          { key: "databaseConnection", label: "Neon connection verified", ready: false },
          { key: "securityHeaders", label: "Security headers", ready: true },
          { key: "rateLimits", label: "Database-backed rate limits", ready: true },
          { key: "observability", label: "Redacted server error logging", ready: true },
        ],
        ready: false,
        readyCount: 7,
        requiredCount: 8,
      },
    });

    expect(JSON.stringify(report)).not.toContain("sk_live_example");
    expect(JSON.stringify(report)).not.toContain("postgres://example");
  });

  it("requires database-backed rate limits for production readiness", () => {
    const status = getSetupStatus({
      NODE_ENV: "production",
    });

    expect(status.rateLimitStore).toBe("memory");
    expect(getSetupReadiness(status).checks).toContainEqual({ key: "rateLimits", label: "Database-backed rate limits", ready: false });
  });
});
