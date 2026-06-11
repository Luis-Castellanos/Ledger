import { describe, expect, it } from "vitest";
import { createGoalSchema, goalPercent, goalProgressMinor, updateGoalSchema } from "./goal";

describe("goal schemas", () => {
  it("parses creation input with minor units", () => {
    const parsed = createGoalSchema.parse({
      name: "Emergency fund",
      targetAmount: "10,000",
      startingAmount: "0",
    });
    expect(parsed.targetAmount).toBe(1_000_000);
    expect(parsed.startingAmount).toBe(0);
  });

  it("rejects non-positive targets", () => {
    expect(createGoalSchema.safeParse({ name: "X", targetAmount: "0" }).success).toBe(false);
    expect(createGoalSchema.safeParse({ name: "X", targetAmount: "-5" }).success).toBe(false);
  });

  it("allows negative contributions (withdrawals)", () => {
    const parsed = updateGoalSchema.parse({ contribute: "-25.00" });
    expect(parsed.contribute).toBe(-2500);
  });
});

describe("goal progress", () => {
  it("uses account balance delta for linked goals", () => {
    const progress = goalProgressMinor(
      { accountId: "acct", startingAmountMinor: 100_00, manualProgressMinor: 0, targetAmountMinor: 1000_00 },
      350_00,
    );
    expect(progress).toBe(250_00);
  });

  it("never reports negative progress", () => {
    const progress = goalProgressMinor(
      { accountId: "acct", startingAmountMinor: 500_00, manualProgressMinor: 0, targetAmountMinor: 1000_00 },
      350_00,
    );
    expect(progress).toBe(0);
  });

  it("falls back to manual progress when unlinked or balance missing", () => {
    expect(
      goalProgressMinor({ accountId: null, startingAmountMinor: 0, manualProgressMinor: 4200, targetAmountMinor: 10000 }, null),
    ).toBe(4200);
    expect(
      goalProgressMinor({ accountId: "acct", startingAmountMinor: 0, manualProgressMinor: 4200, targetAmountMinor: 10000 }, null),
    ).toBe(4200);
  });

  it("caps percent at 100", () => {
    expect(goalPercent(5000, 10000)).toBe(50);
    expect(goalPercent(20000, 10000)).toBe(100);
    expect(goalPercent(100, 0)).toBe(0);
  });
});
