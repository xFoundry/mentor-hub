/**
 * QStash Email Scheduler
 *
 * Schedules emails via QStash instead of Resend's scheduledAt API.
 * Provides background processing with progress tracking and retry handling.
 *
 * LOGGING LEVELS:
 * - [QStash Scheduler] - Standard operational logs
 * - [QStash Scheduler:DEBUG] - Detailed debug information
 * - [QStash Scheduler:ERROR] - Error conditions
 */

import { qstash, getBaseUrl, calculateDelaySeconds, FLOW_CONTROL, RETRY_CONFIG } from "@/lib/qstash";
import { createJobBatch, updateJobStatus, getSessionJobs, cancelBatchJobs, updateBatchJobStatuses, retryJob } from "./job-store";
import { calculateScheduleTimes, formatDateForEmail, formatTimeForEmail, isValidScheduleTime } from "@/lib/timezone";
import { getMentorParticipants, getLeadMentor } from "@/components/sessions/session-transformers";
import type { Session, Contact, Team } from "@/types/schema";
import type { EmailJob, EmailJobType, QStashBatchPayload, BatchRecipient } from "./job-types";

/**
 * Job group for batch processing
 * Groups jobs by email type and scheduled time
 */
interface JobGroup {
  type: EmailJobType;
  scheduledFor: string;
  jobs: EmailJob[];
}

/**
 * Group jobs by type and scheduled time for efficient batch processing
 * This reduces the number of QStash messages from N to ~3 per session
 */
function groupJobsByTypeAndTime(jobs: EmailJob[]): JobGroup[] {
  const groups = new Map<string, JobGroup>();

  for (const job of jobs) {
    const key = `${job.type}_${job.scheduledFor}`;

    if (!groups.has(key)) {
      groups.set(key, {
        type: job.type,
        scheduledFor: job.scheduledFor,
        jobs: [],
      });
    }

    groups.get(key)!.jobs.push(job);
  }

  return Array.from(groups.values());
}

/**
 * Get all active mentor contacts from a session
 */
function getSessionMentors(session: Session): Contact[] {
  const participants = getMentorParticipants(session);
  return participants
    .map(p => p.contact)
    .filter((c): c is Contact => !!c && !!c.email);
}

/**
 * Format mentor name(s) for display in emails
 */
function formatMentorNameForEmail(session: Session): string {
  const leadMentor = getLeadMentor(session);
  const allMentors = getSessionMentors(session);

  if (!leadMentor) return "your mentor";

  const leadName = leadMentor.fullName || "your mentor";
  const otherCount = allMentors.length - 1;

  if (otherCount <= 0) return leadName;
  if (otherCount === 1) return `${leadName} + 1 other mentor`;
  return `${leadName} + ${otherCount} other mentors`;
}

/**
 * Get students from a session's team
 */
function getStudentsFromSession(session: Session): Contact[] {
  const team = session.team?.[0];
  if (!team) return [];

  const members = (team as Team & { members?: Array<{ contact?: Contact[] }> }).members || [];
  return members
    .map((m) => m.contact?.[0])
    .filter((c): c is Contact => !!c && !!c.email);
}

/**
 * Schedule all emails for a session via QStash
 * Returns the batch ID for progress tracking
 */
