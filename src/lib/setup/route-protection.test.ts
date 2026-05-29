import { describe, expect, it } from "vitest";
import { proxyMatcher, publicRoutePatterns, shouldBlockCrossSiteApiRequest } from "./route-protection";

describe("route protection policy", () => {
  it("keeps the app protected by default", () => {
    expect(publicRoutePatterns).toEqual(["/sign-in(.*)", "/sign-up(.*)", "/api/health", "/__clerk(.*)"]);
    expect(publicRoutePatterns).not.toContain("/");
    expect(publicRoutePatterns).not.toContain("/settings(.*)");
    expect(publicRoutePatterns).not.toContain("/transactions(.*)");
  });

  it("keeps Clerk proxy traffic matched after API traffic", () => {
    expect(proxyMatcher).toContain("/(api|trpc)(.*)");
    expect(proxyMatcher).toContain("/__clerk/(.*)");
    expect(proxyMatcher.indexOf("/__clerk/(.*)")).toBeGreaterThan(proxyMatcher.indexOf("/(api|trpc)(.*)"));
  });
});

describe("cross-site API request guard", () => {
  it("blocks cross-site mutating API requests", () => {
    const request = new Request("https://praxisledger.app/api/transactions", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });

    expect(shouldBlockCrossSiteApiRequest(request)).toBe(true);
  });

  it("blocks cross-origin API writes even when fetch metadata is unavailable", () => {
    const request = new Request("https://praxisledger.app/api/accounts", {
      method: "PATCH",
      headers: { origin: "https://attacker.example" },
    });

    expect(shouldBlockCrossSiteApiRequest(request)).toBe(true);
  });

  it("blocks export generation POSTs from cross-site contexts", () => {
    const request = new Request("https://praxisledger.app/api/exports", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });

    expect(shouldBlockCrossSiteApiRequest(request)).toBe(true);
  });

  it("allows same-origin reads and writes", () => {
    expect(
      shouldBlockCrossSiteApiRequest(
        new Request("https://praxisledger.app/api/transactions", {
          headers: { "sec-fetch-site": "same-origin" },
        }),
      ),
    ).toBe(false);
    expect(
      shouldBlockCrossSiteApiRequest(
        new Request("https://praxisledger.app/api/transactions", {
          method: "POST",
          headers: { origin: "https://praxisledger.app" },
        }),
      ),
    ).toBe(false);
  });
});
