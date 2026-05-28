import { describe, expect, it } from "vitest";
import { updateLedgerSettingsSchema } from "./settings";

describe("updateLedgerSettingsSchema", () => {
  it("normalizes currency codes", () => {
    const parsed = updateLedgerSettingsSchema.parse({
      name: "Personal Control File",
      defaultCurrency: "usd",
    });

    expect(parsed).toEqual({
      name: "Personal Control File",
      defaultCurrency: "USD",
    });
  });

  it("rejects missing ledger names", () => {
    const parsed = updateLedgerSettingsSchema.safeParse({
      name: " ",
      defaultCurrency: "USD",
    });

    expect(parsed.success).toBe(false);
  });
});
