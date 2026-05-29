import { afterEach, describe, expect, it, vi } from "vitest";
import { logServerError, redactValue } from "./server-logger";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("redactValue", () => {
  it("redacts sensitive keys recursively", () => {
    expect(
      redactValue({
        ledgerId: "ledger_1",
        token: "secret-token",
        nested: {
          rawDescription: "PAYROLL ACME",
          notes: "private memo",
          safeCount: 3,
        },
      }),
    ).toEqual({
      ledgerId: "ledger_1",
      token: "[REDACTED]",
      nested: {
        rawDescription: "[REDACTED]",
        notes: "[REDACTED]",
        safeCount: 3,
      },
    });
  });
});

describe("logServerError", () => {
  it("logs structured errors without sensitive context", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logServerError("export.failed", new Error("Export failed"), {
      exportJobId: "job_1",
      rawDescription: "APPLE.COM/BILL",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0]?.[0] ?? "{}") as {
      context: { exportJobId: string; rawDescription: string };
      error: { message: string };
      event: string;
      level: string;
    };
    expect(payload.level).toBe("error");
    expect(payload.event).toBe("export.failed");
    expect(payload.error.message).toBe("Export failed");
    expect(payload.context).toEqual({
      exportJobId: "job_1",
      rawDescription: "[REDACTED]",
    });

    spy.mockRestore();
  });

  it("does not log raw exception messages in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logServerError("export.failed", new Error("connection string leaked in driver error"), {
      exportJobId: "job_1",
    });

    const payload = JSON.parse(spy.mock.calls[0]?.[0] ?? "{}") as {
      error: { message: string };
    };
    expect(payload.error.message).toBe("Server error");
    expect(JSON.stringify(payload)).not.toContain("connection string");

    spy.mockRestore();
  });
});
