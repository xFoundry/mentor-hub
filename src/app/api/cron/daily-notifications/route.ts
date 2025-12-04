import { NextRequest, NextResponse } from "next/server";
import { format, addHours, isAfter, isBefore, differenceInDays } from "date-fns";
import { executeQuery } from "@/lib/baseql";
import {
  sendNotificationBatch,
  areNotificationsEnabled,
  type PreMeetingReminderPayload,
  type FeedbackReminderPayload,
  type TaskOverdueDigestPayload,
  type AnyNotificationPayload,
} from "@/lib/notifications";
import {
  hasMentorFeedback,
  hasMenteeFeedback,
  isSessionEligibleForFeedback,
  parseAsLocalTime,
} from "@/components/sessions/session-transformers";
import type { Session, Task, Contact } from "@/types/schema";

/**
 * Daily Notifications Cron Job
 *
 * This endpoint is called by Vercel cron at 1 PM UTC daily.
 * It sends:
 * - Pre-meeting reminders (48h and 24h before sessions)
 * - Feedback reminders (24h after completed sessions)
 * - Overdue task digests (daily)
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if notifications are enabled
  if (!areNotificationsEnabled()) {
    return NextResponse.json({
      message: "Notifications disabled - RESEND_API_KEY not configured",
      sent: 0,
    });
  }

  const now = new Date();
  const notifications: AnyNotificationPayload[] = [];

  try {
    // Fetch upcoming sessions (next 48 hours) for pre-meeting reminders
    const upcomingSessions = await fetchUpcomingSessions();
    const preMeetingNotifications = generatePreMeetingNotifications(
      upcomingSessions,
      now
    );
    notifications.push(...preMeetingNotifications);

    // Fetch completed sessions (last 48 hours) for feedback reminders
    const completedSessions = await fetchRecentlyCompletedSessions();
    const feedbackNotifications = generateFeedbackNotifications(
      completedSessions,
      now
    );
    notifications.push(...feedbackNotifications);

    // Fetch overdue tasks for digest
    const overdueTasks = await fetchOverdueTasks();
    const taskNotifications = generateTaskOverdueNotifications(overdueTasks, now);
    notifications.push(...taskNotifications);

    // Send all notifications
    const result = await sendNotificationBatch(notifications);

    return NextResponse.json({
      message: "Daily notifications processed",
      timestamp: now.toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[Cron] Error processing notifications:", error);
    return NextResponse.json(
      {
        error: "Failed to process notifications",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Fetch upcoming sessions in the next 48 hours
 */
async function fetchUpcomingSessions(): Promise<Session[]> {
  const query = `
    query UpcomingSessions {
      mentorshipSessions(
        filter: {
          status: { eq: "Scheduled" }
        }
        first: 100
      ) {
        id
        sessionType
        scheduledStart
        duration
        status
        meetingPlatform
        meetingUrl
        preMeetingSubmissions {
          id
          contact {
            id
          }
        }
        mentor {
          id
          fullName
          email
        }
        team {
          id
          teamName
          members {
            id
            contact {
              id
              fullName
              email
            }
          }
        }
      }
    }
  `;

  try {
    const result = await executeQuery(query);
    return result.data?.mentorshipSessions || [];
  } catch (error) {
    console.error("[Cron] Error fetching upcoming sessions:", error);
    return [];
  }
}

/**
 * Fetch sessions completed in the last 48 hours
 */
async function fetchRecentlyCompletedSessions(): Promise<Session[]> {
  const query = `
    query CompletedSessions {
      mentorshipSessions(
        filter: {
          status: { eq: "Completed" }
        }
        first: 100
        orderBy: { field: "scheduledStart", direction: DESC }
      ) {
        id
        sessionType
        scheduledStart
        duration
        status
        sessionFeedback {
          id
          role
          respondant {
            id
          }
        }
        mentor {
          id
          fullName
          email
        }
        team {
          id
          teamName
          members {
            id
            contact {
              id
              fullName
              email
            }
          }
        }
      }
    }
  `;

  try {
    const result = await executeQuery(query);
    return result.data?.mentorshipSessions || [];
  } catch (error) {
    console.error("[Cron] Error fetching completed sessions:", error);
    return [];
  }
}

/**
 * Fetch all overdue tasks grouped by assignee
 */
async function fetchOverdueTasks(): Promise<
  Map<string, { contact: Contact; tasks: Task[] }>
> {
  const query = `
    query OverdueTasks {
      actionItems(
        filter: {
          status: { in: ["Not Started", "In Progress"] }
        }
        first: 500
      ) {
        id
        name
        description
        dueDate
        priority
        status
        assignedTo {
          id
          fullName
          email
        }
      }
    }
  `;

  try {
    const result = await executeQuery(query);
    const tasks: Task[] = result.data?.actionItems || [];

    // Group by assignee
    const grouped = new Map<string, { contact: Contact; tasks: Task[] }>();
    const now = new Date();

    for (const task of tasks) {
      if (!task.dueDate || !task.assignedTo?.length) continue;

      const dueDate = new Date(task.dueDate);
      if (dueDate >= now) continue; // Not overdue

      for (const assignee of task.assignedTo) {
        if (!assignee.email) continue;

        const existing = grouped.get(assignee.id);
        if (existing) {
          existing.tasks.push(task);
        } else {
          grouped.set(assignee.id, {
            contact: assignee,
            tasks: [task],
          });
        }
      }
    }

    return grouped;
  } catch (error) {
    console.error("[Cron] Error fetching overdue tasks:", error);
    return new Map();
  }
}

