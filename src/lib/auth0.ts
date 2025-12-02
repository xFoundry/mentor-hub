import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

/**
 * Auth0 Server Client (SDK v4)
 *
 * In v4, the middleware handles all auth routes automatically:
 * - /auth/login - Initiates login (supports ?connection=google-oauth2 or ?connection=email)
 * - /auth/logout - Logs out the user
 * - /auth/callback - Handles OAuth callback
 *
 * Custom login parameters (connection, login_hint, returnTo) are passed via query params.
 *
 * Environment Variables Required:
 * - AUTH0_DOMAIN: Your Auth0 tenant domain
 * - AUTH0_CLIENT_ID: Application client ID
 * - AUTH0_CLIENT_SECRET: Application client secret
 * - AUTH0_SECRET: 32-byte hex key for cookie encryption (openssl rand -hex 32)
 * - APP_BASE_URL: Application base URL (default: http://localhost:3000)
 *
 * @see https://github.com/auth0/nextjs-auth0
 * @see /docs/AUTH0-GUIDE.md for usage patterns
 */
export const auth0 = new Auth0Client({
  // Domain and credentials from environment
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",

  // Session configuration
  session: {
    rolling: true,
    absoluteDuration: 60 * 60 * 24, // 24 hours
    inactivityDuration: 60 * 60 * 2, // 2 hours
    cookie: {
      name: "mentor_hub_session", // Unique name to avoid conflicts with other localhost apps
    },
  },

  // OAuth parameters
  authorizationParameters: {
    scope: "openid profile email",
  },

  // Note: Post-logout redirect is handled via returnTo query param on /auth/logout
  // e.g., /auth/logout?returnTo=/login

  // Callback hook for custom logic after authentication
  async onCallback(error, context, session) {
    if (error) {
      console.error("[Auth0] Authentication error:", error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, process.env.APP_BASE_URL)
      );
    }

    if (session) {
      console.log(`[Auth0] User ${session.user.email} logged in successfully`);
    }

    return NextResponse.redirect(
      new URL(context.returnTo || "/dashboard", process.env.APP_BASE_URL)
    );
  },
});

/**
 * Get session with mock fallback for development
 *
 * In mock mode, returns a mock session object.
 * In production mode, uses Auth0 getSession().
 */
export async function getAuthSession() {
  if (process.env.NEXT_PUBLIC_USE_AUTH_MOCK === "true") {
    const { MOCK_USER } = await import("./auth-mock");
    return {
      user: MOCK_USER,
      accessToken: "mock-access-token",
      idToken: "mock-id-token",
    };
  }
  return auth0.getSession();
}
