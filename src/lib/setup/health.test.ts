import { describe, expect, it } from "vitest";
import { buildHealthReport } from "./health-report";

const readyEnv = {
  NEXT_PUBLIC_APP_URL: "https://ledger.example.com",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
  CLERK_SECRET_KEY: "sk_live_example",
  DATABASE_URL: "postgres://example",
  NODE_ENV: "production",
  VERCEL_ENV: "production",
};

describe("getDeploymentHealthReport", () => {
  it("keeps production health incomplete while rate limits are process-local", async () => {
    const report = await buildHealthReport(readyEnv, new Date("2026-05-28T12:00:00.000Z"), async () => undefined);

    expect(report.ok).toBe(false);
    expect(report.status.databaseReachable).toBe(true);
    expect(report.readiness.checks).toContainEqual({ key: "databaseConnection", label: "Neon connection verified", ready: true });
    expect(report.readiness.checks).toContainEqual({ key: "rateLimits", label: "Durable rate limits", ready: false });
  });

  it("marks the deployment unhealthy when database ping fails", async () => {
    const report = await buildHealthReport(readyEnv, new Date("2026-05-28T12:00:00.000Z"), async () => {
      throw new Error("connection failed");
    });

    expect(report.ok).toBe(false);
    expect(report.status.databaseReachable).toBe(false);
    expect(report.readiness.checks).toContainEqual({ key: "databaseConnection", label: "Neon connection verified", ready: false });
    expect(JSON.stringify(report)).not.toContain("postgres://example");
  });

  it("does not attempt a database ping without DATABASE_URL", async () => {
    let pinged = false;
    const report = await buildHealthReport({}, new Date("2026-05-28T12:00:00.000Z"), async () => {
      pinged = true;
    });

    expect(report.ok).toBe(false);
    expect(report.status.databaseReachable).toBeNull();
    expect(pinged).toBe(false);
  });
});
