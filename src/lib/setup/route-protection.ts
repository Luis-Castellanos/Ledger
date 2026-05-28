export const publicRoutePatterns = ["/sign-in(.*)", "/sign-up(.*)", "/api/health", "/__clerk(.*)"] as const;

export const proxyMatcher = [
  "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  "/(api|trpc)(.*)",
  "/__clerk/(.*)",
] as const;
