import { describe, expect, it } from "vitest";
import { createAccountSchema } from "./account";

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