export async function scheduleSessionEmailsViaQStash(
  session: Session,
  createdBy?: string
): Promise<{ batchId: string; jobCount: number } | null> {
  const logPrefix = `[QStash Scheduler] Session ${session.id}:`;

  if (!session.scheduledStart) {
    console.log(`${logPrefix} No scheduled start - skipping`);
    return null;
  }

  const baseUrl = getBaseUrl();
  const times = calculateScheduleTimes(session.scheduledStart, session.duration || 60);

  // Log configuration for debugging
  console.log(`${logPrefix} Configuration:`, {
    baseUrl,
    scheduledStart: session.scheduledStart,
    duration: session.duration || 60,
    sessionType: session.sessionType,
    teamName: session.team?.[0]?.teamName,
    qstashEnabled: isQStashSchedulerEnabled(),
  });

  console.log(`${logPrefix} Calculated schedule times:`, {
    prep48h: times.prep48h?.toISOString(),
    prep24h: times.prep24h?.toISOString(),
    feedbackImmediate: times.feedbackImmediate?.toISOString(),
  });

  // Get participants
  const mentors = getSessionMentors(session);
  const mentorName = formatMentorNameForEmail(session);
  const mentorNames = mentors.map(m => m.fullName || "Mentor");
  const team = session.team?.[0];
  const teamName = team?.teamName || "the team";
  const students = getStudentsFromSession(session);

  const sessionDate = formatDateForEmail(session.scheduledStart);
  const sessionTime = formatTimeForEmail(session.scheduledStart);
  const sessionName = session.sessionType || "Session";

  console.log(`[QStash Scheduler] Creating jobs for session ${session.id}`);
  console.log(`[QStash Scheduler] Students: ${students.length}, Mentors: ${mentors.length}`);

  // Build list of jobs to create
  const jobsToCreate: Omit<EmailJob, "id" | "batchId" | "status" | "attempts" | "createdAt" | "updatedAt">[] = [];

  // Student prep reminders (48h and 24h)
  for (const student of students) {
    if (!student.email) continue;

    // 48h prep reminder
    if (isValidScheduleTime(times.prep48h)) {
      jobsToCreate.push({
        sessionId: session.id,
        type: "prep48h",
        recipientEmail: student.email,
        recipientName: student.fullName || "there",
        scheduledFor: times.prep48h.toISOString(),
        metadata: {
          sessionType: sessionName,
          sessionDate,
          teamName,
          mentorNames,
        },
      });
    }

    // 24h prep reminder
    if (isValidScheduleTime(times.prep24h)) {
      jobsToCreate.push({
        sessionId: session.id,
        type: "prep24h",
        recipientEmail: student.email,
        recipientName: student.fullName || "there",
        scheduledFor: times.prep24h.toISOString(),
        metadata: {
          sessionType: sessionName,
          sessionDate,
          teamName,
          mentorNames,
        },
      });
    }
  }

  // Feedback emails for all participants (at session end)
  const allParticipants = [
    ...students.map(s => ({ contact: s, role: "student" as const })),
    ...mentors.map(m => ({ contact: m, role: "mentor" as const })),
  ];

  for (const { contact, role } of allParticipants) {
    if (!contact.email) continue;

    if (isValidScheduleTime(times.feedbackImmediate)) {
      jobsToCreate.push({
        sessionId: session.id,
        type: "feedbackImmediate",
        recipientEmail: contact.email,
        recipientName: contact.fullName || "there",
        scheduledFor: times.feedbackImmediate.toISOString(),
        metadata: {
          sessionType: sessionName,
          sessionDate,
          teamName,
          mentorNames,
        },
      });
    }
  }

  if (jobsToCreate.length === 0) {
    console.log("[QStash Scheduler] No valid jobs to schedule");
    return null;
  }

  // Create job batch in Redis (individual jobs for tracking)
  const { batchId, jobs } = await createJobBatch(
    session.id,
    sessionName,
    jobsToCreate,
    createdBy
  );

  console.log(`[QStash Scheduler] Created batch ${batchId} with ${jobs.length} jobs`);

  // Group jobs by type and scheduled time for efficient batch processing
  const jobGroups = groupJobsByTypeAndTime(jobs);
  console.log(`[QStash Scheduler] Grouped into ${jobGroups.length} QStash messages`);

  // Build QStash batch messages (one per group)
  const messages = jobGroups.map((group) => {
    // Build recipients for this batch
    const recipients: BatchRecipient[] = group.jobs.map((job) => ({
      jobId: job.id,
      to: job.recipientEmail,
      recipientName: job.recipientName,
      // Infer role from email type
      role: job.type === "feedbackImmediate" && mentors.some(m => m.email === job.recipientEmail)
        ? "mentor" as const
        : "student" as const,
    }));

    // Create batch payload
    const payload: QStashBatchPayload = {
      isBatch: true,
      batchId,
      sessionId: session.id,
      type: group.type,
      scheduledFor: group.scheduledFor,
      recipients,
      metadata: group.jobs[0].metadata, // Shared metadata from first job
    };

    const delay = calculateDelaySeconds(group.scheduledFor);

    return {
      destination: `${baseUrl}/api/qstash/worker`,
      body: payload, // batchJSON will stringify this automatically
      delay,
      retries: RETRY_CONFIG.retries,
      callback: `${baseUrl}/api/qstash/callback`,
      failureCallback: `${baseUrl}/api/qstash/failure`,
      headers: {
        "Content-Type": "application/json",
        "Upstash-Flow-Control-Key": FLOW_CONTROL.key,
        "Upstash-Flow-Control-Value": `rate=${FLOW_CONTROL.rate},parallelism=${FLOW_CONTROL.parallelism},period=${FLOW_CONTROL.period}`,
      },
    };
  });

  // Batch publish to QStash
  console.log(`${logPrefix} Publishing ${messages.length} QStash messages...`);

  // Log each message being sent (for debugging)
  messages.forEach((msg, idx) => {
    const payload = msg.body as QStashBatchPayload;
    console.log(`${logPrefix} Message ${idx + 1}:`, {
      destination: msg.destination,
      type: payload.type,
      recipientCount: payload.recipients.length,
      scheduledFor: payload.scheduledFor,
      delay: msg.delay,
      delayHuman: msg.delay ? `${Math.floor(msg.delay / 3600)}h ${Math.floor((msg.delay % 3600) / 60)}m` : "immediate",
    });
  });

  try {
    const results = await qstash.batchJSON(messages);

    console.log(`${logPrefix} QStash batchJSON response:`, {
      resultCount: results.length,
      results: results.map((r: any, i: number) => ({
        index: i,
        messageId: r.messageId || "none",
        error: r.error || "none",
      })),
    });

    // Update job statuses with QStash message IDs
    // Each QStash message covers multiple jobs in a group
    for (let i = 0; i < results.length; i++) {
      const result = results[i] as { messageId?: string; error?: string };
      const group = jobGroups[i];

      if (result.messageId) {
        // Update all jobs in this group to scheduled
        await updateBatchJobStatuses(
          group.jobs.map((job) => ({
            jobId: job.id,
            status: "scheduled" as const,
            metadata: { qstashMessageId: result.messageId },
          }))
        );
        console.log(`${logPrefix} Group ${group.type} (${group.jobs.length} jobs) scheduled with messageId: ${result.messageId}`);
      } else if (result.error) {
        // Mark all jobs in this group as failed
        await updateBatchJobStatuses(
          group.jobs.map((job) => ({
            jobId: job.id,
            status: "failed" as const,
            metadata: { lastError: result.error || "Unknown error" },
          }))
        );
        console.error(`${logPrefix} Group ${group.type} FAILED:`, result.error);
      }
    }

    console.log(`${logPrefix} Batch ${batchId} published successfully (${messages.length} QStash messages for ${jobs.length} jobs)`);

    return { batchId, jobCount: jobs.length };
  } catch (error) {
    console.error(`${logPrefix} Batch publish FAILED:`, error);

    // Mark all jobs as failed
    await updateBatchJobStatuses(
      jobs.map((job) => ({
        jobId: job.id,
        status: "failed" as const,
        metadata: { lastError: error instanceof Error ? error.message : "Batch publish failed" },
      }))
    );

    throw error;
  }
}

