import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { publicRoutePatterns, shouldBlockCrossSiteApiRequest } from "@/lib/setup/route-protection";
import { getSecurityHeaders } from "@/lib/setup/security-headers";

const hasClerkConfig = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
const isProduction = process.env.NODE_ENV === "production";
const isPublicRoute = createRouteMatcher([...publicRoutePatterns]);
const isHealthRoute = (pathname: string) => pathname === "/api/health";
const isApiRoute = (pathname: string) => pathname.startsWith("/api/");

function withSecurityHeaders(response: NextResponse) {
  for (const header of getSecurityHeaders()) {
    response.headers.set(header.key, header.value);
  }

  return response;
}

const missingAuthProxy = (request: Request) => {
  if (isHealthRoute(new URL(request.url).pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (!isProduction) {
    return withSecurityHeaders(NextResponse.next());
  }

  return withSecurityHeaders(NextResponse.json({ error: "Authentication is not configured." }, { status: 503 }));
};

export default hasClerkConfig
  ? clerkMiddleware(async (auth, request) => {
      if (shouldBlockCrossSiteApiRequest(request)) {
        return withSecurityHeaders(NextResponse.json({ error: "Cross-site API request blocked." }, { status: 403 }));
      }

      if (isHealthRoute(request.nextUrl.pathname)) {
        return withSecurityHeaders(NextResponse.next());
      }

      if (!isPublicRoute(request)) {
        if (isApiRoute(request.nextUrl.pathname)) {
          await auth.protect();
        } else {
          await auth.protect({ unauthenticatedUrl: new URL("/sign-in", request.url).toString() });
        }
      }

      return withSecurityHeaders(NextResponse.next());
    })
  : missingAuthProxy;

export const config = {
  // Next.js requires matcher entries to be static literals in this file.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
