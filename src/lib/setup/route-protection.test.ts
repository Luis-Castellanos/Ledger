import { describe, expect, it } from "vitest";
import { proxyMatcher, publicRoutePatterns } from "./route-protection";

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
