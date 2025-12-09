/**
 * Types for the email notification system
 */

import type { Session, Contact } from "@/types/schema";

/**
 * Notification types supported by the system
 */
export type NotificationType =
  | "meeting-prep-reminder-48h"
  | "meeting-prep-reminder-24h"
  | "immediate-feedback-reminder"
  | "feedback-followup-reminder"
  | "session-update-notification";

/**
 * Base notification payload
 */
export interface NotificationPayload {
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  contactId: string;
}

/**
 * Meeting prep reminder notification (48h and 24h before session)
 */
export interface MeetingPrepReminderPayload extends NotificationPayload {
  type: "meeting-prep-reminder-48h" | "meeting-prep-reminder-24h";
  session: Session;
  mentorName: string;
  sessionDate: string;
  sessionTime: string;
  hoursUntilSession: number;
}

/**
 * Immediate feedback reminder notification (sent at session end)
 */
export interface ImmediateFeedbackReminderPayload extends NotificationPayload {
  type: "immediate-feedback-reminder";
  session: Session;
  role: "student" | "mentor";
  otherPartyName: string;
  sessionDate: string;
  sessionTime: string;
}

/**
 * Feedback follow-up reminder notification (sent 24h after session if no feedback)
 */
export interface FeedbackFollowupReminderPayload extends NotificationPayload {
  type: "feedback-followup-reminder";
  session: Session;
  role: "student" | "mentor";
  otherPartyName: string;
  sessionDate: string;
}

/**
 * Union type for all notification payloads
 */
export type AnyNotificationPayload =
  | MeetingPrepReminderPayload
  | ImmediateFeedbackReminderPayload
  | FeedbackFollowupReminderPayload
  | SessionUpdateNotificationPayload;

/**
 * Result of sending a notification
 */
export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

/**
 * Summary of notification batch results
 */
export interface NotificationBatchResult {
  sent: number;
  failed: number;
  skipped: number;
  details: Array<{
    type: NotificationType;
    recipient: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Session with student participants expanded
 */
export interface SessionWithParticipants extends Session {
  students?: Contact[];
  mentorContact?: Contact;
}

/**
 * Scheduled email tracking - maps email key to Resend email ID
 * @deprecated Use Redis job store for email tracking (QStash migration)
 * Kept for backward compatibility with legacy scheduledEmailIds in Airtable
 */
export interface ScheduledEmailIds {
  [key: string]: string; // e.g., "prep48h_email@example.com": "resend-email-id"
}

/**
 * Parse scheduled email IDs from a session's JSON field
 * @deprecated Use job store functions for QStash-scheduled emails
 */
export function parseScheduledEmailIds(jsonString: string | null | undefined): ScheduledEmailIds {
  if (!jsonString) return {};
  try {
    return JSON.parse(jsonString);
  } catch {
    return {};
  }
}

/**
 * Tracks changes made to a session for notification purposes
 */
export interface SessionChanges {
  scheduledStart?: { old: string; new: string };
  duration?: { old: number; new: number };
  locationId?: { old: string; new: string };
  locationName?: { old: string; new: string };
  meetingUrl?: { old: string; new: string };
}

/**
 * Session update notification payload
 */
export interface SessionUpdateNotificationPayload extends NotificationPayload {
  type: "session-update-notification";
  session: Session;
  changes: SessionChanges;
  role: "student" | "mentor";
  teamName: string;
  mentorName: string;
  sessionDate: string;
  sessionTime: string;
}

/**
 * Participant info for recipient selection
 */
export interface SessionParticipant {
  id: string;
  name: string;
  email: string;
  role: "mentor" | "student";
}
