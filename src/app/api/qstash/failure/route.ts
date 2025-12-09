/**
 * QStash Failure Callback Endpoint (Dead Letter Queue)
 *
 * Called by QStash when a message has exhausted all retries.
 * Handles both single email and batch email failures.
 * Updates job status to failed and adds to dead letter queue for manual review.
 */

import { NextRequest, NextResponse } from "next/server";
import { qstashReceiver } from "@/lib/qstash";
import {
  updateJobStatus,
  updateBatchJobStatuses,
  getJob,
  addToDeadLetterQueue,
} from "@/lib/notifications/job-store";
import type { QStashFailurePayload, QStashBatchPayload } from "@/lib/notifications/job-types";

export const runtime = "nodejs";

/**
 * Extract error message from QStash callback data
 */
function extractErrorMessage(callbackData: any): string {
  let errorMessage = "Unknown error after retries exhausted";

  if (callbackData.error) {
    errorMessage = typeof callbackData.error === "string"
      ? callbackData.error
      : callbackData.error.message || JSON.stringify(callbackData.error);
  }
  if (callbackData.responseBody) {
    try {
      const responseBody = typeof callbackData.responseBody === "string"
        ? JSON.parse(callbackData.responseBody)
        : callbackData.responseBody;
      if (responseBody.error) {
        errorMessage = responseBody.error;
      }
    } catch {
      // Response parsing failed
    }
  }

  return errorMessage;
}

/**
 * Handle batch failure - mark all recipients as failed
 */
async function handleBatchFailure(
  payload: QStashBatchPayload,
  errorMessage: string,
  attempts: number
): Promise<NextResponse> {
  const { batchId, sessionId, type, recipients } = payload;

  console.error(`[QStash Failure] Batch failed after ${attempts} attempts: ${errorMessage}`);
  console.error(`[QStash Failure] Details - type: ${type}, session: ${sessionId}, recipients: ${recipients.length}`);

  // Update all job statuses to failed
  await updateBatchJobStatuses(
    recipients.map((r) => ({
      jobId: r.jobId,
      status: "failed" as const,
      metadata: { lastError: errorMessage },
    }))
  );

  // Add each job to dead letter queue
  for (const recipient of recipients) {
    const job = await getJob(recipient.jobId);
    if (job) {
      await addToDeadLetterQueue(job, errorMessage);
    }
  }

  console.log(`[QStash Failure] ${recipients.length} jobs added to dead letter queue`);

  // Log for monitoring/alerting
  console.error("[QStash Failure] Batch dead letter entry:", {
    batchId,
    sessionId,
    type,
    recipientCount: recipients.length,
    errorMessage,
    attempts,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    isBatch: true,
    batchId,
    failedCount: recipients.length,
    addedToDeadLetterQueue: true,
  });
}

/**
 * Handle single email failure (legacy support)
 */
async function handleSingleFailure(
  payload: QStashFailurePayload["body"],
  errorMessage: string,
  attempts: number
): Promise<NextResponse> {
  const { jobId, batchId, sessionId, type, to, recipientName } = payload;

  console.error(`[QStash Failure] Job ${jobId} failed after ${attempts} attempts: ${errorMessage}`);
  console.error(`[QStash Failure] Details - type: ${type}, to: ${to}, session: ${sessionId}`);

  // Update job status to failed
  await updateJobStatus(jobId, "failed", {
    lastError: errorMessage,
  });

  // Get the full job details for dead letter queue
  const job = await getJob(jobId);
  if (job) {
    await addToDeadLetterQueue(job, errorMessage);
    console.log(`[QStash Failure] Job ${jobId} added to dead letter queue`);
  }

  // Log for monitoring/alerting
  console.error("[QStash Failure] Dead letter entry:", {
    jobId,
    batchId,
    sessionId,
    type,
    to,
    recipientName,
    errorMessage,
    attempts,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    jobId,
    status: "failed",
    addedToDeadLetterQueue: true,
  });
}

/**
 * POST handler - Receives failure callbacks from QStash
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body and signature for verification
    const body = await request.text();
    const signature = request.headers.get("upstash-signature");

    // Verify the request is from QStash
    if (signature) {
      const isValid = await qstashReceiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        console.error("[QStash Failure] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("[QStash Failure] Missing signature in production");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Parse the failure callback payload
    const callbackData = JSON.parse(body);

    // The original job payload is in sourceBody (base64 encoded)
    let originalPayload: QStashFailurePayload["body"] | QStashBatchPayload;
    if (callbackData.sourceBody) {
      const decodedBody = Buffer.from(callbackData.sourceBody, "base64").toString("utf-8");
      originalPayload = JSON.parse(decodedBody);
    } else if (callbackData.body) {
      originalPayload = typeof callbackData.body === "string"
        ? JSON.parse(callbackData.body)
        : callbackData.body;
    } else {
      console.error("[QStash Failure] No payload found in callback");
      return NextResponse.json({ error: "No payload found" }, { status: 400 });
    }

    // Extract error information
    const errorMessage = extractErrorMessage(callbackData);
    const attempts = callbackData.retried !== undefined ? callbackData.retried + 1 : 0;

    // Check if this is a batch failure
    if ((originalPayload as QStashBatchPayload).isBatch) {
      return await handleBatchFailure(
        originalPayload as QStashBatchPayload,
        errorMessage,
        attempts
      );
    } else {
      return await handleSingleFailure(
        originalPayload as QStashFailurePayload["body"],
        errorMessage,
        attempts
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[QStash Failure] Handler error:", errorMessage);

    // Return 200 to prevent QStash retrying the callback
    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}
