import { Resend } from "resend";

/**
 * Resend client singleton for sending transactional emails
 *
 * Required environment variables:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_FROM_EMAIL: Sender email address (must be verified in Resend)
 */

// Validate environment variables at runtime
function validateEnv() {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "Warning: RESEND_API_KEY not set. Email sending will be disabled."
    );
    return false;
  }
  return true;
}

// Create Resend client (lazy initialization)
let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!validateEnv()) return null;

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

/**
 * Get the configured sender email address
 */
export function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "noreply@example.com";
}

/**
 * Get the application base URL
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Check if email sending is configured and enabled
 */
export function isEmailEnabled(): boolean {
  return validateEnv();
}
