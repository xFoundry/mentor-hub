import { Resend } from "resend";

/**
 * Resend client singleton for sending transactional emails
 *
 * Required environment variables:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_FROM_EMAIL: Sender email address (must be verified in Resend)
 *
 * Test mode environment variables:
 * - EMAIL_TEST_MODE: Set to "true" to redirect all emails to test recipient
 * - EMAIL_TEST_RECIPIENT: Email address to receive all test emails
 */

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Simple rate limiter that ensures minimum delay between operations
 * Uses a queue to serialize requests and prevent rate limiting
 */
class RateLimiter {
  private lastCallTime = 0;
  private queue: Array<() => void> = [];
  private processing = false;
  private minDelayMs: number;

  constructor(minDelayMs: number = 100) {
    this.minDelayMs = minDelayMs;
  }

  /**
   * Execute a function with rate limiting
   * Ensures minimum delay between consecutive calls
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now();
          const timeSinceLastCall = now - this.lastCallTime;

          if (timeSinceLastCall < this.minDelayMs) {
            await this.sleep(this.minDelayMs - timeSinceLastCall);
          }

          this.lastCallTime = Date.now();
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global rate limiter for Resend API (600ms between calls = ~1.6 requests/sec with buffer)
const resendRateLimiter = new RateLimiter(600);

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * Check if an error is a rate limit error (429)
 */
function isRateLimitError(result: any): boolean {
  return result?.error?.statusCode === 429 || result?.error?.name === 'rate_limit_exceeded';
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a Resend API call with rate limiting and retry on 429 errors
 * Use this for all Resend operations to avoid hitting rate limits
 */
export async function rateLimitedResend<T>(fn: () => Promise<T>): Promise<T> {
  let lastResult: T | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await resendRateLimiter.execute(fn);
    lastResult = result;

    // Check if we got a rate limit error
    if (isRateLimitError(result)) {
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(`[Resend] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }
      console.warn(`[Resend] Rate limited after ${MAX_RETRIES} retries`);
    }

    return result;
  }

  return lastResult as T;
}

// ============================================================================
// Resend Client
// ============================================================================

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

/**
 * Check if test mode is enabled
 * When enabled, all emails are redirected to EMAIL_TEST_RECIPIENT
 */
export function isTestModeEnabled(): boolean {
  return process.env.EMAIL_TEST_MODE === "true";
}

/**
 * Get the test recipient email address
 * Returns null if test mode is not enabled or no recipient configured
 */
export function getTestRecipient(): string | null {
  if (!isTestModeEnabled()) return null;
  return process.env.EMAIL_TEST_RECIPIENT || null;
}

/**
 * Get the effective recipient email address
 * In test mode, this returns the test recipient
 * In production mode, this returns the original recipient
 *
 * @param originalRecipient The intended recipient email
 * @returns The effective recipient (test or original)
 */
export function getEffectiveRecipient(originalRecipient: string): string {
  const testRecipient = getTestRecipient();
  if (testRecipient) {
    return testRecipient;
  }
  return originalRecipient;
}

/**
 * Get subject prefix for test mode
 * Returns "[TEST] " if in test mode, empty string otherwise
 */
export function getSubjectPrefix(): string {
  return isTestModeEnabled() ? "[TEST] " : "";
}

/**
 * Get email configuration info for display
 */
export function getEmailConfig() {
  return {
    isEnabled: isEmailEnabled(),
    isTestMode: isTestModeEnabled(),
    testRecipient: getTestRecipient(),
    fromEmail: getFromEmail(),
    appUrl: getAppUrl(),
  };
}
