/**
 * Email Job Types
 *
 * TypeScript interfaces for the QStash email scheduling system.
 */

/**
 * Possible statuses for an email job
 */
export type EmailJobStatus =
  | "pending" // Job created, not yet queued to QStash
  | "scheduled" // Queued to QStash, waiting for delivery time
  | "processing" // QStash delivered to worker, sending via Resend
  | "completed" // Email sent successfully
  | "failed" // All retries exhausted, moved to dead letter queue
  | "cancelled"; // Manually cancelled before sending

/**
 * Types of emails that can be scheduled
 */
export type EmailJobType =
  | "prep48h" // 48-hour pre-meeting prep reminder (students)
  | "prep24h" // 24-hour pre-meeting prep reminder (students)
  | "mentorPrep" // Pre-meeting prep reminder for mentors
  | "feedback" // Post-session feedback reminder (scheduled)
  | "feedbackImmediate"; // Immediate feedback request (after session)

/**
 * Individual email job
 */
export interface EmailJob {
  /** Unique job ID (UUID) */
  id: string;
  /** Parent batch ID */
  batchId: string;
  /** Session this email relates to */
  sessionId: string;
  /** Type of email */
  type: EmailJobType;
  /** Recipient email address */
  recipientEmail: string;
  /** Recipient display name */
  recipientName: string;
  /** Scheduled send time (ISO string) */
  scheduledFor: string;
  /** Current job status */
  status: EmailJobStatus;
  /** Number of delivery attempts */
  attempts: number;
  /** Error message from last failed attempt */
  lastError?: string;
  /** QStash message ID for cancellation */
  qstashMessageId?: string;
  /** Resend email ID after successful send */
  resendEmailId?: string;
  /** Job creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Additional metadata for email template */
  metadata?: {
    sessionType?: string;
    sessionDate?: string;
    teamName?: string;
    mentorNames?: string[];
    prepFormUrl?: string;
    feedbackFormUrl?: string;
  };
}

/**
 * Batch status derived from individual job statuses
 */
export type BatchStatus =
  | "pending" // All jobs pending
  | "in_progress" // Some jobs scheduled/processing
  | "completed" // All jobs completed successfully
  | "partial_failure" // Some jobs failed, some completed
  | "failed"; // All jobs failed

/**
 * Batch of email jobs (created together for a session)
 */
export interface EmailJobBatch {
  /** Unique batch ID (UUID) */
  id: string;
  /** Session this batch relates to */
  sessionId: string;
  /** Session display name for UI */
  sessionName: string;
  /** Total number of jobs in batch */
  totalJobs: number;
  /** Number of completed jobs */
  completedJobs: number;
  /** Number of failed jobs */
  failedJobs: number;
  /** Number of cancelled jobs */
  cancelledJobs: number;
  /** Derived batch status */
  status: BatchStatus;
  /** Batch creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** User who created the batch */
  createdBy?: string;
}

/**
 * Job progress for UI display
 */
export interface JobProgress {
  /** Batch ID */
  batchId: string;
  /** Session ID */
  sessionId: string;
  /** Session name for display */
  sessionName: string;
  /** Total jobs in batch */
  total: number;
  /** Completed jobs count */
  completed: number;
  /** Failed jobs count */
  failed: number;
  /** Cancelled jobs count */
  cancelled: number;
  /** Current batch status */
  status: BatchStatus;
  /** Individual job details (optional, for expanded view) */
  jobs?: EmailJob[];
}

/**
 * Payload sent to QStash worker (single email)
 */
export interface QStashEmailPayload {
  /** Job ID for status updates */
  jobId: string;
  /** Batch ID for progress tracking */
  batchId: string;
  /** Session ID */
  sessionId: string;
  /** Email type */
  type: EmailJobType;
  /** Recipient email */
  to: string;
  /** Recipient name */
  recipientName: string;
  /** Email metadata for template */
  metadata: EmailJob["metadata"];
}

/**
 * Single recipient within a batch payload
 */
export interface BatchRecipient {
  /** Job ID for status updates */
  jobId: string;
  /** Recipient email */
  to: string;
  /** Recipient display name */
  recipientName: string;
  /** Recipient role for template customization */
  role?: "student" | "mentor";
}

/**
 * Batch payload sent to QStash worker
 * Groups multiple emails of the same type and scheduled time
 */
export interface QStashBatchPayload {
  /** Flag to identify batch payloads */
  isBatch: true;
  /** Parent batch ID for job tracking */
  batchId: string;
  /** Session this batch relates to */
  sessionId: string;
  /** Email type (all recipients in batch share this) */
  type: EmailJobType;
  /** Scheduled send time (ISO string) */
  scheduledFor: string;
  /** List of recipients */
  recipients: BatchRecipient[];
  /** Shared metadata for email template */
  metadata: EmailJob["metadata"];
}

/**
 * Worker response for batch processing
 */
export interface BatchWorkerResult {
  /** Job ID */
  jobId: string;
  /** Resend email ID if successful */
  emailId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * QStash callback payload (success)
 */
export interface QStashCallbackPayload {
  /** Original job payload */
  body: QStashEmailPayload;
  /** Response from worker */
  response?: {
    /** Resend email ID */
    emailId?: string;
    /** Status code */
    status: number;
  };
}

/**
 * QStash failure callback payload
 */
export interface QStashFailurePayload {
  /** Original job payload */
  body: QStashEmailPayload;
  /** Error information */
  error: {
    message: string;
    status?: number;
  };
  /** Number of attempts made */
  attempts: number;
}

/**
 * Dead letter queue entry
 */
export interface DeadLetterEntry {
  /** Original job */
  job: EmailJob;
  /** Failure reason */
  reason: string;
  /** When it was added to DLQ */
  addedAt: string;
  /** Whether it's been manually reviewed */
  reviewed: boolean;
}
