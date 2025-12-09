/**
 * Job Status API
 *
 * Provides job progress information for the UI to poll.
 * Supports querying by session ID, batch ID, or getting all active batches.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getJobProgress,
  getJobProgressWithDetails,
  getSessionBatches,
  getUserActiveBatches,
  getAllActiveBatches,
  getDeadLetterQueue,
  deleteBatch,
} from "@/lib/notifications/job-store";
import { isRedisAvailable } from "@/lib/redis";

export const runtime = "nodejs";

/**
 * GET handler - Retrieve job status information
 *
 * Query parameters:
 * - sessionId: Get all batches for a specific session
 * - batchId: Get status of a specific batch
 * - active: Get all active (non-completed) batches
 * - userId: Get active batches for a specific user
 * - details: Include individual job details (default: false)
 * - dlq: Get dead letter queue entries
 */
export async function GET(request: NextRequest) {
  try {
    // Check Redis availability
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { error: "Job status service unavailable" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const batchId = searchParams.get("batchId");
    const active = searchParams.get("active") === "true";
    const userId = searchParams.get("userId");
    const details = searchParams.get("details") === "true";
    const dlq = searchParams.get("dlq") === "true";

    // Get dead letter queue entries
    if (dlq) {
      const entries = await getDeadLetterQueue(100);
      return NextResponse.json({
        success: true,
        deadLetterQueue: entries,
        count: entries.length,
      });
    }

    // Get specific batch status
    if (batchId) {
      const progress = details
        ? await getJobProgressWithDetails(batchId)
        : await getJobProgress(batchId);

      if (!progress) {
        return NextResponse.json(
          { error: "Batch not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        progress,
      });
    }

    // Get all batches for a session
    if (sessionId) {
      const batches = await getSessionBatches(sessionId);
      return NextResponse.json({
        success: true,
        sessionId,
        batches,
        count: batches.length,
      });
    }

    // Get active batches for a specific user
    if (userId) {
      const batches = await getUserActiveBatches(userId);
      return NextResponse.json({
        success: true,
        userId,
        batches,
        count: batches.length,
      });
    }

    // Get all active batches (fallback)
    if (active) {
      const batches = await getAllActiveBatches();
      return NextResponse.json({
        success: true,
        batches,
        count: batches.length,
      });
    }

    // No valid query parameters
    return NextResponse.json(
      {
        error: "Missing required query parameter",
        hint: "Use sessionId, batchId, active=true, userId, or dlq=true",
      },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Jobs Status API] Error:", errorMessage);

    return NextResponse.json(
      { error: "Failed to retrieve job status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete a batch and all its jobs
 *
 * Query parameters:
 * - batchId: The batch ID to delete (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check Redis availability
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { error: "Job status service unavailable" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json(
        { error: "Missing batchId parameter" },
        { status: 400 }
      );
    }

    const success = await deleteBatch(batchId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Batch ${batchId} deleted`,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to delete batch" },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Jobs Status API] Delete error:", errorMessage);

    return NextResponse.json(
      { error: "Failed to delete batch" },
      { status: 500 }
    );
  }
}
