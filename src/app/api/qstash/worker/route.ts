/**
 * QStash Worker Endpoint
 *
 * Receives email jobs from QStash and sends them via Resend.
 * Supports both single-email payloads and batch payloads.
 * This endpoint is called by QStash when scheduled emails are due to be sent.
 */

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { qstashReceiver } from "@/lib/qstash";
import { updateJobStatus, updateBatchJobStatuses } from "@/lib/notifications/job-store";
import {
  getResendClient,
  getFromEmail,
  getAppUrl,
  getEffectiveRecipient,
  getSubjectPrefix,
  isTestModeEnabled,
} from "@/lib/resend";
import { MeetingPrepReminderEmail } from "@/emails/meeting-prep-reminder";
import { ImmediateFeedbackReminderEmail } from "@/emails/immediate-feedback-reminder";
import type {
  QStashEmailPayload,
  QStashBatchPayload,
  BatchRecipient,
  BatchWorkerResult,
  EmailJobType,
  EmailJob,
} from "@/lib/notifications/job-types";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds max for batch processing

/**
 * Render a single email based on type and recipient
 */
async function renderEmail(
  type: EmailJobType,
  recipient: BatchRecipient,
  sessionId: string,
  metadata: EmailJob["metadata"],
  appUrl: string
): Promise<{ html: string; subject: string }> {
  const subjectPrefix = getSubjectPrefix();
  const testIndicator = isTestModeEnabled() ? ` (to: ${recipient.to})` : "";
  let html: string;
  let subject: string;

  switch (type) {
    case "prep48h":
      html = await render(
        MeetingPrepReminderEmail({
          recipientName: recipient.recipientName || "there",
          sessionType: metadata?.sessionType || "Session",
          mentorName: metadata?.mentorNames?.[0] || "your mentor",
          sessionDate: metadata?.sessionDate || "",
          sessionTime: metadata?.sessionTime || "",
          hoursUntilSession: 48,
          sessionUrl: `${appUrl}/sessions/${sessionId}?tab=preparation`,
        })
      );
      subject = `${subjectPrefix}Submit meeting prep to unlock Zoom link - session in 2 days${testIndicator}`;
      break;

    case "prep24h":
      html = await render(
        MeetingPrepReminderEmail({
          recipientName: recipient.recipientName || "there",
          sessionType: metadata?.sessionType || "Session",
          mentorName: metadata?.mentorNames?.[0] || "your mentor",
          sessionDate: metadata?.sessionDate || "",
          sessionTime: metadata?.sessionTime || "",
          hoursUntilSession: 24,
          sessionUrl: `${appUrl}/sessions/${sessionId}?tab=preparation`,
        })
      );
      subject = `${subjectPrefix}Submit meeting prep to unlock Zoom link - session tomorrow${testIndicator}`;
      break;

    case "mentorPrep":
      html = await render(
        MeetingPrepReminderEmail({
          recipientName: recipient.recipientName || "there",
          sessionType: metadata?.sessionType || "Session",
          mentorName: "your team",
          sessionDate: metadata?.sessionDate || "",
          sessionTime: metadata?.sessionTime || "",
          hoursUntilSession: 24,
          sessionUrl: `${appUrl}/sessions/${sessionId}?tab=preparation`,
        })
      );
      subject = `${subjectPrefix}Upcoming session with ${metadata?.teamName || "your team"} tomorrow${testIndicator}`;
      break;

    case "feedback":
    case "feedbackImmediate": {
      // Use role from recipient, fallback to checking mentor names
      const role = recipient.role ||
        (metadata?.mentorNames?.includes(recipient.recipientName) ? "mentor" : "student");
      const otherPartyName = role === "student"
        ? (metadata?.mentorNames?.[0] || "your mentor")
        : (metadata?.teamName || "the team");

      html = await render(
        ImmediateFeedbackReminderEmail({
          recipientName: recipient.recipientName || "there",
          role,
          sessionType: metadata?.sessionType || "Session",
          otherPartyName,
          sessionDate: metadata?.sessionDate || "",
          sessionTime: metadata?.sessionTime || "",
          sessionUrl: `${appUrl}/sessions/${sessionId}?tab=feedback`,
        })
      );

      subject = role === "student"
        ? `${subjectPrefix}How was your session with ${otherPartyName}?${testIndicator}`
        : `${subjectPrefix}Quick feedback on your session with ${otherPartyName}${testIndicator}`;
      break;
    }

    default:
      throw new Error(`Unknown email type: ${type}`);
  }

  return { html, subject };
}

/**
 * Handle batch payload - send multiple emails via Resend batch API
 */
