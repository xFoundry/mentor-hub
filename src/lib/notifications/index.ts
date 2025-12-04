/**
 * Email Notification Service
 *
 * Handles sending scheduled email notifications for:
 * - Pre-meeting preparation reminders (48h, 24h before)
 * - Post-session feedback reminders (24h after)
 * - Overdue task digests (daily)
 */

import { getResendClient, getFromEmail, getAppUrl, isEmailEnabled } from "../resend";
import { PreMeetingReminderEmail } from "@/emails/pre-meeting-reminder";
import { FeedbackReminderEmail } from "@/emails/feedback-reminder";
import { TaskOverdueDigestEmail } from "@/emails/task-overdue-digest";
import type {
  NotificationBatchResult,
  PreMeetingReminderPayload,
  FeedbackReminderPayload,
  TaskOverdueDigestPayload,
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

    const result = await resend.emails.send({
      from: getFromEmail(),
      to: payload.recipientEmail,
      subject: emailContent.subject,
      react: emailContent.component,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

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
    case "pre-meeting-reminder-48h":
    case "pre-meeting-reminder-24h": {
      const p = payload as PreMeetingReminderPayload;
      const urgency = payload.type === "pre-meeting-reminder-24h" ? "tomorrow" : "in 2 days";
      return {
        subject: `Prepare for your session ${urgency}`,
        component: PreMeetingReminderEmail({
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

    case "feedback-reminder": {
      const p = payload as FeedbackReminderPayload;
      return {
        subject: `Share your feedback from ${p.session.sessionType || "your session"}`,
        component: FeedbackReminderEmail({
          recipientName: p.recipientName,
          role: p.role,
          sessionType: p.session.sessionType || "Session",
          otherPartyName: p.otherPartyName,
          sessionDate: p.sessionDate,
          sessionUrl: `${appUrl}/sessions/${p.session.id}?tab=feedback`,
        }),
      };
    }

    case "task-overdue-digest": {
      const p = payload as TaskOverdueDigestPayload;
      return {
        subject: `You have ${p.tasks.length} overdue task${p.tasks.length !== 1 ? "s" : ""}`,
        component: TaskOverdueDigestEmail({
          recipientName: p.recipientName,
          tasks: p.tasks,
          tasksUrl: `${appUrl}/tasks`,
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
