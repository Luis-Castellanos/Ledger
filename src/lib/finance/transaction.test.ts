import { describe, expect, it } from "vitest";
import {
  buildTransactionDedupeKey,
  buildUpdatedTransactionDedupeKey,
  createManualTransactionApiSchema,
  createManualTransactionSchema,
  decodeTransactionCursor,
  encodeTransactionCursor,
  parseTagList,
  transactionListQuerySchema,
  updateTransactionReviewSchema,
} from "./transaction";

const accountId = "550e8400-e29b-41d4-a716-446655440001";

describe("createManualTransactionSchema", () => {
  it("parses signed dollar amounts to minor units", () => {
    const parsed = createManualTransactionSchema.parse({
      date: "2026-05-27",
      accountId,
      merchant: "Local Bookstore",
      categoryName: "Shopping",
      amount: "-31.45",
    });

    expect(parsed.amount).toBe(-3145);
  });

  it("rejects invalid transaction dates", () => {
    const parsed = createManualTransactionApiSchema.safeParse({
      date: "05/27/2026",
      accountId,
      merchant: "Local Bookstore",
      amount: "-31.45",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects malformed account ids before they reach database queries", () => {
    const parsed = createManualTransactionApiSchema.safeParse({
      date: "2026-05-27",
      accountId: "account_1",
      merchant: "Local Bookstore",
      amount: "-31.45",
    });

    expect(parsed.success).toBe(false);
  });

  it("normalizes optional transaction tags", () => {
    const parsed = createManualTransactionSchema.parse({
      date: "2026-05-27",
      accountId,
      merchant: "Local Bookstore",
      categoryName: "Shopping",
      amount: "-31.45",
      tags: ["tax", " tax ", "reimbursable"],
    });

    expect(parsed.tags).toEqual(["tax", "reimbursable"]);
    expect(parseTagList("tax, reimbursable, tax")).toEqual(["tax", "reimbursable"]);
  });
});

describe("buildTransactionDedupeKey", () => {
  const input = {
    ledgerId: "550e8400-e29b-41d4-a716-446655440000",
    accountId,
    date: "2026-05-27",
    amountMinor: -3145,
    rawDescription: "Local Bookstore",
  };

  it("builds a stable content-derived key", () => {
    expect(buildTransactionDedupeKey(input)).toBe(
      buildTransactionDedupeKey({
        ...input,
        rawDescription: "  LOCAL   BOOKSTORE  ",
      }),
    );
  });

  it("changes when transaction identity fields change", () => {
    const key = buildTransactionDedupeKey(input);

    expect(buildTransactionDedupeKey({ ...input, ledgerId: "550e8400-e29b-41d4-a716-446655440099" })).not.toBe(key);
    expect(buildTransactionDedupeKey({ ...input, accountId: "550e8400-e29b-41d4-a716-446655440099" })).not.toBe(key);
    expect(buildTransactionDedupeKey({ ...input, date: "2026-05-28" })).not.toBe(key);
    expect(buildTransactionDedupeKey({ ...input, amountMinor: -3146 })).not.toBe(key);
    expect(buildTransactionDedupeKey({ ...input, rawDescription: "Different Store" })).not.toBe(key);
  });
});

describe("buildUpdatedTransactionDedupeKey", () => {
  const current = {
    ledgerId: "550e8400-e29b-41d4-a716-446655440000",
    accountId,
    date: "2026-05-27",
    amountMinor: -3145,
    rawDescription: "Local Bookstore",
  };

  it("preserves the current identity when no dedupe fields change", () => {
    expect(buildUpdatedTransactionDedupeKey(current, {})).toBe(buildTransactionDedupeKey(current));
  });

  it("rebuilds the key from patched identity fields", () => {
    expect(buildUpdatedTransactionDedupeKey(current, { amountMinor: -1200, rawDescription: "Updated Merchant" })).toBe(
      buildTransactionDedupeKey({
        ...current,
        amountMinor: -1200,
        rawDescription: "Updated Merchant",
      }),
    );
  });
});

describe("updateTransactionReviewSchema", () => {
  it("allows review status updates", () => {
    const parsed = updateTransactionReviewSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      reviewStatus: "reviewed",
    });

    expect(parsed.success).toBe(true);
  });

  it("allows transfer status updates", () => {
    const parsed = updateTransactionReviewSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      transferStatus: "transfer",
    });

    expect(parsed.success).toBe(true);
  });

  it("allows lifecycle actions", () => {
    expect(updateTransactionReviewSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000", action: "delete" }).success).toBe(true);
    expect(updateTransactionReviewSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000", action: "restore" }).success).toBe(true);
  });

  it("allows tag updates", () => {
    const parsed = updateTransactionReviewSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      tags: ["tax", " tax ", "reimbursable"],
    });

    expect(parsed.tags).toEqual(["tax", "reimbursable"]);
  });

  it("allows core transaction field edits", () => {
    const parsed = updateTransactionReviewSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      date: "2026-05-28",
      merchant: "Updated Merchant",
      amount: "-12.34",
      notes: "Receipt reviewed.",
    });

    expect(parsed.amount).toBe(-1234);
  });
});

describe("transaction list query", () => {
  it("parses defaults", () => {
    const parsed = transactionListQuerySchema.parse({});
    expect(parsed.sort).toBe("date_desc");
    expect(parsed.limit).toBe(100);
  });

  it("rejects malformed filters", () => {
    expect(transactionListQuerySchema.safeParse({ accountId: "not-a-uuid" }).success).toBe(false);
    expect(transactionListQuerySchema.safeParse({ limit: "9999" }).success).toBe(false);
    expect(transactionListQuerySchema.safeParse({ sort: "chaos" }).success).toBe(false);
    expect(transactionListQuerySchema.safeParse({ direction: "sideways" }).success).toBe(false);
  });

  it("round-trips cursors", () => {
    const dateCursor = { v: "2026-05-01", c: "2026-05-01T10:00:00.000Z", id: "550e8400-e29b-41d4-a716-446655440000" };
    expect(decodeTransactionCursor(encodeTransactionCursor(dateCursor))).toEqual(dateCursor);

    const amountCursor = { v: -1234, id: "550e8400-e29b-41d4-a716-446655440000" };
    expect(decodeTransactionCursor(encodeTransactionCursor(amountCursor))).toEqual({ ...amountCursor, c: undefined });
  });

  it("rejects malformed cursors", () => {
    expect(decodeTransactionCursor("not-base64-json")).toBeNull();
    expect(decodeTransactionCursor(Buffer.from("[1,2]").toString("base64url"))).toBeNull();
    expect(decodeTransactionCursor(Buffer.from(JSON.stringify({ v: true, id: "x" })).toString("base64url"))).toBeNull();
    expect(decodeTransactionCursor(Buffer.from(JSON.stringify({ v: "2026-05-01" })).toString("base64url"))).toBeNull();
  });
});
