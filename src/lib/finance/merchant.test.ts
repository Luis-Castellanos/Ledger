import { describe, expect, it } from "vitest";
import { merchantPrefix } from "./merchant";

describe("merchantPrefix", () => {
  it("keeps the stable merchant prefix and drops terminal ids", () => {
    expect(merchantPrefix("PAPA JOHNS #4558")).toBe("PAPA JOHNS");
    expect(merchantPrefix("APPLE.COM/BILL 866-712")).toBe("APPLE.COM/BILL");
  });

  it("handles blank and numeric-only descriptions", () => {
    expect(merchantPrefix("")).toBe("");
    expect(merchantPrefix("12345")).toBe("12345");
  });
});
