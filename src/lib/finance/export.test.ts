import { describe, expect, it } from "vitest";
import { buildExportFilename, isExportFormat, toCsv } from "./export";

describe("isExportFormat", () => {
  it("accepts supported export formats", () => {
    expect(isExportFormat("transactions_csv")).toBe(true);
    expect(isExportFormat("backup_package")).toBe(true);
    expect(isExportFormat("unknown")).toBe(false);
  });
});

describe("toCsv", () => {
  it("escapes commas, quotes, and newlines", () => {
    const csv = toCsv(["merchant", "notes"], [["Coffee, Inc.", 'said "hello"\nagain']]);

    expect(csv).toBe('merchant,notes\n"Coffee, Inc.","said ""hello""\nagain"');
  });
});

describe("buildExportFilename", () => {
  it("uses stable extensions by format", () => {
    const date = new Date("2026-05-27T12:00:00.000Z");

    expect(buildExportFilename("transactions_csv", date)).toBe("vault-transactions_csv-2026-05-27.csv");
    expect(buildExportFilename("backup_package", date)).toBe("vault-backup_package-2026-05-27.json");
  });
});
