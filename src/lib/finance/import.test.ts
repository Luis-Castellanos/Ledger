import { describe, expect, it } from "vitest";
import { buildImportFingerprint, stageImportSchema, updateImportRowSchema } from "./import";

describe("stageImportSchema", () => {
  it("parses staged row amounts into minor units", () => {
    const parsed = stageImportSchema.parse({
      accountId: "account_1",
      filename: "checking.csv",
      rows: [{ rowNumber: 1, date: "2026-05-27", description: "Coffee", amount: "-4.25" }],
    });

    expect(parsed.rows[0]?.amount).toBe(-425);
    expect(parsed.rows[0]?.status).toBe("needs_review");
  });

  it("rejects empty import files", () => {
    const parsed = stageImportSchema.safeParse({ accountId: "account_1", filename: "empty.csv", rows: [] });

    expect(parsed.success).toBe(false);
  });
});

describe("updateImportRowSchema", () => {
  it("allows category/status edits", () => {
    const parsed = updateImportRowSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      category: "Shopping",
      status: "accepted",
    });

    expect(parsed.success).toBe(true);
  });
});

describe("buildImportFingerprint", () => {
  it("returns stable fingerprints for identical payloads", () => {
    const input = {
      accountId: "account_1",
      filename: "checking.csv",
      rows: [{ rowNumber: 1, date: "2026-05-27", description: "Coffee", amount: -425, category: "Uncategorized", status: "needs_review" as const }],
    };

    expect(buildImportFingerprint(input)).toBe(buildImportFingerprint(input));
  });
});
