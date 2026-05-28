import { describe, expect, it } from "vitest";
import { createCategorySchema, createMerchantRuleSchema, findMatchingMerchantRule, normalizeRuleMatchValue, slugifyCategoryName } from "./rules";

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

  it("matches merchant descriptions by rule type", () => {
    const rules = [
      { categoryId: "subscriptions", matchType: "contains", normalizedMatchValue: "apple.com" },
      { categoryId: "coffee", matchType: "starts_with", normalizedMatchValue: "blue bottle" },
      { categoryId: "income", matchType: "exact", normalizedMatchValue: "payroll deposit" },
    ];

    expect(findMatchingMerchantRule("POS APPLE.COM/BILL", rules)?.categoryId).toBe("subscriptions");
    expect(findMatchingMerchantRule("Blue Bottle Coffee", rules)?.categoryId).toBe("coffee");
    expect(findMatchingMerchantRule("Payroll Deposit", rules)?.categoryId).toBe("income");
    expect(findMatchingMerchantRule("Payroll Deposit Extra", rules)?.categoryId).toBeUndefined();
  });
});