/**
 * Cancel a specific scheduled email by QStash message ID
 */
export async function cancelScheduledEmail(qstashMessageId: string): Promise<boolean> {
  try {
    await qstash.messages.delete(qstashMessageId);
    console.log(`[QStash Scheduler] Cancelled message: ${qstashMessageId}`);
    return true;
  } catch (error) {
    console.error(`[QStash Scheduler] Failed to cancel message ${qstashMessageId}:`, error);
    return false;
  }
}

/**
 * Cancel all scheduled emails for a session
 */
export async function cancelSessionEmailsViaQStash(sessionId: string): Promise<{
  cancelled: number;
  failed: number;
}> {
  const jobs = await getSessionJobs(sessionId);
  let cancelled = 0;
  let failed = 0;

  for (const job of jobs) {
    // Only cancel jobs that are pending or scheduled
    if (job.status !== "pending" && job.status !== "scheduled") {
      continue;
    }

    // Cancel via QStash if we have a message ID
    if (job.qstashMessageId) {
      const success = await cancelScheduledEmail(job.qstashMessageId);
      if (success) {
        await updateJobStatus(job.id, "cancelled");
        cancelled++;
      } else {
        failed++;
      }
    } else {
      // Job not yet sent to QStash, just update status
      await updateJobStatus(job.id, "cancelled");
      cancelled++;
    }
  }

  console.log(`[QStash Scheduler] Session ${sessionId}: cancelled ${cancelled}, failed ${failed}`);
  return { cancelled, failed };
}

