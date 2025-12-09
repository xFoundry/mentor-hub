/**
 * Upstash Redis Client Configuration
 *
 * Used for real-time job status tracking and progress updates.
 * Provides fast reads for UI polling with automatic TTL cleanup.
 */

import { Redis } from "@upstash/redis";

/**
 * Redis client for job status storage
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Redis key prefixes for different data types
 */
export const REDIS_KEYS = {
  /** Job batch metadata and status */
  jobBatch: (batchId: string) => `email:batch:${batchId}`,
  /** Individual job data within a batch */
  job: (jobId: string) => `email:job:${jobId}`,
  /** List of job IDs in a batch */
  batchJobs: (batchId: string) => `email:batch:${batchId}:jobs`,
  /** Session to batch mapping (for looking up active jobs) */
  sessionBatches: (sessionId: string) => `email:session:${sessionId}:batches`,
  /** Active batches for a user (for UI polling) */
  userActiveBatches: (userId: string) => `email:user:${userId}:active`,
  /** Dead letter queue for failed jobs */
  deadLetter: () => `email:dlq`,
};

/**
 * TTL values in seconds
 */
export const REDIS_TTL = {
  /** Job data TTL: 7 days */
  JOB: 60 * 60 * 24 * 7,
  /** Batch data TTL: 7 days */
  BATCH: 60 * 60 * 24 * 7,
  /** Active batch reference TTL: 24 hours */
  ACTIVE_BATCH: 60 * 60 * 24,
  /** Dead letter queue TTL: 30 days */
  DEAD_LETTER: 60 * 60 * 24 * 30,
};

/**
 * Check if Redis is available (for feature flag fallback)
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