// ============================================================================
// Notification Generation Functions
// ============================================================================

/**
 * Generate pre-meeting reminder notifications for students
 */
function generatePreMeetingNotifications(
  sessions: Session[],
  now: Date
): PreMeetingReminderPayload[] {
  const notifications: PreMeetingReminderPayload[] = [];

  for (const session of sessions) {
    if (!session.scheduledStart) continue;

    const startTime = parseAsLocalTime(session.scheduledStart);
    const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Skip if not within notification windows (24h or 48h)
    if (hoursUntil < 0 || hoursUntil > 48) continue;

    const notificationType =
      hoursUntil <= 24 ? "pre-meeting-reminder-24h" : "pre-meeting-reminder-48h";

    // Only notify at the right time (avoid duplicates)
    // 24h window: 20-28 hours before
    // 48h window: 44-52 hours before
    const is24hWindow = hoursUntil >= 20 && hoursUntil <= 28;
    const is48hWindow = hoursUntil >= 44 && hoursUntil <= 52;

    if (!is24hWindow && !is48hWindow) continue;

    const mentor = session.mentor?.[0];
    const team = session.team?.[0];
    const students = team?.members?.filter(
      (m: any) => m.contact?.[0]?.id !== mentor?.id
    );

    if (!students?.length || !mentor) continue;

    // Team-based submission: skip if team has already submitted
    const submissions = session.preMeetingSubmissions || [];
    if (submissions.length > 0) continue;

    // No team submission yet - notify all team members
    for (const member of students) {
      const contact = member.contact?.[0];
      if (!contact?.email) continue;

      notifications.push({
        type: is24hWindow ? "pre-meeting-reminder-24h" : "pre-meeting-reminder-48h",
        recipientEmail: contact.email,
        recipientName: contact.fullName || contact.email,
        contactId: contact.id,
        session,
        mentorName: mentor.fullName || "your mentor",
        sessionDate: format(startTime, "EEEE, MMMM d, yyyy"),
        sessionTime: format(startTime, "h:mm a"),
        hoursUntilSession: Math.round(hoursUntil),
      });
    }
  }

  return notifications;
}

/**
 * Generate feedback reminder notifications
 */
function generateFeedbackNotifications(
  sessions: Session[],
  now: Date
): FeedbackReminderPayload[] {
  const notifications: FeedbackReminderPayload[] = [];

  for (const session of sessions) {
    if (!isSessionEligibleForFeedback(session)) continue;
    if (!session.scheduledStart) continue;

    const startTime = parseAsLocalTime(session.scheduledStart);
    const endTime = addHours(startTime, (session.duration || 60) / 60);
    const hoursSinceEnd = (now.getTime() - endTime.getTime()) / (1000 * 60 * 60);

    // Only send 20-28 hours after session (24h window)
    if (hoursSinceEnd < 20 || hoursSinceEnd > 28) continue;

    const mentor = session.mentor?.[0];
    const team = session.team?.[0];

    if (!mentor || !team) continue;

    const sessionDate = format(startTime, "MMMM d");

    // Check mentor feedback
    if (!hasMentorFeedback(session) && mentor.email) {
      notifications.push({
        type: "feedback-reminder",
        recipientEmail: mentor.email,
        recipientName: mentor.fullName || mentor.email,
        contactId: mentor.id,
        session,
        role: "mentor",
        otherPartyName: team.teamName || "your team",
        sessionDate,
      });
    }

    // Check student feedback
    const students = team.members?.filter(
      (m: any) => m.contact?.[0]?.id !== mentor.id
    );

    for (const member of students || []) {
      const contact = member.contact?.[0];
      if (!contact?.email) continue;

      // Check if this student has already provided feedback
      const hasFeedback = session.sessionFeedback?.some(
        (f: any) => f.role === "Mentee" && f.respondant?.[0]?.id === contact.id
      );

      if (hasFeedback) continue;

      notifications.push({
        type: "feedback-reminder",
        recipientEmail: contact.email,
        recipientName: contact.fullName || contact.email,
        contactId: contact.id,
        session,
        role: "student",
        otherPartyName: mentor.fullName || "your mentor",
        sessionDate,
      });
    }
  }

  return notifications;
}

/**
 * Generate overdue task digest notifications
 */
function generateTaskOverdueNotifications(
  tasksByAssignee: Map<string, { contact: Contact; tasks: Task[] }>,
  now: Date
): TaskOverdueDigestPayload[] {
  const notifications: TaskOverdueDigestPayload[] = [];

  for (const [contactId, { contact, tasks }] of tasksByAssignee) {
    if (!contact.email || tasks.length === 0) continue;

    const formattedTasks = tasks.map((task) => {
      const dueDate = new Date(task.dueDate!);
      const daysOverdue = differenceInDays(now, dueDate);

      return {
        id: task.id,
        name: task.name || "Untitled Task",
        dueDate: format(dueDate, "MMM d"),
        daysOverdue,
        priority: task.priority || "Medium",
      };
    });

    // Sort by days overdue (most overdue first)
    formattedTasks.sort((a, b) => b.daysOverdue - a.daysOverdue);

    notifications.push({
      type: "task-overdue-digest",
      recipientEmail: contact.email,
      recipientName: contact.fullName || contact.email,
      contactId,
      tasks: formattedTasks,
    });
  }

  return notifications;
}