/**
 * Cancel emails for a specific recipient in a session
 * Used when removing a participant from a session
 */
export async function cancelRecipientEmailsViaQStash(
  sessionId: string,
  recipientEmail: string
): Promise<{ cancelled: number; failed: number }> {
  const jobs = await getSessionJobs(sessionId);
  let cancelled = 0;
  let failed = 0;

  for (const job of jobs) {
    // Only cancel jobs for this recipient that are pending or scheduled
    if (job.recipientEmail !== recipientEmail) continue;
    if (job.status !== "pending" && job.status !== "scheduled") continue;

    if (job.qstashMessageId) {
      const success = await cancelScheduledEmail(job.qstashMessageId);
      if (success) {
        await updateJobStatus(job.id, "cancelled");
        cancelled++;
      } else {
        failed++;
      }
    } else {
      await updateJobStatus(job.id, "cancelled");
      cancelled++;
    }
  }

  console.log(`[QStash Scheduler] Session ${sessionId}, recipient ${recipientEmail}: cancelled ${cancelled}, failed ${failed}`);
  return { cancelled, failed };
}

/**
 * Check if QStash scheduling is enabled
 * Uses a feature flag for gradual rollout
 */
export function isQStashSchedulerEnabled(): boolean {
  return process.env.USE_QSTASH_SCHEDULER === "true";
}

/**
 * Retry all failed jobs for a session
 * Groups failed jobs by type and re-schedules them as batches
 * Returns count of successfully retried jobs
 */
