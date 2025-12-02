/**
 * Development Authentication Mock
 *
 * TODO: Remove this file when Auth0 credentials are configured
 *
 * This mock allows development without Auth0 credentials by returning
 * a hardcoded user object that matches the Auth0 user shape.
 */

export interface MockUser {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  nickname: string;
  picture: string;
  updated_at: string;
}

/**
 * Check if auth mock is enabled via environment variable
 */
export function isAuthMockEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_AUTH_MOCK === "true";
}

/**
 * Get mock user email from environment (configurable for testing different users)
 */
function getMockUserEmail(): string {
  return process.env.NEXT_PUBLIC_MOCK_USER_EMAIL || "REDACTED_EMAIL";
}

/**
 * Generate display name from email
 */
function getDisplayName(email: string): string {
  const username = email.split("@")[0];
  return username
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const MOCK_USER: MockUser = {
  sub: "auth0|mock-user-id",
  email: getMockUserEmail(),
  email_verified: true,
  name: getDisplayName(getMockUserEmail()),
  nickname: getMockUserEmail().split("@")[0],
  picture: `https://ui-avatars.com/api/?name=${getDisplayName(getMockUserEmail()).replace(" ", "+")}&background=0D8ABC&color=fff`,
  updated_at: new Date().toISOString(),
};

/**
 * Get the mock user if auth mock is enabled, otherwise null
 */
export function getMockUser(): MockUser | null {
  if (isAuthMockEnabled()) {
    console.log("[AUTH MOCK] Using development mock user:", MOCK_USER.email);
    return MOCK_USER;
  }
  return null;
}
