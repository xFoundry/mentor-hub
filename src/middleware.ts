import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * Middleware for Route Protection (Auth0 SDK v4)
 *
 * In v4, auth0.middleware() handles:
 * - /auth/login - Initiates login
 * - /auth/logout - Logs out user
 * - /auth/callback - Handles OAuth callback
 * - Session management for all routes
 *
 * Protected routes: /dashboard, /sessions, /tasks, /teams, /mentors,
 *                   /students, /feedback, /settings, /impersonate
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if auth mock is enabled
  const isAuthMockEnabled = process.env.NEXT_PUBLIC_USE_AUTH_MOCK === "true";

  // In mock mode, skip Auth0 entirely
  if (isAuthMockEnabled) {
    // Still handle root redirect in mock mode
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Handle root path BEFORE Auth0 middleware - redirect based on auth status
  if (pathname === "/") {
    // Need to call middleware first to get session info
    await auth0.middleware(request);
    const session = await auth0.getSession(request);
    if (session) {
      // Authenticated users go to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      // Unauthenticated users go to login page
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Let Auth0 middleware handle the request (manages sessions and /auth/* routes)
  const authRes = await auth0.middleware(request);

  // Let Auth0 handle its own routes (/auth/login, /auth/logout, /auth/callback)
  if (pathname.startsWith("/auth")) {
    return authRes;
  }

  // Public paths that don't require authentication
  const publicPaths = ["/login", "/signup", "/api/verify-email"];
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(path))) {
    return authRes;
  }

  // Protected routes that require authentication
  const protectedPaths = [
    "/dashboard",
    "/sessions",
    "/tasks",
    "/teams",
    "/mentors",
    "/students",
    "/feedback",
    "/settings",
    "/impersonate",
  ];
  const isProtectedRoute = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (!isProtectedRoute) {
    return authRes;
  }

  // Check for valid session on protected routes
  const session = await auth0.getSession(request);

  if (!session) {
    // User is not authenticated, redirect to login
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, continue with auth response headers
  return authRes;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
