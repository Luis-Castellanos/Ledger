import { describe, expect, it } from "vitest";
import { budgetMonthBounds, budgetMonthSchema, copyBudgetsSchema, rollUpSpending, upsertBudgetSchema } from "./budget";

describe("budget schemas", () => {
  it("accepts valid months and rejects junk", () => {
    expect(budgetMonthSchema.safeParse("2026-06").success).toBe(true);
    expect(budgetMonthSchema.safeParse("2026-13").success).toBe(false);
    expect(budgetMonthSchema.safeParse("2026-6").success).toBe(false);
    expect(budgetMonthSchema.safeParse("junk").success).toBe(false);
  });

  it("parses budget amounts to positive minor units", () => {
    const parsed = upsertBudgetSchema.parse({
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
      month: "2026-06",
      amount: "450.00",
    });
    expect(parsed.amount).toBe(45000);

    expect(
      upsertBudgetSchema.safeParse({
        categoryId: "550e8400-e29b-41d4-a716-446655440000",
        month: "2026-06",
        amount: "-10",
      }).success,
    ).toBe(false);
  });

  it("rejects copying a month onto itself", () => {
    expect(copyBudgetsSchema.safeParse({ fromMonth: "2026-05", toMonth: "2026-05" }).success).toBe(false);
    expect(copyBudgetsSchema.safeParse({ fromMonth: "2026-05", toMonth: "2026-06" }).success).toBe(true);
  });
});

describe("budgetMonthBounds", () => {
  it("returns the first of the month and the first of the next month", () => {
    expect(budgetMonthBounds("2026-06")).toEqual({ start: "2026-06-01", end: "2026-07-01" });
  });

  it("rolls over December", () => {
    expect(budgetMonthBounds("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("rollUpSpending", () => {
  const categories = [
    { id: "food", parentId: null },
    { id: "groceries", parentId: "food" },
    { id: "restaurants", parentId: "food" },
    { id: "transport", parentId: null },
  ];

  it("rolls child spending into an unbudgeted parent", () => {
    const spent = new Map([
      ["food", 1000],
      ["groceries", 5000],
      ["restaurants", 2000],
    ]);
    const rolled = rollUpSpending(categories, spent, new Set());
    expect(rolled.get("food")).toBe(8000);
    expect(rolled.get("groceries")).toBe(5000);
  });

  it("keeps child spending out of the parent when the child has its own budget", () => {
    const spent = new Map([
      ["food", 1000],
      ["groceries", 5000],
    ]);
    const rolled = rollUpSpending(categories, spent, new Set(["groceries"]));
    expect(rolled.get("food")).toBe(1000);
    expect(rolled.get("groceries")).toBe(5000);
  });

  it("handles categories with no spending", () => {
    const rolled = rollUpSpending(categories, new Map(), new Set());
    expect(rolled.get("transport")).toBe(0);
  });
});
