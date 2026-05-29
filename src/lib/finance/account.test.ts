import { describe, expect, it } from "vitest";
import { createAccountSchema, createBalanceSnapshotApiSchema, createBalanceSnapshotSchema, updateAccountLifecycleSchema } from "./account";

const accountId = "550e8400-e29b-41d4-a716-446655440001";

describe("account validation", () => {
  it("normalizes currency codes", () => {
    expect(
      createAccountSchema.parse({
        name: "Operating Checking",
        type: "checking",
        assetClass: "asset",
        currency: "usd",
      }).currency,
    ).toBe("USD");
  });

  it("rejects unsafe account masks", () => {
    expect(() =>
      createAccountSchema.parse({
        name: "Rewards Card",
        mask: "abc123",
        type: "credit_card",
        assetClass: "liability",
        currency: "USD",
      }),
    ).toThrow();
  });
});

describe("account lifecycle validation", () => {
  it("allows close and reopen actions", () => {
    expect(updateAccountLifecycleSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000", action: "close", closedOn: "2026-05-28" }).success).toBe(true);
    expect(updateAccountLifecycleSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000", action: "reopen" }).success).toBe(true);
  });
});

describe("balance snapshot validation", () => {
  it("parses formatted balances to minor units", () => {
    expect(
      createBalanceSnapshotSchema.parse({
        accountId,
        asOfDate: "2026-05-28",
        balance: "$1,250.42",
      }).balance,
    ).toBe(125042);
  });

  it("rejects invalid dates and balances", () => {
    expect(
      createBalanceSnapshotApiSchema.safeParse({
        accountId,
        asOfDate: "05/28/2026",
        balance: "nope",
      }).success,
    ).toBe(false);
  });

  it("rejects malformed account ids before they reach database queries", () => {
    expect(
      createBalanceSnapshotApiSchema.safeParse({
        accountId: "local_1",
        asOfDate: "2026-05-28",
        balance: "$1,250.42",
      }).success,
    ).toBe(false);
  });
});
