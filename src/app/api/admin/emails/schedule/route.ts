/**
 * Bulk Email Schedule API
 *
 * Allows staff to schedule/reschedule emails for sessions.
 * Supports scheduling for a single session or all upcoming sessions.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUpcomingSessions, getSessionById } from "@/lib/baseql";
import { scheduleSessionEmailsViaQStash, isQStashSchedulerEnabled } from "@/lib/notifications/qstash-scheduler";
import { getSessionBatches, deleteBatch } from "@/lib/notifications/job-store";
import { isRedisAvailable } from "@/lib/redis";
import type { Session } from "@/types/schema";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for bulk operations

interface ScheduleResult {
  sessionId: string;
  sessionName: string;
  scheduledStart: string;
  success: boolean;
  batchId?: string;
  jobCount?: number;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * POST /api/admin/emails/schedule
 *
 * Schedule emails for sessions
 *
 * Body:
 * - sessionId?: string - Schedule for a specific session
 * - sessionIds?: string[] - Schedule for multiple specific sessions
 * - all?: boolean - Schedule for all upcoming sessions
 * - cohortId?: string - Filter by cohort when using all=true
 * - force?: boolean - Delete existing batches and reschedule
 * - dryRun?: boolean - Don't actually schedule, just show what would happen
 * - createdBy?: string - User ID for tracking
 */
