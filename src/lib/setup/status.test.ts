import { describe, expect, it } from "vitest";
import { getSetupReadiness, getSetupStatus } from "./status";

describe("getSetupStatus", () => {
  it("reports required production integrations without exposing values", () => {
    const status = getSetupStatus({
      NEXT_PUBLIC_APP_URL: "https://example.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_value",
      CLERK_SECRET_KEY: "sk_test_value",
      DATABASE_URL: "postgres://example",
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "preview",
    });

    expect(status).toEqual({
      appUrlConfigured: true,
      clerkConfigured: true,
      databaseConfigured: true,
      nodeEnv: "production",
      vercelDetected: true,
      vercelEnvironment: "preview",
    });
  });

  it("marks setup incomplete when required env vars are absent", () => {
    const status = getSetupStatus({});

    expect(getSetupReadiness(status)).toEqual({
      ready: false,
      readyCount: 0,
      requiredCount: 3,
    });
  });
});
