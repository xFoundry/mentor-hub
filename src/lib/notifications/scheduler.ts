/**
 * Email Notification Service
 *
 * Handles immediate email notifications:
 * - Session update notifications to selected recipients
 *
 * Note: Scheduled emails (prep reminders, feedback reminders) are handled by
 * QStash scheduler in qstash-scheduler.ts
 */

import { render } from "@react-email/render";
import {
  getResendClient,
  getFromEmail,
  getAppUrl,
  getEffectiveRecipient,
  getSubjectPrefix,
  isTestModeEnabled,
  rateLimitedResend,
} from "../resend";
import {
  formatDateForEmail,
  formatTimeForEmail,
} from "../timezone";
import { SessionUpdateNotificationEmail } from "@/emails/session-update-notification";
import { getMentorParticipants, getLeadMentor } from "@/components/sessions/session-transformers";
import type { Session, Contact, Team } from "@/types/schema";
import type { SessionChanges, SessionParticipant } from "./types";

// ====================
// Multi-Mentor Helpers
// ====================

/**
 * Get all active mentor contacts from a session
 * Uses sessionParticipants with fallback to legacy mentor[]
 */
function getSessionMentors(session: Session): Contact[] {
  const participants = getMentorParticipants(session);
  return participants
    .map(p => p.contact)
    .filter((c): c is Contact => !!c && !!c.email);
}

/**
 * Format mentor name(s) for display in emails
 * Returns: "Alex Smith" or "Alex Smith + 2 other mentors"
 */
function formatMentorNameForEmail(session: Session): string {
  const leadMentor = getLeadMentor(session);
  const allMentors = getSessionMentors(session);

  if (!leadMentor) return "your mentor";

  const leadName = leadMentor.fullName || "your mentor";
  const otherCount = allMentors.length - 1;

  if (otherCount <= 0) return leadName;
  if (otherCount === 1) return `${leadName} + 1 other mentor`;
  return `${leadName} + ${otherCount} other mentors`;
}

/**
 * Get students from a session's team
 */
function getStudentsFromSession(session: Session): Contact[] {
  const team = session.team?.[0];
  if (!team) return [];

  // Team members are stored in the team.members array
  const members = (team as Team & { members?: Array<{ contact?: Contact[] }> }).members || [];
  return members
    .map((m) => m.contact?.[0])
    .filter((c): c is Contact => !!c && !!c.email);
}

/**
 * Get all participants (mentors + students) from a session
 * Used for recipient selection in the UI
 * Returns ALL active mentors, not just the lead
 */
export function getSessionParticipants(session: Session): SessionParticipant[] {
  const participants: SessionParticipant[] = [];

  // Add all active mentors (using multi-mentor helper)
  const mentors = getSessionMentors(session);
  const leadMentor = getLeadMentor(session);

  for (const mentor of mentors) {
    if (mentor.id && mentor.email) {
      const isLead = mentor.id === leadMentor?.id;
      participants.push({
        id: mentor.id,
        name: isLead ? `${mentor.fullName || mentor.email} (Lead)` : mentor.fullName || mentor.email,
        email: mentor.email,
        role: "mentor",
      });
    }
  }

  // Add students from team
  const students = getStudentsFromSession(session);
  for (const student of students) {
    if (student.id && student.email) {
      participants.push({
        id: student.id,
        name: student.fullName || student.email,
        email: student.email,
        role: "student",
      });
    }
  }

  return participants;
}

/**
 * Check if a student has submitted pre-meeting prep for a session
 */
function hasStudentSubmittedPrep(session: Session, contactId: string): boolean {
  const submissions = session.preMeetingSubmissions || [];
  return submissions.some((s) => s.respondant?.[0]?.id === contactId);
}

/**
 * Send session update notification emails to selected recipients
 * Note: For students who haven't submitted pre-meeting prep, the meetingUrl change is hidden
 */
export async function sendSessionUpdateNotifications(
  session: Session,
  changes: SessionChanges,
  recipientContactIds: string[]
): Promise<{ sent: number; failed: number }> {
  const resend = getResendClient();
  let sent = 0;
  let failed = 0;

  if (!resend || !session.scheduledStart) {
    console.log("[Scheduler] Email disabled or no scheduled start - skipping update notifications");
    return { sent, failed };
  }

  const appUrl = getAppUrl();
  const fromEmail = getFromEmail();

  // Use multi-mentor helpers
  const mentorName = formatMentorNameForEmail(session);
  const team = session.team?.[0];
  const teamName = team?.teamName || "the team";

  const sessionDate = formatDateForEmail(session.scheduledStart);
  const sessionTime = formatTimeForEmail(session.scheduledStart);

  // Get all potential recipients (includes ALL mentors)
  const allParticipants = getSessionParticipants(session);

  // Filter to only the selected recipients
  const selectedParticipants = allParticipants.filter((p) =>
    recipientContactIds.includes(p.id)
  );

  console.log(`[Scheduler] Sending update notifications to ${selectedParticipants.length} of ${allParticipants.length} participants`);

  for (const participant of selectedParticipants) {
    try {
      // For students who haven't submitted pre-meeting prep, filter out meetingUrl changes
      let participantChanges = changes;
      if (participant.role === "student" && changes.meetingUrl) {
        const hasSubmitted = hasStudentSubmittedPrep(session, participant.id);
        if (!hasSubmitted) {
          // Create a copy of changes without meetingUrl
          const { meetingUrl, ...filteredChanges } = changes;
          participantChanges = filteredChanges;
          console.log(`[Scheduler] Hiding meetingUrl change from ${participant.email} (no pre-meeting submission)`);
        }
      }

      // Skip sending if no changes left after filtering
      const changeCount = Object.keys(participantChanges).filter(
        (key) => !key.endsWith("Name") // Don't count locationName as separate change
      ).length;

      if (changeCount === 0) {
        console.log(`[Scheduler] Skipping ${participant.email} - no visible changes after filtering`);
        continue;
      }

      const html = await render(
        SessionUpdateNotificationEmail({
          recipientName: participant.name,
          recipientRole: participant.role,
          sessionType: session.sessionType || "Session",
          teamName,
          mentorName,
          sessionDate,
          sessionTime,
          changes: participantChanges,
          sessionUrl: `${appUrl}/sessions/${session.id}`,
        })
      );

      const effectiveRecipient = getEffectiveRecipient(participant.email);
      const subjectPrefix = getSubjectPrefix();
      const testIndicator = isTestModeEnabled() ? ` (to: ${participant.email})` : "";

      const result = await rateLimitedResend(() =>
        resend.emails.send({
          from: fromEmail,
          to: effectiveRecipient,
          subject: `${subjectPrefix}Your ${session.sessionType || "session"} has been updated${testIndicator}`,
          html,
        })
      );

      if (result.data?.id) {
        sent++;
        console.log(`[Scheduler] Sent update notification to ${participant.email}`);
      } else if (result.error) {
        failed++;
        console.error(`[Scheduler] Failed to send update notification to ${participant.email}:`, result.error);
      }
    } catch (error) {
      failed++;
      console.error(`[Scheduler] Error sending update notification to ${participant.email}:`, error);
    }
  }

  console.log(`[Scheduler] Update notifications complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
