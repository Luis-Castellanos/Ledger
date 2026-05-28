import { describe, expect, it } from "vitest";
import { createManualTransactionSchema, parseTagList, updateTransactionReviewSchema } from "./transaction";

describe("createManualTransactionSchema", () => {
  it("parses signed dollar amounts to minor units", () => {
    const parsed = createManualTransactionSchema.parse({
      date: "2026-05-27",
      accountId: "account_1",
      merchant: "Local Bookstore",
      categoryName: "Shopping",
      amount: "-31.45",
    });

    expect(parsed.amount).toBe(-3145);
  });

  it("rejects invalid transaction dates", () => {
    const parsed = createManualTransactionSchema.safeParse({
      date: "05/27/2026",
      accountId: "account_1",
      merchant: "Local Bookstore",
      amount: "-31.45",
    });

    expect(parsed.success).toBe(false);
  });

  it("normalizes optional transaction tags", () => {
    const parsed = createManualTransactionSchema.parse({
      date: "2026-05-27",
      accountId: "account_1",
      merchant: "Local Bookstore",
      categoryName: "Shopping",
      amount: "-31.45",
      tags: ["tax", " tax ", "reimbursable"],
    });

    expect(parsed.tags).toEqual(["tax", "reimbursable"]);
    expect(parseTagList("tax, reimbursable, tax")).toEqual(["tax", "reimbursable"]);
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
});
