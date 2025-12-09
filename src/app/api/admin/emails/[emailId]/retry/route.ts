import { NextRequest, NextResponse } from "next/server";
import { retryJob, updateJobStatus } from "@/lib/notifications/job-store";
import { scheduleSingleJobViaQStash } from "@/lib/notifications/qstash-scheduler";

/**
 * POST /api/admin/emails/[emailId]/retry
 * Retry a failed email job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  // TODO: Add auth check for staff only

  const { emailId } = await params;

  try {
    // Reset job status to pending
    const job = await retryJob(emailId);

    // Re-schedule via QStash
    const result = await scheduleSingleJobViaQStash(job);

    if (result?.messageId) {
      // Update job with new QStash message ID
      await updateJobStatus(job.id, "scheduled", {
        qstashMessageId: result.messageId,
      });

      return NextResponse.json({
        success: true,
        message: `Email ${emailId} scheduled for retry`,
        messageId: result.messageId,
      });
    } else {
      // Failed to schedule, mark as failed again
      await updateJobStatus(job.id, "failed", {
        lastError: "Failed to schedule retry via QStash",
      });

      return NextResponse.json(
        { error: "Failed to schedule retry" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`[Admin] Error retrying email ${emailId}:`, error);
    return NextResponse.json(
      {
        error: "Failed to retry email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
