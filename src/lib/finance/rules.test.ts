import { describe, expect, it } from "vitest";
import { createCategorySchema, createMerchantRuleSchema, normalizeRuleMatchValue, slugifyCategoryName } from "./rules";

describe("createCategorySchema", () => {
  it("defaults new categories to expense flow", () => {
    const parsed = createCategorySchema.parse({ name: "Professional Dues" });

    expect(parsed.flowType).toBe("expense");
  });
});

describe("createMerchantRuleSchema", () => {
  it("validates merchant rule inputs", () => {
    const parsed = createMerchantRuleSchema.safeParse({
      name: "Apple subscriptions",
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
      matchValue: "APPLE.COM/BILL",
    });

    expect(parsed.success).toBe(true);
  });
});

describe("rule helpers", () => {
  it("normalizes names and match values", () => {
    expect(slugifyCategoryName("Professional Dues & Fees")).toBe("professional-dues-fees");
    expect(normalizeRuleMatchValue("  APPLE.COM   BILL ")).toBe("apple.com bill");
  });
});
