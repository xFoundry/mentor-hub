/**
 * Types for the email notification system
 */

import type { Session, Task, Contact } from "@/types/schema";

/**
 * Notification types supported by the system
 */
export type NotificationType =
  | "pre-meeting-reminder-48h"
  | "pre-meeting-reminder-24h"
  | "feedback-reminder"
  | "task-overdue-digest";

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
 * Pre-meeting reminder notification
 */
export interface PreMeetingReminderPayload extends NotificationPayload {
  type: "pre-meeting-reminder-48h" | "pre-meeting-reminder-24h";
  session: Session;
  mentorName: string;
  sessionDate: string;
  sessionTime: string;
  hoursUntilSession: number;
}

/**
 * Feedback reminder notification
 */
export interface FeedbackReminderPayload extends NotificationPayload {
  type: "feedback-reminder";
  session: Session;
  role: "student" | "mentor";
  otherPartyName: string;
  sessionDate: string;
}

/**
 * Task overdue digest notification
 */
export interface TaskOverdueDigestPayload extends NotificationPayload {
  type: "task-overdue-digest";
  tasks: Array<{
    id: string;
    name: string;
    dueDate: string;
    daysOverdue: number;
    priority: string;
  }>;
}

/**
 * Union type for all notification payloads
 */
export type AnyNotificationPayload =
  | PreMeetingReminderPayload
  | FeedbackReminderPayload
  | TaskOverdueDigestPayload;

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
 * Contact with their overdue tasks
 */
export interface ContactWithOverdueTasks {
  contact: Contact;
  tasks: Task[];
}
