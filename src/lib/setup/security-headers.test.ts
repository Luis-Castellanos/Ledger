import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, getSecurityHeaders } from "./security-headers";

describe("getSecurityHeaders", () => {
  it("includes the private-beta release security headers", () => {
    const headerNames = getSecurityHeaders().map((header) => header.key);

    expect(headerNames).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
      ]),
    );
  });
});

describe("buildContentSecurityPolicy", () => {
  it("blocks framing and object embeds while allowing Clerk auth assets", () => {
    const policy = buildContentSecurityPolicy();

    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("https://*.clerk.accounts.dev");
    expect(policy).toContain("https://*.clerk.com");
    expect(policy).toContain("upgrade-insecure-requests");
  });
});