async function handleBatchPayload(
  payload: QStashBatchPayload
): Promise<NextResponse> {
  const { sessionId, type, recipients, metadata } = payload;

  console.log(`[QStash Worker] Processing batch: ${recipients.length} ${type} emails for session ${sessionId}`);

  // Update all jobs to processing
  await updateBatchJobStatuses(
    recipients.map((r) => ({
      jobId: r.jobId,
      status: "processing" as const,
    }))
  );

  // Get Resend client
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Email sending is not configured");
  }

  const appUrl = getAppUrl();
  const fromEmail = getFromEmail();

  // Render templates for all recipients
  const emails = await Promise.all(
    recipients.map(async (recipient) => {
      const { html, subject } = await renderEmail(
        type,
        recipient,
        sessionId,
        metadata,
        appUrl
      );

      return {
        from: fromEmail,
        to: getEffectiveRecipient(recipient.to),
        subject,
        html,
        // Store jobId in headers for correlation in callback
        headers: {
          "X-Job-Id": recipient.jobId,
        },
      };
    })
  );

  // Send batch via Resend
  console.log(`[QStash Worker] Sending ${emails.length} emails via Resend batch API...`);
  console.log(`[QStash Worker] Email details:`, emails.map(e => ({
    to: e.to,
    subject: e.subject?.substring(0, 50),
    from: e.from,
    htmlLength: e.html?.length,
  })));

  const result = await resend.batch.send(emails);

  // Log the full Resend response for debugging
  console.log(`[QStash Worker] Resend batch response:`, {
    hasData: !!result.data,
    dataType: typeof result.data,
    dataLength: Array.isArray(result.data) ? result.data.length : 0,
    data: result.data, // Log actual data for debugging
    hasError: !!result.error,
    errorType: typeof result.error,
    errorMessage: result.error?.message,
    errorName: result.error?.name,
    error: JSON.stringify(result.error), // Stringify to see all properties
  });

  // Build per-recipient results
  // Resend batch.send returns { data: { data: [...] } } - extract the inner array
  // Handle both possible formats for compatibility
  const rawData = result.data as Array<{ id: string }> | { data?: Array<{ id: string }> } | null;
  const batchData: Array<{ id: string }> | null = Array.isArray(rawData)
    ? rawData
    : (rawData?.data && Array.isArray(rawData.data) ? rawData.data : null);

  console.log(`[QStash Worker] Extracted batch data:`, {
    batchDataLength: batchData?.length || 0,
    batchData: batchData,
  });

  const results: BatchWorkerResult[] = recipients.map((recipient, index) => {
    const emailResult = batchData?.[index];
    const hasError = result.error || !emailResult?.id;

    if (hasError) {
      console.log(`[QStash Worker] Email failed for ${recipient.to}:`, {
        jobId: recipient.jobId,
        error: result.error?.message || "No email ID returned",
        emailResult,
      });
    }

    return {
      jobId: recipient.jobId,
      emailId: emailResult?.id,
      error: hasError ? (result.error?.message || "Failed to send email") : undefined,
    };
  });

  const successCount = results.filter(r => r.emailId && !r.error).length;
  const failCount = results.filter(r => r.error).length;

  console.log(`[QStash Worker] Batch complete: ${successCount} sent, ${failCount} failed`);

  // Return success with per-recipient results for callback to process
  return NextResponse.json({
    success: true,
    isBatch: true,
    results,
  });
}

/**
 * Handle single email payload (legacy support)
 */
async function handleSinglePayload(
  payload: QStashEmailPayload
): Promise<NextResponse> {
  const { jobId, sessionId, type, to, recipientName, metadata } = payload;

  console.log(`[QStash Worker] Processing single job ${jobId} (type: ${type}, to: ${to})`);

  // Update job status to processing
  await updateJobStatus(jobId, "processing", { incrementAttempts: true });

  // Get Resend client
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Email sending is not configured");
  }

  const appUrl = getAppUrl();
  const fromEmail = getFromEmail();

  // Convert to BatchRecipient format for shared render function
  const recipient: BatchRecipient = {
    jobId,
    to,
    recipientName,
  };

  const { html, subject } = await renderEmail(type, recipient, sessionId, metadata, appUrl);

  // Send the email via Resend
  const result = await resend.emails.send({
    from: fromEmail,
    to: getEffectiveRecipient(to),
    subject,
    html,
  });

  if (result.error) {
    console.error(`[QStash Worker] Resend error for job ${jobId}:`, result.error);
    throw new Error(result.error.message || "Failed to send email");
  }

  console.log(`[QStash Worker] Email sent successfully: ${result.data?.id}`);

  return NextResponse.json({
    success: true,
    emailId: result.data?.id,
    jobId,
  });
}

/**
 * POST handler - Receives and processes email jobs from QStash
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
        console.error("[QStash Worker] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      // In production, signature is required
      console.error("[QStash Worker] Missing signature in production");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Parse the payload and detect batch vs single
    const payload = JSON.parse(body);

    if (payload.isBatch) {
      return await handleBatchPayload(payload as QStashBatchPayload);
    } else {
      return await handleSinglePayload(payload as QStashEmailPayload);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[QStash Worker] Error:", errorMessage);

    // Return error (QStash will retry based on config)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
