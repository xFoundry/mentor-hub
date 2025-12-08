/**
 * Email Notification Service
 *
 * Handles sending email notifications for:
 * - Meeting prep reminders (48h, 24h before) - for students
 * - Immediate feedback reminders (at session end) - for all participants
 * - Feedback follow-up reminders (24h after session) - only if no feedback submitted
 */

import {
  getResendClient,
  getFromEmail,
  getAppUrl,
  isEmailEnabled,
  getEffectiveRecipient,
  getSubjectPrefix,
  isTestModeEnabled,
  rateLimitedResend,
} from "../resend";
import { MeetingPrepReminderEmail } from "@/emails/meeting-prep-reminder";
import { ImmediateFeedbackReminderEmail } from "@/emails/immediate-feedback-reminder";
import { FeedbackFollowupReminderEmail } from "@/emails/feedback-followup-reminder";
import type {
  NotificationBatchResult,
  MeetingPrepReminderPayload,
  ImmediateFeedbackReminderPayload,
  FeedbackFollowupReminderPayload,
  AnyNotificationPayload,
  NotificationResult,
} from "./types";

export * from "./types";

/**
 * Send a single notification
 */
export async function sendNotification(
  payload: AnyNotificationPayload
): Promise<NotificationResult> {
  const resend = getResendClient();

  if (!resend) {
    console.log(
      `[Notifications] Email disabled - would send ${payload.type} to ${payload.recipientEmail}`
    );
    return { success: true, notificationId: "dry-run" };
  }

  try {
    const emailContent = renderEmail(payload);
    if (!emailContent) {
      return { success: false, error: "Failed to render email" };
    }

    const effectiveRecipient = getEffectiveRecipient(payload.recipientEmail);
    const subjectPrefix = getSubjectPrefix();
    const testIndicator = isTestModeEnabled() ? ` (to: ${payload.recipientEmail})` : "";

    const result = await rateLimitedResend(() =>
      resend.emails.send({
        from: getFromEmail(),
        to: effectiveRecipient,
        subject: `${subjectPrefix}${emailContent.subject}${testIndicator}`,
        react: emailContent.component,
      })
    );

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    console.log(`[Notifications] Sent ${payload.type} to ${payload.recipientEmail} (to: ${effectiveRecipient})`);
    return { success: true, notificationId: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Send multiple notifications in a batch
 */
export async function sendNotificationBatch(
  payloads: AnyNotificationPayload[]
): Promise<NotificationBatchResult> {
  const result: NotificationBatchResult = {
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  for (const payload of payloads) {
    const notificationResult = await sendNotification(payload);

    result.details.push({
      type: payload.type,
      recipient: payload.recipientEmail,
      success: notificationResult.success,
      error: notificationResult.error,
    });

    if (notificationResult.success) {
      result.sent++;
    } else {
      result.failed++;
    }
  }

  return result;
}

/**
 * Render an email from a notification payload
 */
function renderEmail(
  payload: AnyNotificationPayload
): { subject: string; component: React.ReactElement } | null {
  const appUrl = getAppUrl();

  switch (payload.type) {
    case "meeting-prep-reminder-48h":
    case "meeting-prep-reminder-24h": {
      const p = payload as MeetingPrepReminderPayload;
      const urgency = payload.type === "meeting-prep-reminder-24h" ? "tomorrow" : "in 2 days";
      return {
        subject: `Submit meeting prep to unlock Zoom link - session ${urgency}`,
        component: MeetingPrepReminderEmail({
          recipientName: p.recipientName,
          sessionType: p.session.sessionType || "Session",
          mentorName: p.mentorName,
          sessionDate: p.sessionDate,
          sessionTime: p.sessionTime,
          hoursUntilSession: p.hoursUntilSession,
          sessionUrl: `${appUrl}/sessions/${p.session.id}?tab=preparation`,
        }),
      };
    }

    case "immediate-feedback-reminder": {
      const p = payload as ImmediateFeedbackReminderPayload;
      return {
        subject: p.role === "student"
          ? `How was your session with ${p.otherPartyName}?`
          : `Quick feedback on your session with ${p.otherPartyName}`,
        component: ImmediateFeedbackReminderEmail({
          recipientName: p.recipientName,
          role: p.role,
          sessionType: p.session.sessionType || "Session",
          otherPartyName: p.otherPartyName,
          sessionDate: p.sessionDate,
          sessionTime: p.sessionTime,
          sessionUrl: `${appUrl}/sessions/${p.session.id}?tab=feedback`,
        }),
      };
    }

    case "feedback-followup-reminder": {
      const p = payload as FeedbackFollowupReminderPayload;
      return {
        subject: `Reminder: Share your feedback from ${p.session.sessionType || "your session"}`,
        component: FeedbackFollowupReminderEmail({
          recipientName: p.recipientName,
          role: p.role,
          sessionType: p.session.sessionType || "Session",
          otherPartyName: p.otherPartyName,
          sessionDate: p.sessionDate,
          sessionUrl: `${appUrl}/sessions/${p.session.id}?tab=feedback`,
        }),
      };
    }

    default:
      return null;
  }
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  return isEmailEnabled();
}
