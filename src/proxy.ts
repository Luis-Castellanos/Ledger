import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const hasClerkConfig = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
const isProduction = process.env.NODE_ENV === "production";
const isProtectedRoute = createRouteMatcher(["/", "/api(.*)"]);
const isHealthRoute = (pathname: string) => pathname === "/api/health";

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

      if (isProtectedRoute(request)) {
        await auth.protect();
      }
    })
  : missingAuthProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
