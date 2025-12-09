/**
 * QStash Success Callback Endpoint
 *
 * Called by QStash when a message is successfully delivered to the worker.
 * Handles both single email and batch email results.
 * Updates job statuses to completed and stores Resend email IDs.
 */

import { NextRequest, NextResponse } from "next/server";
import { qstashReceiver } from "@/lib/qstash";
import { updateJobStatus, updateBatchJobStatuses, getJob, getBatch } from "@/lib/notifications/job-store";
import type { QStashCallbackPayload, QStashBatchPayload, BatchWorkerResult } from "@/lib/notifications/job-types";

export const runtime = "nodejs";

/**
 * Handle batch callback - process results for multiple recipients
 */
async function handleBatchCallback(
  payload: QStashBatchPayload,
  workerResponse: { results?: BatchWorkerResult[] }
): Promise<NextResponse> {
  const { batchId, sessionId, type, recipients } = payload;
  const results = workerResponse.results || [];

  console.log(`[QStash Callback] Batch callback for ${recipients.length} ${type} emails (session: ${sessionId})`);

  // Build status updates from worker results
  const updates = results.map((result) => ({
    jobId: result.jobId,
    status: result.error ? "failed" as const : "completed" as const,
    metadata: {
      resendEmailId: result.emailId,
      lastError: result.error,
    },
  }));

  // Update all job statuses atomically
  await updateBatchJobStatuses(updates);

  const successCount = results.filter(r => r.emailId && !r.error).length;
  const failCount = results.filter(r => r.error).length;

  console.log(`[QStash Callback] Batch complete: ${successCount} succeeded, ${failCount} failed`);

  return NextResponse.json({
    success: true,
    isBatch: true,
    batchId,
    completed: successCount,
    failed: failCount,
  });
}

/**
 * Handle single email callback (legacy support)
 */
async function handleSingleCallback(
  payload: QStashCallbackPayload["body"],
  resendEmailId?: string
): Promise<NextResponse> {
  const { jobId, batchId, sessionId, type, to } = payload;

  console.log(`[QStash Callback] Job ${jobId} completed successfully (emailId: ${resendEmailId || "unknown"})`);

  // Update job status to completed
  await updateJobStatus(jobId, "completed", {
    resendEmailId,
  });

  // Log the email mapping for debugging
  const emailKey = `${type}_${to}`;
  console.log(`[QStash Callback] Email mapping: ${emailKey} -> ${resendEmailId || "unknown"} (session: ${sessionId})`);

  return NextResponse.json({
    success: true,
    jobId,
    status: "completed",
  });
}

/**
 * POST handler - Receives success callbacks from QStash
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
        console.error("[QStash Callback] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("[QStash Callback] Missing signature in production");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Parse the callback payload
    // QStash callback format includes the original body and response
    const callbackData = JSON.parse(body);

    // The original job payload is in sourceBody (base64 encoded)
    let originalPayload: QStashCallbackPayload["body"] | QStashBatchPayload;
    if (callbackData.sourceBody) {
      const decodedBody = Buffer.from(callbackData.sourceBody, "base64").toString("utf-8");
      originalPayload = JSON.parse(decodedBody);
    } else if (callbackData.body) {
      // Fallback for different callback formats
      originalPayload = typeof callbackData.body === "string"
        ? JSON.parse(callbackData.body)
        : callbackData.body;
    } else {
      console.error("[QStash Callback] No payload found in callback");
      return NextResponse.json({ error: "No payload found" }, { status: 400 });
    }

    // Parse the worker response
    let workerResponse: any = {};
    if (callbackData.body) {
      try {
        workerResponse = typeof callbackData.body === "string"
          ? JSON.parse(callbackData.body)
          : callbackData.body;
      } catch {
        // Response parsing failed, continue with empty response
      }
    }

    // Check if this is a batch callback
    if ((originalPayload as QStashBatchPayload).isBatch) {
      return await handleBatchCallback(
        originalPayload as QStashBatchPayload,
        workerResponse
      );
    } else {
      return await handleSingleCallback(
        originalPayload as QStashCallbackPayload["body"],
        workerResponse.emailId
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[QStash Callback] Error:", errorMessage);

    // Return 200 even on error to prevent QStash retrying the callback
    // The job status update failure is logged but not critical
    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}
