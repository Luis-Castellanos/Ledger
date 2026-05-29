export const publicRoutePatterns = ["/sign-in(.*)", "/sign-up(.*)", "/api/health", "/__clerk(.*)"] as const;

export const proxyMatcher = [
  "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  "/(api|trpc)(.*)",
  "/__clerk/(.*)",
] as const;

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function shouldBlockCrossSiteApiRequest(request: Request) {
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/api/")) {
    return false;
  }

  const isStateChanging = !safeMethods.has(request.method.toUpperCase());

  if (!isStateChanging) {
    return false;
  }

  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") {
    return true;
  }

  const origin = request.headers.get("origin");

  if (origin && origin !== url.origin) {
    return true;
  }

  return false;
}
