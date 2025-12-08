import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/baseql";
import {
  sendNotificationBatch,
  areNotificationsEnabled,
  type FeedbackFollowupReminderPayload,
  type AnyNotificationPayload,
} from "@/lib/notifications";
import {
  hasMentorFeedback,
  isSessionEligibleForFeedback,
  getMentorParticipants,
  getLeadMentor,
} from "@/components/sessions/session-transformers";
import {
  getSessionEndTime,
  formatInEastern,
} from "@/lib/timezone";
import type { Session, Contact } from "@/types/schema";

/**
 * Daily Notifications Cron Job
 *
 * This endpoint is called by Vercel cron at 1 PM UTC daily.
 * It sends:
 * - Feedback follow-up reminders (24h after session) - only if no feedback submitted yet
 *
 * Note: Meeting prep reminders and immediate feedback reminders are now
 * scheduled via Resend's scheduledAt API when sessions are created.
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
    // Fetch all sessions and filter to completed ones (end time has passed)
    const allSessions = await fetchAllSessions();
    const completedSessions = allSessions.filter(session => isSessionComplete(session, now));

    // Generate feedback follow-up notifications for completed sessions
    const feedbackNotifications = generateFeedbackFollowupNotifications(
      completedSessions,
      now
    );
    notifications.push(...feedbackNotifications);

    // Send all notifications
    const result = await sendNotificationBatch(notifications);

    return NextResponse.json({
      message: "Daily notifications processed",
      timestamp: now.toISOString(),
      type: "feedback-followup",
      totalSessions: allSessions.length,
      completedSessions: completedSessions.length,
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
 * Fetch all sessions (we'll determine completion based on end time)
 */
async function fetchAllSessions(): Promise<Session[]> {
  // Note: Direct table query uses `sessions`, not `mentorshipSessions`
  // (mentorshipSessions is used for relationship fields on other tables like teams)
  const query = `
    query AllSessions {
      sessions(
        _order_by: { scheduledStart: "desc" }
      ) {
        id
        sessionType
        scheduledStart
        duration
        status
        feedback {
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
        sessionParticipants {
          id
          participantId
          participantType
          role
          status
          contact {
            id
            fullName
            email
          }
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
    const result = await executeQuery<{ sessions: any[] }>(query);
    return result.sessions || [];
  } catch (error) {
    console.error("[Cron] Error fetching sessions:", error);
    return [];
  }
}

/**
 * Check if a session is completed (end time has passed)
 * A session is complete when: now > scheduledStart + duration
 */
function isSessionComplete(session: Session, now: Date): boolean {
  if (!session.scheduledStart) return false;

  const endTime = getSessionEndTime(session.scheduledStart, session.duration || 60);
  return now > endTime;
}

// ============================================================================
// Notification Generation Functions
// ============================================================================

/**
 * Format mentor name(s) for display in emails
 * Returns: "Alex Smith" or "Alex Smith + 2 other mentors"
 */
function formatMentorNameForEmail(session: Session): string {
  const leadMentor = getLeadMentor(session);
  const allMentors = getMentorParticipants(session);

  if (!leadMentor) return "your mentor";

  const leadName = leadMentor.fullName || "your mentor";
  const otherCount = allMentors.length - 1;

  if (otherCount <= 0) return leadName;
  if (otherCount === 1) return `${leadName} + 1 other mentor`;
  return `${leadName} + ${otherCount} other mentors`;
}

/**
 * Generate 24h feedback follow-up reminder notifications
 * Only sends if the participant hasn't submitted feedback yet
 * Sends to ALL mentors (not just lead) who haven't submitted feedback
 */
function generateFeedbackFollowupNotifications(
  sessions: Session[],
  now: Date
): FeedbackFollowupReminderPayload[] {
  const notifications: FeedbackFollowupReminderPayload[] = [];

  for (const session of sessions) {
    if (!isSessionEligibleForFeedback(session)) continue;
    if (!session.scheduledStart) continue;

    const endTime = getSessionEndTime(session.scheduledStart, session.duration || 60);
    const hoursSinceEnd = (now.getTime() - endTime.getTime()) / (1000 * 60 * 60);

    // Only send 20-28 hours after session end (24h window)
    if (hoursSinceEnd < 20 || hoursSinceEnd > 28) continue;

    const team = session.team?.[0];
    if (!team) continue;

    // Get all mentors using multi-mentor helper
    const mentorParticipants = getMentorParticipants(session);
    const mentorIds = new Set(mentorParticipants.map(p => p.contact?.id).filter(Boolean));

    // Format date in Eastern time for email display
    const sessionDate = formatInEastern(new Date(session.scheduledStart), "MMMM d");

    // Check mentor feedback - send to ALL mentors who haven't submitted
    // Note: hasMentorFeedback checks if ANY mentor feedback exists, so we check per-mentor
    const feedbackList = session.feedback || session.sessionFeedback || [];
    const mentorsWithFeedback = new Set(
      feedbackList
        .filter((f: any) => f.role === "Mentor")
        .map((f: any) => f.respondant?.[0]?.id)
        .filter(Boolean)
    );

    for (const participant of mentorParticipants) {
      const mentor = participant.contact;
      if (!mentor?.email || !mentor?.id) continue;

      // Skip if this specific mentor has already submitted feedback
      if (mentorsWithFeedback.has(mentor.id)) continue;

      notifications.push({
        type: "feedback-followup-reminder",
        recipientEmail: mentor.email,
        recipientName: mentor.fullName || mentor.email,
        contactId: mentor.id,
        session,
        role: "mentor",
        otherPartyName: team.teamName || "your team",
        sessionDate,
      });
    }

    // Check student feedback - only send if NOT already submitted
    // Exclude mentors from student list
    const students = team.members?.filter(
      (m: any) => !mentorIds.has(m.contact?.[0]?.id)
    );

    // Use formatted mentor name for students (shows lead + count of others)
    const mentorNameForStudents = formatMentorNameForEmail(session);

    for (const member of students || []) {
      const contact = member.contact?.[0];
      if (!contact?.email) continue;

      // Check if this student has already provided feedback
      const hasFeedback = feedbackList.some(
        (f: any) => f.role === "Mentee" && f.respondant?.[0]?.id === contact.id
      );

      if (hasFeedback) continue;

      notifications.push({
        type: "feedback-followup-reminder",
        recipientEmail: contact.email,
        recipientName: contact.fullName || contact.email,
        contactId: contact.id,
        session,
        role: "student",
        otherPartyName: mentorNameForStudents,
        sessionDate,
      });
    }
  }

  return notifications;
}
