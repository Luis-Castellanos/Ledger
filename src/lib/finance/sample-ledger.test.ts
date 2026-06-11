import { describe, expect, it } from "vitest";
import { generateSampleLedger, SAMPLE_ACCOUNTS } from "./sample-ledger";

describe("generateSampleLedger", () => {
  const sample = generateSampleLedger(new Date("2026-06-11T12:00:00Z"));

  it("produces a meaningful spread of transactions", () => {
    expect(sample.transactions.length).toBeGreaterThan(80);
    expect(sample.transactions.some((t) => t.amountMinor > 0)).toBe(true);
    expect(sample.transactions.some((t) => t.amountMinor < 0)).toBe(true);
  });

  it("never dates transactions in the future", () => {
    const today = "2026-06-11";
    expect(sample.transactions.every((t) => t.date <= today)).toBe(true);
  });

  it("leaves some transactions to review", () => {
    expect(sample.transactions.some((t) => t.reviewStatus === "needs_review")).toBe(true);
  });

  it("keeps the savings transfer legs balanced to zero", () => {
    const transferTotal = sample.transactions
      .filter((t) => t.transferStatus === "transfer" && /SAVINGS|FROM CHECKING/.test(t.description))
      .reduce((sum, t) => sum + t.amountMinor, 0);
    expect(transferTotal).toBe(0);
  });

  it("references only known account keys", () => {
    const keys = new Set(SAMPLE_ACCOUNTS.map((a) => a.key));
    expect(sample.transactions.every((t) => keys.has(t.accountKey))).toBe(true);
    expect(sample.snapshots.every((s) => keys.has(s.accountKey))).toBe(true);
  });

  it("ships budgets, goals, and rules", () => {
    expect(sample.budgets.length).toBeGreaterThan(0);
    expect(sample.goals.length).toBe(2);
    expect(sample.rules.length).toBeGreaterThan(0);
  });
});