export async function retryAllFailedJobsForSession(
  sessionId: string
): Promise<{ retried: number; failed: number; total: number }> {
  const jobs = await getSessionJobs(sessionId);
  const failedJobs = jobs.filter((job) => job.status === "failed");

  if (failedJobs.length === 0) {
    return { retried: 0, failed: 0, total: 0 };
  }

  console.log(`[QStash Scheduler] Retrying ${failedJobs.length} failed jobs for session ${sessionId}`);

  // Group failed jobs by type for efficient batch processing
  const jobsByType = new Map<EmailJobType, EmailJob[]>();
  for (const job of failedJobs) {
    if (!jobsByType.has(job.type)) {
      jobsByType.set(job.type, []);
    }
    jobsByType.get(job.type)!.push(job);
  }

  const baseUrl = getBaseUrl();
  let retriedCount = 0;
  let failedCount = 0;

  // Process each type group as a batch
  for (const [type, typeJobs] of jobsByType) {
    // Reset all jobs in this group to pending
    const resetJobs: EmailJob[] = [];
    for (const job of typeJobs) {
      try {
        const resetJob = await retryJob(job.id);
        resetJobs.push(resetJob);
      } catch (error) {
        console.error(`[QStash Scheduler] Failed to reset job ${job.id}:`, error);
        failedCount++;
      }
    }

    if (resetJobs.length === 0) continue;

    // Build batch payload
    const recipients: BatchRecipient[] = resetJobs.map((job) => ({
      jobId: job.id,
      to: job.recipientEmail,
      recipientName: job.recipientName,
      role: "student" as const,
    }));

    // Use metadata from first job (they should all have same session metadata)
    const payload: QStashBatchPayload = {
      isBatch: true,
      batchId: resetJobs[0].batchId,
      sessionId,
      type,
      scheduledFor: resetJobs[0].scheduledFor,
      recipients,
      metadata: resetJobs[0].metadata,
    };

    // Calculate delay - send immediately if past due
    const delay = Math.max(0, calculateDelaySeconds(resetJobs[0].scheduledFor));

    try {
      const result = await qstash.publishJSON({
        url: `${baseUrl}/api/qstash/worker`,
        body: payload,
        delay,
        retries: RETRY_CONFIG.retries,
        callback: `${baseUrl}/api/qstash/callback`,
        failureCallback: `${baseUrl}/api/qstash/failure`,
        headers: {
          "Content-Type": "application/json",
          "Upstash-Flow-Control-Key": FLOW_CONTROL.key,
          "Upstash-Flow-Control-Value": `rate=${FLOW_CONTROL.rate},parallelism=${FLOW_CONTROL.parallelism},period=${FLOW_CONTROL.period}`,
        },
      });

      // Update all jobs in this batch to scheduled
      await updateBatchJobStatuses(
        resetJobs.map((job) => ({
          jobId: job.id,
          status: "scheduled" as const,
          metadata: { qstashMessageId: result.messageId },
        }))
      );

      retriedCount += resetJobs.length;
      console.log(`[QStash Scheduler] Batch retry for ${type}: ${resetJobs.length} jobs scheduled (${result.messageId})`);
    } catch (error) {
      console.error(`[QStash Scheduler] Failed to schedule retry batch for ${type}:`, error);

      // Mark jobs as failed again
      await updateBatchJobStatuses(
        resetJobs.map((job) => ({
          jobId: job.id,
          status: "failed" as const,
          metadata: { lastError: error instanceof Error ? error.message : "Retry scheduling failed" },
        }))
      );

      failedCount += resetJobs.length;
    }
  }

  console.log(`[QStash Scheduler] Retry complete for session ${sessionId}: ${retriedCount} retried, ${failedCount} failed`);

  return {
    retried: retriedCount,
    failed: failedCount,
    total: failedJobs.length,
  };
}

/**
 * Schedule a single job via QStash (used for retry)
 * Returns the QStash message ID on success
 */
export async function scheduleSingleJobViaQStash(
  job: EmailJob
): Promise<{ messageId: string } | null> {
  const baseUrl = getBaseUrl();
  const delay = calculateDelaySeconds(job.scheduledFor);

  // Build single-recipient payload matching batch format
  const payload: QStashBatchPayload = {
    isBatch: true,
    batchId: job.batchId,
    sessionId: job.sessionId,
    type: job.type,
    scheduledFor: job.scheduledFor,
    recipients: [
      {
        jobId: job.id,
        to: job.recipientEmail,
        recipientName: job.recipientName,
        role: "student", // Default, will be overridden by metadata if needed
      },
    ],
    metadata: job.metadata,
  };

  try {
    const result = await qstash.publishJSON({
      url: `${baseUrl}/api/qstash/worker`,
      body: payload,
      delay: Math.max(0, delay), // Send immediately if delay is negative (past due)
      retries: RETRY_CONFIG.retries,
      callback: `${baseUrl}/api/qstash/callback`,
      failureCallback: `${baseUrl}/api/qstash/failure`,
      headers: {
        "Content-Type": "application/json",
        "Upstash-Flow-Control-Key": FLOW_CONTROL.key,
        "Upstash-Flow-Control-Value": `rate=${FLOW_CONTROL.rate},parallelism=${FLOW_CONTROL.parallelism},period=${FLOW_CONTROL.period}`,
      },
    });

    console.log(`[QStash Scheduler] Retry scheduled for job ${job.id}: ${result.messageId}`);
    return { messageId: result.messageId };
  } catch (error) {
    console.error(`[QStash Scheduler] Failed to schedule retry for job ${job.id}:`, error);
    throw error;
  }
}
