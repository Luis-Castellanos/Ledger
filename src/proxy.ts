import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { publicRoutePatterns } from "@/lib/setup/route-protection";

const hasClerkConfig = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
const isProduction = process.env.NODE_ENV === "production";
const isPublicRoute = createRouteMatcher([...publicRoutePatterns]);
const isHealthRoute = (pathname: string) => pathname === "/api/health";
const isApiRoute = (pathname: string) => pathname.startsWith("/api/");

const missingAuthProxy = (request: Request) => {
  if (isHealthRoute(new URL(request.url).pathname)) {
    return NextResponse.next();
  }

  if (!isProduction) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
};

export default hasClerkConfig
  ? clerkMiddleware(async (auth, request) => {
      if (isHealthRoute(request.nextUrl.pathname)) {
        return NextResponse.next();
      }

      if (!isPublicRoute(request)) {
        if (isApiRoute(request.nextUrl.pathname)) {
          await auth.protect();
        } else {
          await auth.protect({ unauthenticatedUrl: "/sign-in" });
        }
      }
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
