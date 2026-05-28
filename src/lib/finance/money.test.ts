import { describe, expect, it } from "vitest";
import { formatMoney, parseDollarAmount } from "./money";

describe("money helpers", () => {
  it("formats integer minor units as dollars", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
    expect(formatMoney(-999)).toBe("-$9.99");
  });

  it("parses display amounts into integer minor units", () => {
    expect(parseDollarAmount("$1,234.56")).toBe(123456);
    expect(parseDollarAmount("-9.99")).toBe(-999);
  });
});
