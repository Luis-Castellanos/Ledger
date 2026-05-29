import { describe, expect, it } from "vitest";
import {
  createCategorySchema,
  createMerchantRuleApiSchema,
  createMerchantRuleSchema,
  findMatchingMerchantRule,
  normalizeRuleMatchValue,
  slugifyCategoryName,
  updateCategoryApiSchema,
  updateCategorySchema,
} from "./rules";

describe("createCategorySchema", () => {
  it("defaults new categories to expense flow", () => {
    const parsed = createCategorySchema.parse({ name: "Professional Dues" });

    expect(parsed.flowType).toBe("expense");
  });
});

describe("updateCategorySchema", () => {
  it("requires at least one editable category field", () => {
    expect(updateCategorySchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" }).success).toBe(false);
    expect(updateCategorySchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000", isArchived: true }).success).toBe(true);
  });

  it("rejects malformed category ids before they reach database queries", () => {
    expect(updateCategoryApiSchema.safeParse({ id: "category_1", isArchived: true }).success).toBe(false);
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

  it("rejects malformed foreign keys before they reach database queries", () => {
    expect(
      createMerchantRuleApiSchema.safeParse({
        name: "Apple subscriptions",
        categoryId: "category_1",
        matchValue: "APPLE.COM/BILL",
      }).success,
    ).toBe(false);
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

  it("respects account-scoped rules", () => {
    const rules = [
      { accountId: "account_1", categoryId: "subscriptions", matchType: "contains", normalizedMatchValue: "apple.com" },
      { accountId: null, categoryId: "shopping", matchType: "contains", normalizedMatchValue: "costco" },
    ];

    expect(findMatchingMerchantRule("APPLE.COM/BILL", rules, "account_1")?.categoryId).toBe("subscriptions");
    expect(findMatchingMerchantRule("APPLE.COM/BILL", rules, "account_2")?.categoryId).toBeUndefined();
    expect(findMatchingMerchantRule("COSTCO WHSE", rules, "account_2")?.categoryId).toBe("shopping");
  });
});
