import { describe, expect, it } from "vitest";
import {
  buildImportFingerprint,
  buildImportTransactionInsert,
  importActionParamsSchema,
  savedImportMappingApiSchema,
  stageImportApiSchema,
  stageImportSchema,
  updateImportRowSchema,
} from "./import";
import { parseCsvImportRows } from "./import-csv";

const accountId = "550e8400-e29b-41d4-a716-446655440001";

describe("stageImportSchema", () => {
  it("parses staged row amounts into minor units", () => {
    const parsed = stageImportSchema.parse({
      accountId,
      filename: "checking.csv",
      rows: [{ rowNumber: 1, date: "2026-05-27", description: "Coffee", amount: "-4.25" }],
    });

    expect(parsed.rows[0]?.amount).toBe(-425);
    expect(parsed.rows[0]?.status).toBe("needs_review");
  });

  it("rejects empty import files", () => {
    const parsed = stageImportSchema.safeParse({ accountId, filename: "empty.csv", rows: [] });

    expect(parsed.success).toBe(false);
  });

  it("rejects malformed account ids before they reach database queries", () => {
    const parsed = stageImportApiSchema.safeParse({
      accountId: "account_1",
      filename: "checking.csv",
      rows: [{ rowNumber: 1, date: "2026-05-27", description: "Coffee", amount: "-4.25" }],
    });

    expect(parsed.success).toBe(false);
  });
});

describe("savedImportMappingSchema", () => {
  it("requires enough columns to map a CSV amount", () => {
    expect(
      savedImportMappingApiSchema.safeParse({
        name: "Checking CSV",
        mapping: {
          date: "Transaction Date",
          description: "Memo",
          amount: "Amount",
          category: "Category",
        },
      }).success,
    ).toBe(true);

    expect(
      savedImportMappingApiSchema.safeParse({
        name: "Broken mapping",
        mapping: {
          date: "Transaction Date",
          description: "Memo",
        },
      }).success,
    ).toBe(false);
  });

  it("rejects malformed scoped account ids", () => {
    expect(
      savedImportMappingApiSchema.safeParse({
        accountId: "account_1",
        name: "Checking CSV",
        mapping: {
          date: "Transaction Date",
          description: "Memo",
          amount: "Amount",
        },
      }).success,
    ).toBe(false);
  });

  it("parses CSV rows with an explicit saved mapping", () => {
    const rows = parseCsvImportRows("Posted,Payee,Value,Group\n05/27/2026,Coffee,-4.25,Restaurants", {
      date: "Posted",
      description: "Payee",
      amount: "Value",
      category: "Group",
    });

    expect(rows[0]).toMatchObject({
      amountMinor: -425,
      category: "Restaurants",
      date: "2026-05-27",
      description: "Coffee",
    });
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

describe("importActionParamsSchema", () => {
  it("requires a uuid import id", () => {
    expect(importActionParamsSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" }).success).toBe(true);
    expect(importActionParamsSchema.safeParse({ id: "import_local" }).success).toBe(false);
  });
});

describe("buildImportFingerprint", () => {
  it("returns stable fingerprints for identical payloads", () => {
    const input = {
      accountId,
      filename: "checking.csv",
      rows: [{ rowNumber: 1, date: "2026-05-27", description: "Coffee", amount: -425, category: "Uncategorized", status: "needs_review" as const }],
    };

    expect(buildImportFingerprint(input)).toBe(buildImportFingerprint(input));
  });
});

describe("buildImportTransactionInsert", () => {
  it("uses transaction identity rather than import batch identity for dedupe", () => {
    const first = buildImportTransactionInsert({
      ledgerId: "550e8400-e29b-41d4-a716-446655440010",
      accountId,
      currency: "USD",
      rowId: "550e8400-e29b-41d4-a716-446655440020",
      parsedDate: "2026-05-27",
      parsedAmountMinor: -425,
      parsedDescription: "Coffee",
      proposedCategoryId: null,
      validationStatus: "accepted",
    });
    const second = buildImportTransactionInsert({
      ledgerId: "550e8400-e29b-41d4-a716-446655440010",
      accountId,
      currency: "USD",
      rowId: "550e8400-e29b-41d4-a716-446655440021",
      parsedDate: "2026-05-27",
      parsedAmountMinor: -425,
      parsedDescription: "  COFFEE  ",
      proposedCategoryId: null,
      validationStatus: "needs_review",
    });

    expect(first.dedupeKey).toBe(second.dedupeKey);
    expect(first.reviewStatus).toBe("reviewed");
    expect(second.reviewStatus).toBe("needs_review");
  });
});
