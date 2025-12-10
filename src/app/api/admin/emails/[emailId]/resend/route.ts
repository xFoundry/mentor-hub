import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJobStatus, createJob } from "@/lib/notifications/job-store";
import { scheduleSingleJobViaQStash } from "@/lib/notifications/qstash-scheduler";
import { v4 as uuid } from "uuid";

/**
 * POST /api/admin/emails/[emailId]/resend
 * Resend a completed email (creates a new job)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  // TODO: Add auth check for staff only

  const { emailId } = await params;

  try {
    // Get the original job
    const originalJob = await getJob(emailId);

    if (!originalJob) {
      return NextResponse.json(
        { error: "Email job not found" },
        { status: 404 }
      );
    }

    if (originalJob.status !== "completed") {
      return NextResponse.json(
        { error: "Can only resend completed emails. Use retry for failed emails." },
        { status: 400 }
      );
    }

    // Create a new job based on the original (don't modify the completed one)
    const newJobId = uuid();
    const newJob = await createJob({
      id: newJobId,
      batchId: originalJob.batchId,
      sessionId: originalJob.sessionId,
      type: originalJob.type,
      recipientEmail: originalJob.recipientEmail,
      recipientName: originalJob.recipientName,
      scheduledFor: new Date().toISOString(), // Send immediately
      metadata: originalJob.metadata,
      status: "pending",
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Schedule via QStash for immediate delivery
    const result = await scheduleSingleJobViaQStash(newJob);

    if (result?.messageId) {
      // Update job with QStash message ID
      await updateJobStatus(newJob.id, "scheduled", {
        qstashMessageId: result.messageId,
      });

      return NextResponse.json({
        success: true,
        message: `Email resent to ${originalJob.recipientEmail}`,
        newJobId: newJob.id,
        messageId: result.messageId,
      });
    } else {
      // Failed to schedule
      await updateJobStatus(newJob.id, "failed", {
        lastError: "Failed to schedule resend via QStash",
      });

      return NextResponse.json(
        { error: "Failed to schedule resend" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`[Admin] Error resending email ${emailId}:`, error);
    return NextResponse.json(
      {
        error: "Failed to resend email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
