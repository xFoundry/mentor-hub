/**
 * Session Email Jobs API
 *
 * GET: Retrieve all email jobs for a session
 * POST: Retry all failed email jobs for a session
 * DELETE: Cancel a specific pending/scheduled email job
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionJobs, getJob, updateJobStatus } from "@/lib/notifications/job-store";
import { cancelScheduledEmail, retryAllFailedJobsForSession } from "@/lib/notifications/qstash-scheduler";
import { isRedisAvailable } from "@/lib/redis";
import { requireStaffSession } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * GET /api/sessions/[id]/emails
 *
 * Returns all email jobs for a session with full details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffSession();
    if (auth instanceof NextResponse) return auth;

    const { id: sessionId } = await params;

    // DEBUG: Log the session ID being queried
    console.log(`[Session Emails API:DEBUG] Fetching jobs for session`, {
      sessionId,
      redisKeyPattern: `email:session:${sessionId}:batches`,
    });

    // Check Redis availability
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { error: "Email job tracking service unavailable" },
        { status: 503 }
      );
    }

    const jobs = await getSessionJobs(sessionId);

    // DEBUG: Log the results
    console.log(`[Session Emails API:DEBUG] Query results`, {
      sessionId,
      jobCount: jobs.length,
      jobIds: jobs.map(j => j.id).slice(0, 5), // First 5 job IDs
      statuses: jobs.reduce((acc, j) => {
        acc[j.status] = (acc[j.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    });

    // Sort by scheduled time (upcoming first)
    jobs.sort((a, b) =>
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );

    // Group by status for summary
    const summary = {
      pending: jobs.filter(j => j.status === "pending").length,
      scheduled: jobs.filter(j => j.status === "scheduled").length,
      processing: jobs.filter(j => j.status === "processing").length,
      completed: jobs.filter(j => j.status === "completed").length,
      failed: jobs.filter(j => j.status === "failed").length,
      cancelled: jobs.filter(j => j.status === "cancelled").length,
    };

    return NextResponse.json({
      success: true,
      sessionId,
      jobs,
      total: jobs.length,
      summary,
    });
  } catch (error) {
    console.error("[Session Emails API] Error fetching jobs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch email jobs" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]/emails?jobId=xxx
 *
 * Cancel a specific pending/scheduled email job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffSession();
    if (auth instanceof NextResponse) return auth;

    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId parameter" },
        { status: 400 }
      );
    }

    // Check Redis availability
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { error: "Email job tracking service unavailable" },
        { status: 503 }
      );
    }

    // Get the job to verify it exists and belongs to this session
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (job.sessionId !== sessionId) {
      return NextResponse.json(
        { error: "Job does not belong to this session" },
        { status: 403 }
      );
    }

    // Only cancel jobs that are pending or scheduled
    if (job.status !== "pending" && job.status !== "scheduled") {
      return NextResponse.json(
        { error: `Cannot cancel job with status: ${job.status}` },
        { status: 400 }
      );
    }

    // Cancel via QStash if we have a message ID
    if (job.qstashMessageId) {
      const success = await cancelScheduledEmail(job.qstashMessageId);
      if (!success) {
        console.warn(`[Session Emails API] Failed to cancel QStash message ${job.qstashMessageId}`);
        // Continue anyway - the message might have already been delivered
      }
    }

    // Update job status to cancelled
    await updateJobStatus(jobId, "cancelled");

    console.log(`[Session Emails API] Cancelled job ${jobId} for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      jobId,
      message: "Email job cancelled successfully",
    });
  } catch (error) {
    console.error("[Session Emails API] Error cancelling job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel email job" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[id]/emails
 *
 * Retry all failed email jobs for a session
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffSession();
    if (auth instanceof NextResponse) return auth;

    const { id: sessionId } = await params;

    // Check Redis availability
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { error: "Email job tracking service unavailable" },
        { status: 503 }
      );
    }

    // Retry all failed jobs
    const result = await retryAllFailedJobsForSession(sessionId);

    if (result.total === 0) {
      return NextResponse.json({
        success: true,
        message: "No failed jobs to retry",
        ...result,
      });
    }

    console.log(`[Session Emails API] Retried ${result.retried}/${result.total} failed jobs for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: `Retried ${result.retried} of ${result.total} failed jobs`,
      ...result,
    });
  } catch (error) {
    console.error("[Session Emails API] Error retrying failed jobs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry email jobs" },
      { status: 500 }
    );
  }
}
