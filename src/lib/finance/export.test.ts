import { describe, expect, it } from "vitest";
import { buildBackupPackage, buildExportFilename, isExportFormat, toCsv } from "./export";

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

describe("buildBackupPackage", () => {
  it("creates a stable manifest with ledger identity and table counts", () => {
    const backup = buildBackupPackage({
      ledger: {
        id: "ledger_123",
        name: "Personal ledger",
        defaultCurrency: "USD",
      },
      exportedAt: new Date("2026-05-27T12:00:00.000Z"),
      appVersion: "0.1.0-test",
      data: {
        accounts: [{ id: "account_1" }],
        transactions: [{ id: "transaction_1" }, { id: "transaction_2" }],
        auditEvents: [],
      },
    });

    expect(backup.manifest).toEqual({
      formatVersion: 1,
      exportedAt: "2026-05-27T12:00:00.000Z",
      appVersion: "0.1.0-test",
      ledgerId: "ledger_123",
      ledgerName: "Personal ledger",
      defaultCurrency: "USD",
      tableCounts: {
        accounts: 1,
        transactions: 2,
        auditEvents: 0,
      },
    });
  });

  it("keeps the documented V1 table set stable", () => {
    const backup = buildBackupPackage({
      ledger: {
        id: "ledger_123",
        name: "Personal ledger",
        defaultCurrency: "USD",
      },
      data: {
        accounts: [],
        categories: [],
        transactions: [],
        imports: [],
        importRows: [],
        auditEvents: [],
      },
    });

    expect(Object.keys(backup.data)).toEqual(["accounts", "categories", "transactions", "imports", "importRows", "auditEvents"]);
    expect(Object.keys(backup.manifest.tableCounts)).toEqual(["accounts", "categories", "transactions", "imports", "importRows", "auditEvents"]);
  });
});
