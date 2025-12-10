/**
 * Job Store
 *
 * Redis operations for managing email job batches and individual jobs.
 * Provides CRUD operations with automatic TTL management.
 */

import { v4 as uuidv4 } from "uuid";
import { redis, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";
import type {
  EmailJob,
  EmailJobBatch,
  EmailJobStatus,
  EmailJobType,
  JobProgress,
  BatchStatus,
  DeadLetterEntry,
} from "./job-types";

/**
 * Create a new job batch with initial jobs
 */
export async function createJobBatch(
  sessionId: string,
  sessionName: string,
  jobs: Omit<EmailJob, "id" | "batchId" | "status" | "attempts" | "createdAt" | "updatedAt">[],
  createdBy?: string
): Promise<{ batchId: string; jobs: EmailJob[] }> {
  const batchId = uuidv4();
  const now = new Date().toISOString();

  // Create batch record
  const batch: EmailJobBatch = {
    id: batchId,
    sessionId,
    sessionName,
    totalJobs: jobs.length,
    completedJobs: 0,
    failedJobs: 0,
    cancelledJobs: 0,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  // Create individual job records
  const createdJobs: EmailJob[] = jobs.map((job) => ({
    ...job,
    id: uuidv4(),
    batchId,
    status: "pending" as EmailJobStatus,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  }));

  // Store everything in Redis using pipeline for efficiency
  const pipeline = redis.pipeline();

  // Store batch
  pipeline.set(REDIS_KEYS.jobBatch(batchId), JSON.stringify(batch));
  pipeline.expire(REDIS_KEYS.jobBatch(batchId), REDIS_TTL.BATCH);

  // Store each job and add to batch job list
  for (const job of createdJobs) {
    pipeline.set(REDIS_KEYS.job(job.id), JSON.stringify(job));
    pipeline.expire(REDIS_KEYS.job(job.id), REDIS_TTL.JOB);
    pipeline.rpush(REDIS_KEYS.batchJobs(batchId), job.id);
  }
  pipeline.expire(REDIS_KEYS.batchJobs(batchId), REDIS_TTL.BATCH);

  // Add batch to session's batch list
  pipeline.rpush(REDIS_KEYS.sessionBatches(sessionId), batchId);
  pipeline.expire(REDIS_KEYS.sessionBatches(sessionId), REDIS_TTL.BATCH);

  // Add to user's active batches if createdBy provided
  if (createdBy) {
    pipeline.sadd(REDIS_KEYS.userActiveBatches(createdBy), batchId);
    pipeline.expire(REDIS_KEYS.userActiveBatches(createdBy), REDIS_TTL.ACTIVE_BATCH);
  }

  await pipeline.exec();

  return { batchId, jobs: createdJobs };
}

/**
 * Create a single job (e.g., for resending a completed email)
 */
export async function createJob(job: EmailJob): Promise<EmailJob> {
  const pipeline = redis.pipeline();

  // Store job
  pipeline.set(REDIS_KEYS.job(job.id), JSON.stringify(job));
  pipeline.expire(REDIS_KEYS.job(job.id), REDIS_TTL.JOB);

  // Add to batch job list
  pipeline.rpush(REDIS_KEYS.batchJobs(job.batchId), job.id);

  await pipeline.exec();

  // Update batch total count
  const batch = await getBatch(job.batchId);
  if (batch) {
    batch.totalJobs += 1;
    batch.updatedAt = new Date().toISOString();
    await redis.set(REDIS_KEYS.jobBatch(job.batchId), JSON.stringify(batch));
  }

  return job;
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string): Promise<EmailJob | null> {
  const data = await redis.get<string>(REDIS_KEYS.job(jobId));
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

/**
 * Get a batch by ID
 */
export async function getBatch(batchId: string): Promise<EmailJobBatch | null> {
  const data = await redis.get<string>(REDIS_KEYS.jobBatch(batchId));
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

/**
 * Update a job's status and metadata
 */
export async function updateJobStatus(
  jobId: string,
  status: EmailJobStatus,
  metadata?: {
    qstashMessageId?: string;
    resendEmailId?: string;
    lastError?: string;
    incrementAttempts?: boolean;
  }
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const updatedJob: EmailJob = {
    ...job,
    status,
    updatedAt: new Date().toISOString(),
  };

  if (metadata?.qstashMessageId) {
    updatedJob.qstashMessageId = metadata.qstashMessageId;
  }
  if (metadata?.resendEmailId) {
    updatedJob.resendEmailId = metadata.resendEmailId;
  }
  if (metadata?.lastError) {
    updatedJob.lastError = metadata.lastError;
  }
  if (metadata?.incrementAttempts) {
    updatedJob.attempts += 1;
  }

  await redis.set(REDIS_KEYS.job(jobId), JSON.stringify(updatedJob));

  // Update batch progress
  await updateBatchProgress(job.batchId);
}

/**
 * Update multiple job statuses atomically (for batch processing)
 * More efficient than calling updateJobStatus multiple times
 */
export async function updateBatchJobStatuses(
  updates: Array<{
    jobId: string;
    status: EmailJobStatus;
    metadata?: {
      qstashMessageId?: string;
      resendEmailId?: string;
      lastError?: string;
    };
  }>
): Promise<void> {
  if (updates.length === 0) return;

  const now = new Date().toISOString();
  const pipeline = redis.pipeline();
  const batchIdsToUpdate = new Set<string>();

  // First, fetch all jobs to get their current state and batchIds
  const jobs = await Promise.all(
    updates.map((u) => getJob(u.jobId))
  );

  // Update each job
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    const job = jobs[i];

    if (!job) {
      console.warn(`[Job Store] Job not found for batch update: ${update.jobId}`);
      continue;
    }

    batchIdsToUpdate.add(job.batchId);

    const updatedJob: EmailJob = {
      ...job,
      status: update.status,
      updatedAt: now,
    };

    if (update.metadata?.qstashMessageId) {
      updatedJob.qstashMessageId = update.metadata.qstashMessageId;
    }
    if (update.metadata?.resendEmailId) {
      updatedJob.resendEmailId = update.metadata.resendEmailId;
    }
    if (update.metadata?.lastError) {
      updatedJob.lastError = update.metadata.lastError;
    }

    pipeline.set(REDIS_KEYS.job(update.jobId), JSON.stringify(updatedJob));
  }

  // Execute all job updates in a single pipeline
  await pipeline.exec();

  // Update batch progress for all affected batches
  for (const batchId of batchIdsToUpdate) {
    await updateBatchProgress(batchId);
  }
}

/**
 * Update batch progress based on job statuses
 */
export async function updateBatchProgress(batchId: string): Promise<void> {
  const batch = await getBatch(batchId);
  if (!batch) return;

  // Get all job IDs in batch
  const jobIds = await redis.lrange(REDIS_KEYS.batchJobs(batchId), 0, -1);
  if (!jobIds.length) return;

  // Get all jobs
  const jobs = await Promise.all(
    jobIds.map((id) => getJob(id as string))
  );

  // Count statuses
  let completed = 0;
  let failed = 0;
  let cancelled = 0;
  let pending = 0;
  let scheduled = 0;
  let processing = 0;

  for (const job of jobs) {
    if (!job) continue;
    switch (job.status) {
      case "completed":
        completed++;
        break;
      case "failed":
        failed++;
        break;
      case "cancelled":
        cancelled++;
        break;
      case "pending":
        pending++;
        break;
      case "scheduled":
        scheduled++;
        break;
      case "processing":
        processing++;
        break;
    }
  }

  // Determine batch status
  // - "pending": Jobs created but not yet scheduled in QStash
  // - "scheduled": All jobs are scheduled in QStash, waiting for delivery time
  // - "in_progress": Jobs are actively being processed
  // - "completed/failed/partial_failure": All jobs have final status
  let status: BatchStatus;
  const totalProcessed = completed + failed + cancelled;

  if (totalProcessed === batch.totalJobs) {
    // All jobs processed
    if (failed === batch.totalJobs) {
      status = "failed";
    } else if (failed > 0) {
      status = "partial_failure";
    } else {
      status = "completed";
    }
  } else if (processing > 0) {
    // Jobs are actively being sent
    status = "in_progress";
  } else if (scheduled > 0 || completed > 0) {
    // Jobs are scheduled (waiting in QStash) or some have completed
    // This is NOT "in_progress" - emails are just waiting for their scheduled time
    status = "scheduled" as BatchStatus;
  } else {
    status = "pending";
  }

  // Update batch
  const updatedBatch: EmailJobBatch = {
    ...batch,
    completedJobs: completed,
    failedJobs: failed,
    cancelledJobs: cancelled,
    status,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(REDIS_KEYS.jobBatch(batchId), JSON.stringify(updatedBatch));

  // Remove from active batches if completed or failed
  if (status === "completed" || status === "failed" || status === "partial_failure") {
    if (batch.createdBy) {
      await redis.srem(REDIS_KEYS.userActiveBatches(batch.createdBy), batchId);
    }
  }
}

/**
 * Get progress for a specific batch
 */
export async function getJobProgress(batchId: string): Promise<JobProgress | null> {
  const batch = await getBatch(batchId);
  if (!batch) return null;

  return {
    batchId: batch.id,
    sessionId: batch.sessionId,
    sessionName: batch.sessionName,
    total: batch.totalJobs,
    completed: batch.completedJobs,
    failed: batch.failedJobs,
    cancelled: batch.cancelledJobs,
    status: batch.status,
  };
}

/**
 * Get detailed progress including all jobs
 */
export async function getJobProgressWithDetails(batchId: string): Promise<JobProgress | null> {
  const progress = await getJobProgress(batchId);
  if (!progress) return null;

  // Get all jobs
  const jobIds = await redis.lrange(REDIS_KEYS.batchJobs(batchId), 0, -1);
  const jobs = await Promise.all(
    jobIds.map((id) => getJob(id as string))
  );

  return {
    ...progress,
    jobs: jobs.filter((j): j is EmailJob => j !== null),
  };
}

/**
 * Get all batches for a session
 */
export async function getSessionBatches(sessionId: string): Promise<JobProgress[]> {
  const batchIds = await redis.lrange(REDIS_KEYS.sessionBatches(sessionId), 0, -1);
  const batches = await Promise.all(
    batchIds.map((id) => getJobProgress(id as string))
  );
  return batches.filter((b): b is JobProgress => b !== null);
}

/**
 * Get active batches for a user (for UI polling)
 */
export async function getUserActiveBatches(userId: string): Promise<JobProgress[]> {
  const batchIds = await redis.smembers(REDIS_KEYS.userActiveBatches(userId));
  const batches = await Promise.all(
    batchIds.map((id) => getJobProgress(id as string))
  );
  return batches.filter((b): b is JobProgress => b !== null);
}

/**
 * Get all active (non-completed) batches
 */
export async function getAllActiveBatches(): Promise<JobProgress[]> {
  // This is a fallback - in production, use getUserActiveBatches
  // This scans all keys which is expensive
  const keys = await redis.keys("email:batch:*");
  const batches: JobProgress[] = [];

  for (const key of keys) {
    // Skip job lists
    if (key.includes(":jobs")) continue;

    const batchId = key.replace("email:batch:", "");
    const progress = await getJobProgress(batchId);
    if (progress && progress.status !== "completed" && progress.status !== "failed") {
      batches.push(progress);
    }
  }

  return batches;
}

/**
 * Add a failed job to the dead letter queue
 */
export async function addToDeadLetterQueue(
  job: EmailJob,
  reason: string
): Promise<void> {
  const entry: DeadLetterEntry = {
    job,
    reason,
    addedAt: new Date().toISOString(),
    reviewed: false,
  };

  await redis.rpush(REDIS_KEYS.deadLetter(), JSON.stringify(entry));
  await redis.expire(REDIS_KEYS.deadLetter(), REDIS_TTL.DEAD_LETTER);
}

/**
 * Get entries from the dead letter queue
 */
export async function getDeadLetterQueue(
  limit = 100
): Promise<DeadLetterEntry[]> {
  const entries = await redis.lrange(REDIS_KEYS.deadLetter(), 0, limit - 1);
  return entries.map((e) => {
    const parsed = typeof e === "string" ? JSON.parse(e) : e;
    return parsed as DeadLetterEntry;
  });
}

/**
 * Cancel all pending jobs in a batch
 */
export async function cancelBatchJobs(batchId: string): Promise<string[]> {
  const jobIds = await redis.lrange(REDIS_KEYS.batchJobs(batchId), 0, -1);
  const cancelledIds: string[] = [];

  for (const id of jobIds) {
    const job = await getJob(id as string);
    if (job && (job.status === "pending" || job.status === "scheduled")) {
      await updateJobStatus(id as string, "cancelled");
      cancelledIds.push(id as string);
    }
  }

  return cancelledIds;
}

/**
 * Get all jobs for a session (across all batches)
 */
export async function getSessionJobs(sessionId: string): Promise<EmailJob[]> {
  const batches = await getSessionBatches(sessionId);
  const allJobs: EmailJob[] = [];

  for (const batch of batches) {
    const progress = await getJobProgressWithDetails(batch.batchId);
    if (progress?.jobs) {
      allJobs.push(...progress.jobs);
    }
  }

  return allJobs;
}

/**
 * Find jobs by type and recipient for a session
 * Useful for checking if a specific email is already scheduled
 */
export async function findSessionJobsByType(
  sessionId: string,
  type: EmailJobType,
  recipientEmail?: string
): Promise<EmailJob[]> {
  const jobs = await getSessionJobs(sessionId);
  return jobs.filter((job) => {
    if (job.type !== type) return false;
    if (recipientEmail && job.recipientEmail !== recipientEmail) return false;
    return true;
  });
}

/**
 * Delete a batch and all its jobs from Redis
 * Used for cleaning up stuck or orphaned batches
 */
export async function deleteBatch(batchId: string): Promise<boolean> {
  try {
    // Get all job IDs in the batch
    const jobIds = await redis.lrange(REDIS_KEYS.batchJobs(batchId), 0, -1);

    const pipeline = redis.pipeline();

    // Delete all jobs
    for (const jobId of jobIds) {
      pipeline.del(REDIS_KEYS.job(jobId as string));
    }

    // Delete batch job list
    pipeline.del(REDIS_KEYS.batchJobs(batchId));

    // Delete batch itself
    pipeline.del(REDIS_KEYS.jobBatch(batchId));

    await pipeline.exec();

    console.log(`[Job Store] Deleted batch ${batchId} with ${jobIds.length} jobs`);
    return true;
  } catch (error) {
    console.error(`[Job Store] Failed to delete batch ${batchId}:`, error);
    return false;
  }
}

/**
 * Retry a failed job by resetting its status to pending
 * Returns the updated job for re-scheduling via QStash
 */
export async function retryJob(jobId: string): Promise<EmailJob> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (job.status !== "failed") {
    throw new Error(`Can only retry failed jobs. Current status: ${job.status}`);
  }

  const updatedJob: EmailJob = {
    ...job,
    status: "pending",
    lastError: undefined,
    qstashMessageId: undefined,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(REDIS_KEYS.job(jobId), JSON.stringify(updatedJob));

  // Update batch progress
  await updateBatchProgress(job.batchId);

  return updatedJob;
}
