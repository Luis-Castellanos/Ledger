import { describe, expect, it, vi } from "vitest";
import { logServerError, redactValue } from "./server-logger";

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
});
