/**
 * QStash Client Configuration
 *
 * Serverless message queue for background email processing.
 * Uses Upstash QStash for scheduling, retries, and callbacks.
 */

import { Client, Receiver } from "@upstash/qstash";

/**
 * QStash client for publishing messages
 */
export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

/**
 * QStash receiver for verifying webhook signatures
 */
export const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

/**
 * Flow control config to respect Resend rate limits
 * Free tier: 2 emails/second, 100 emails/day
 * Pro tier: 100 emails/second
 */
export const FLOW_CONTROL = {
  key: "resend-emails",
  rate: 2, // requests per period
  parallelism: 1, // concurrent requests
  period: "1s" as const,
};

/**
 * Retry configuration with exponential backoff
 * Retries: 1s, 2s, 4s, 8s, 16s (total ~31s of retries)
 */
export const RETRY_CONFIG = {
  retries: 5,
  // Exponential backoff formula: 2^retried * 1000ms
  retryDelay: "pow(2, retried) * 1000",
};

/**
 * Get the base URL for QStash callbacks
 * Uses APP_BASE_URL or VERCEL_URL for deployment
 */
export function getBaseUrl(): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Calculate delay in seconds from now until a target date
 */
export function calculateDelaySeconds(targetDate: string | Date): number {
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const now = new Date();
  const delayMs = target.getTime() - now.getTime();

  // Minimum delay of 0 (send immediately if in the past)
  return Math.max(0, Math.floor(delayMs / 1000));
}

/**
 * Format delay for QStash header (e.g., "5m", "2h", "1d")
 */
export function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
