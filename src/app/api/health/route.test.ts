import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getDeploymentHealthReport } from "@/lib/setup/health";

vi.mock("@/lib/setup/health", () => ({
  getDeploymentHealthReport: vi.fn(),
}));

describe("health route", () => {
  it("returns a minimal public readiness payload", async () => {
    vi.mocked(getDeploymentHealthReport).mockResolvedValue({
      service: "ledger",
      ok: true,
      checkedAt: "2026-05-29T12:00:00.000Z",
      environment: "production",
      vercelEnvironment: "production",
      status: {
        appUrlConfigured: true,
        clerkConfigured: true,
        clerkKeyMode: "live",
        databaseConfigured: true,
        databaseReachable: true,
        nodeEnv: "production",
        rateLimitStore: "database",
        vercelDetected: true,
        vercelEnvironment: "production",
      },
      readiness: {
        ready: true,
        readyCount: 8,
        requiredCount: 8,
        checks: [],
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      service: "ledger",
      ok: true,
      checkedAt: "2026-05-29T12:00:00.000Z",
      readiness: {
        ready: true,
        readyCount: 8,
        requiredCount: 8,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("clerkKeyMode");
    expect(JSON.stringify(payload)).not.toContain("databaseReachable");
    expect(JSON.stringify(payload)).not.toContain("production");
  });
});
