import { NextResponse } from "next/server";
import { getUserParticipation } from "@/lib/baseql";

/**
 * Get Auth0 Management API token
 *
 * Requires a Machine-to-Machine application with Management API access.
 * Set these env vars (separate from your web app credentials):
 * - AUTH0_M2M_DOMAIN (the actual tenant domain, e.g., dev-xxx.us.auth0.com)
 * - AUTH0_M2M_CLIENT_ID
 * - AUTH0_M2M_CLIENT_SECRET
 *
 * Note: The Management API requires the actual Auth0 tenant domain,
 * NOT a custom domain like auth.yourdomain.com
 */
async function getManagementToken(): Promise<string | null> {
  // M2M domain is required - custom domains don't support Management API
  const domain = process.env.AUTH0_M2M_DOMAIN;

  const clientId = process.env.AUTH0_M2M_CLIENT_ID;
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    console.warn("[verify-email] Auth0 credentials not configured, skipping Auth0 check");
    return null;
  }

  try {
    const response = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        audience: `https://${domain}/api/v2/`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Log helpful message for common errors
      if (errorText.includes("Service not enabled") || errorText.includes("access_denied")) {
        console.warn(
          "[verify-email] Management API not enabled for this application.\n" +
          "To enable Auth0 user checking:\n" +
          "1. Create a Machine-to-Machine application in Auth0\n" +
          "2. Authorize it for the Auth0 Management API with 'read:users' scope\n" +
          "3. Add these env vars to .env.local:\n" +
          "   - AUTH0_M2M_DOMAIN (e.g., dev-xxx.us.auth0.com - NOT a custom domain)\n" +
          "   - AUTH0_M2M_CLIENT_ID\n" +
          "   - AUTH0_M2M_CLIENT_SECRET\n" +
          "Skipping Auth0 check for now."
        );
      } else {
        console.error("[verify-email] Failed to get management token:", errorText);
      }
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("[verify-email] Error getting management token:", error);
    return null;
  }
}

/**
 * Check if user exists in Auth0
 * Returns null if we can't determine (API not available)
 */
async function checkAuth0User(email: string): Promise<boolean | null> {
  const token = await getManagementToken();
  if (!token) {
    // Can't check Auth0 - return null to indicate unknown
    return null;
  }

  // Use M2M domain for Management API calls
  const domain = process.env.AUTH0_M2M_DOMAIN;

  try {
    // Search for users by email
    const searchParams = new URLSearchParams({
      q: `email:"${email}"`,
      search_engine: "v3",
    });

    const response = await fetch(
      `https://${domain}/api/v2/users?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error("[verify-email] Failed to search Auth0 users:", await response.text());
      return null;
    }

    const users = await response.json();
    return users.length > 0;
  } catch (error) {
    console.error("[verify-email] Error checking Auth0 user:", error);
    return null;
  }
}

/**
 * POST /api/verify-email
 *
 * Verifies if an email exists in:
 * 1. BaseQL contacts database (must exist to sign up or sign in)
 * 2. Auth0 (determines whether to sign in or sign up)
 *
 * Returns:
 * - exists: boolean - whether contact exists in BaseQL
 * - hasAuth0Account: boolean | null - whether user has Auth0 account (null if can't determine)
 * - contact: object - contact info if found
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Query BaseQL for contact with this email
    const { contact, participation } = await getUserParticipation(normalizedEmail);

    if (!contact) {
      return NextResponse.json({
        exists: false,
        hasAuth0Account: null,
        message: "No profile found with this email address",
      });
    }

    // Contact exists in BaseQL - now check Auth0
    const hasAuth0Account = await checkAuth0User(normalizedEmail);

    // Return contact info with Auth0 status
    return NextResponse.json({
      exists: true,
      hasAuth0Account, // true, false, or null (unknown)
      contact: {
        id: contact.id,
        fullName: contact.fullName,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        hasParticipation: participation.length > 0,
      },
    });
  } catch (error) {
    console.error("[verify-email] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}
