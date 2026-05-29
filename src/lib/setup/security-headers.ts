export type SecurityHeader = {
  key: string;
  value: string;
};

const clerkSources = ["https://*.clerk.accounts.dev", "https://*.clerk.com", "https://clerk.praxisledger.app", "https://accounts.praxisledger.app"];

export function buildContentSecurityPolicy() {
  const directives = [
    ["default-src", "'self'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ["object-src", "'none'"],
    ["script-src", "'self'", "'unsafe-inline'", "'unsafe-eval'", ...clerkSources, "https://challenges.cloudflare.com"],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:", "https://img.clerk.com", "https://images.clerk.dev", ...clerkSources],
    ["font-src", "'self'", "data:"],
    ["connect-src", "'self'", ...clerkSources, "https://api.clerk.com"],
    ["frame-src", ...clerkSources, "https://challenges.cloudflare.com"],
    ["worker-src", "'self'", "blob:"],
    ["upgrade-insecure-requests"],
  ];

  return directives.map((directive) => directive.join(" ")).join("; ");
}

export function getSecurityHeaders(): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(),
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ];
}