export async function POST(request: NextRequest) {
  try {
    // Check prerequisites
    if (!isQStashSchedulerEnabled()) {
      return NextResponse.json(
        { error: "QStash scheduler is not enabled. Set USE_QSTASH_SCHEDULER=true" },
        { status: 400 }
      );
    }

    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { error: "Redis is not available" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      sessionId,
      sessionIds,
      all,
      cohortId,
      force = false,
      dryRun = false,
      createdBy,
    } = body;

    // Validate input
    if (!sessionId && !sessionIds && !all) {
      return NextResponse.json(
        { error: "Must provide sessionId, sessionIds, or all=true" },
        { status: 400 }
      );
    }

    let sessionsToSchedule: Session[] = [];

    // Get sessions based on input
    if (sessionId) {
      console.log(`[Bulk Schedule] Fetching single session: ${sessionId}`);
      const session = await getSessionById(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: `Session not found: ${sessionId}` },
          { status: 404 }
        );
      }
      sessionsToSchedule = [session];
    } else if (sessionIds && Array.isArray(sessionIds)) {
      console.log(`[Bulk Schedule] Fetching ${sessionIds.length} sessions`);
      const sessions = await Promise.all(
        sessionIds.map((id: string) => getSessionById(id))
      );
      sessionsToSchedule = sessions.filter((s): s is Session => s !== null);
    } else if (all) {
      console.log(`[Bulk Schedule] Fetching all upcoming sessions${cohortId ? ` for cohort ${cohortId}` : ""}`);
      sessionsToSchedule = await getUpcomingSessions(cohortId);
    }

    if (sessionsToSchedule.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No sessions to schedule",
        results: [],
        summary: { total: 0, scheduled: 0, skipped: 0, failed: 0 },
      });
    }

    console.log(`[Bulk Schedule] Processing ${sessionsToSchedule.length} sessions (force=${force}, dryRun=${dryRun})`);

    const results: ScheduleResult[] = [];
    let scheduled = 0;
    let skipped = 0;
    let failed = 0;

    for (const session of sessionsToSchedule) {
      const result: ScheduleResult = {
        sessionId: session.id,
        sessionName: session.sessionType || "Session",
        scheduledStart: session.scheduledStart || "not set",
        success: false,
      };

      try {
        // Skip if no scheduled start
        if (!session.scheduledStart) {
          result.skipped = true;
          result.skipReason = "No scheduled start time";
          skipped++;
          results.push(result);
          continue;
        }

        // Skip if session is in the past
        const sessionDate = new Date(session.scheduledStart);
        if (sessionDate < new Date()) {
          result.skipped = true;
          result.skipReason = "Session is in the past";
          skipped++;
          results.push(result);
          continue;
        }

        // Check for existing batches
        const existingBatches = await getSessionBatches(session.id);
        const hasActiveBatches = existingBatches.some(
          b => b.status === "pending" || b.status === "in_progress"
        );

        if (hasActiveBatches && !force) {
          result.skipped = true;
          result.skipReason = `Has ${existingBatches.length} existing batch(es). Use force=true to reschedule.`;
          skipped++;
          results.push(result);
          continue;
        }

        // Delete existing batches if force=true
        if (force && existingBatches.length > 0) {
          console.log(`[Bulk Schedule] Deleting ${existingBatches.length} existing batches for session ${session.id}`);
          for (const batch of existingBatches) {
            await deleteBatch(batch.batchId);
          }
        }

        // Dry run - don't actually schedule
        if (dryRun) {
          result.success = true;
          result.skipped = true;
          result.skipReason = "Dry run - would schedule";
          skipped++;
          results.push(result);
          continue;
        }

        // Schedule emails
        console.log(`[Bulk Schedule] Scheduling emails for session ${session.id}`);
        const scheduleResult = await scheduleSessionEmailsViaQStash(session, createdBy);

        if (scheduleResult) {
          result.success = true;
          result.batchId = scheduleResult.batchId;
          result.jobCount = scheduleResult.jobCount;
          scheduled++;
          console.log(`[Bulk Schedule] Session ${session.id}: ${scheduleResult.jobCount} jobs in batch ${scheduleResult.batchId}`);
        } else {
          result.skipped = true;
          result.skipReason = "No jobs to schedule (no participants or invalid times)";
          skipped++;
        }
      } catch (error) {
        result.success = false;
        result.error = error instanceof Error ? error.message : "Unknown error";
        failed++;
        console.error(`[Bulk Schedule] Error scheduling session ${session.id}:`, error);
      }

      results.push(result);
    }

    const summary = {
      total: sessionsToSchedule.length,
      scheduled,
      skipped,
      failed,
    };

    console.log(`[Bulk Schedule] Complete:`, summary);

    return NextResponse.json({
      success: failed === 0,
      message: `Scheduled ${scheduled} of ${sessionsToSchedule.length} sessions`,
      results,
      summary,
    });
  } catch (error) {
    console.error("[Bulk Schedule] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to schedule emails" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/emails/schedule
 *
 * Get scheduling status for upcoming sessions
 *
 * Query params:
 * - cohortId?: string - Filter by cohort
 * - limit?: number - Max sessions to return (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get("cohortId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { error: "Redis is not available" },
        { status: 503 }
      );
    }

    console.log(`[Schedule Status] Fetching upcoming sessions${cohortId ? ` for cohort ${cohortId}` : ""}`);
    const sessions = await getUpcomingSessions(cohortId);
    const limitedSessions = sessions.slice(0, limit);

    const results = await Promise.all(
      limitedSessions.map(async (session) => {
        const batches = await getSessionBatches(session.id);
        const activeBatch = batches.find(
          b => b.status === "pending" || b.status === "in_progress"
        );
        const completedBatch = batches.find(
          b => b.status === "completed" || b.status === "partial_failure"
        );

        return {
          sessionId: session.id,
          sessionName: session.sessionType || "Session",
          scheduledStart: session.scheduledStart,
          teamName: session.team?.[0]?.teamName,
          hasScheduledEmails: !!activeBatch,
          batchStatus: activeBatch?.status || completedBatch?.status || "none",
          batchId: activeBatch?.batchId || completedBatch?.batchId,
          totalJobs: activeBatch?.total || completedBatch?.total || 0,
          completedJobs: activeBatch?.completed || completedBatch?.completed || 0,
          failedJobs: activeBatch?.failed || completedBatch?.failed || 0,
        };
      })
    );

    const summary = {
      total: results.length,
      withScheduledEmails: results.filter(r => r.hasScheduledEmails).length,
      withCompletedEmails: results.filter(r => r.batchStatus === "completed").length,
      withFailedEmails: results.filter(r => r.failedJobs > 0).length,
      withoutEmails: results.filter(r => r.batchStatus === "none").length,
    };

    return NextResponse.json({
      success: true,
      sessions: results,
      summary,
      qstashEnabled: isQStashSchedulerEnabled(),
    });
  } catch (error) {
    console.error("[Schedule Status] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get schedule status" },
      { status: 500 }
    );
  }
}
