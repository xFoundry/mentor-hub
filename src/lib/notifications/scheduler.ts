/**
 * Email Scheduler Service
 *
 * Handles scheduling emails via Resend's scheduledAt API:
 * - Schedule emails when sessions are created
 * - Reschedule emails when session times change
 * - Cancel emails when sessions are cancelled/deleted
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
  calculateScheduleTimes,
  formatDateForEmail,
  formatTimeForEmail,
  hoursUntil,
  isValidScheduleTime,
} from "../timezone";
import { MeetingPrepReminderEmail } from "@/emails/meeting-prep-reminder";
import { ImmediateFeedbackReminderEmail } from "@/emails/immediate-feedback-reminder";
import { SessionUpdateNotificationEmail } from "@/emails/session-update-notification";
import type { Session, Contact, Team } from "@/types/schema";
import type { ScheduledEmailIds, SessionChanges, SessionParticipant } from "./types";

// Note: MAX_SCHEDULE_DAYS (30) is now defined in ../timezone as the default for isValidScheduleTime

/**
 * Calculate email schedule times based on session start and duration
 * Re-exported from timezone utility for backward compatibility
 */
export function calculateEmailTimes(scheduledStart: string, durationMinutes: number) {
  const times = calculateScheduleTimes(scheduledStart, durationMinutes);
  return {
    prep48h: times.prep48h,
    prep24h: times.prep24h,
    feedbackImmediate: times.feedbackImmediate,
  };
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

// Note: isValidScheduleTime is imported from ../timezone

/**
 * Schedule all emails for a new session
 * Returns a map of email keys to Resend email IDs
 */
export async function scheduleSessionEmails(
  session: Session
): Promise<ScheduledEmailIds> {
  const resend = getResendClient();
  const scheduledEmailIds: ScheduledEmailIds = {};

  if (!resend || !session.scheduledStart) {
    console.log("[Scheduler] Email disabled or no scheduled start - skipping scheduling");
    return scheduledEmailIds;
  }

  const appUrl = getAppUrl();
  const fromEmail = getFromEmail();
  const times = calculateEmailTimes(session.scheduledStart, session.duration || 60);
  const mentor = session.mentor?.[0];
  const mentorName = mentor?.fullName || "your mentor";
  const team = session.team?.[0];
  const teamName = team?.teamName || "the team";
  const students = getStudentsFromSession(session);

  // Debug logging
  const teamMembers = (team as any)?.members || [];
  console.log(`[Scheduler] Session ${session.id}: Found ${teamMembers.length} team members, ${students.length} with valid emails`);
  console.log(`[Scheduler] Mentor: ${mentor?.email || "none"}`);
  console.log(`[Scheduler] Times - prep48h: ${times.prep48h.toISOString()} (valid: ${isValidScheduleTime(times.prep48h)})`);
  console.log(`[Scheduler] Times - prep24h: ${times.prep24h.toISOString()} (valid: ${isValidScheduleTime(times.prep24h)})`);
  console.log(`[Scheduler] Times - feedbackImmediate: ${times.feedbackImmediate.toISOString()} (valid: ${isValidScheduleTime(times.feedbackImmediate)})`);

  const sessionDate = formatDateForEmail(session.scheduledStart);
  const sessionTime = formatTimeForEmail(session.scheduledStart);

  // Schedule prep reminders for students (48h and 24h before)
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    if (!student.email) {
      console.log(`[Scheduler] Skipping student ${i + 1}/${students.length}: no email`);
      continue;
    }

    console.log(`[Scheduler] Processing student ${i + 1}/${students.length}: ${student.email}`);

    // 48h prep reminder
    if (isValidScheduleTime(times.prep48h)) {
      try {
        console.log(`[Scheduler] Rendering prep48h email for ${student.email}...`);
        const html = await render(
          MeetingPrepReminderEmail({
            recipientName: student.fullName || "there",
            sessionType: session.sessionType || "Session",
            mentorName,
            sessionDate,
            sessionTime,
            hoursUntilSession: 48,
            sessionUrl: `${appUrl}/sessions/${session.id}?tab=preparation`,
          })
        );

        const effectiveRecipient = getEffectiveRecipient(student.email);
        const subjectPrefix = getSubjectPrefix();
        const testIndicator = isTestModeEnabled() ? ` (to: ${student.email})` : "";

        console.log(`[Scheduler] Sending prep48h to Resend for ${student.email}...`);
        const result = await rateLimitedResend(() =>
          resend.emails.send({
            from: fromEmail,
            to: effectiveRecipient,
            subject: `${subjectPrefix}Submit meeting prep to unlock Zoom link - session in 2 days${testIndicator}`,
            html,
            scheduledAt: times.prep48h.toISOString(),
          })
        );

        if (result.data?.id) {
          scheduledEmailIds[`prep48h_${student.email}`] = result.data.id;
          console.log(`[Scheduler] Scheduled prep48h for ${student.email}: ${result.data.id}`);
        } else if (result.error) {
          console.error(`[Scheduler] Resend error for prep48h ${student.email}:`, result.error);
        }
      } catch (error) {
        console.error(`[Scheduler] Failed to schedule prep48h for ${student.email}:`, error);
      }
    }

    // 24h prep reminder
    if (isValidScheduleTime(times.prep24h)) {
      try {
        console.log(`[Scheduler] Rendering prep24h email for ${student.email}...`);
        const html = await render(
          MeetingPrepReminderEmail({
            recipientName: student.fullName || "there",
            sessionType: session.sessionType || "Session",
            mentorName,
            sessionDate,
            sessionTime,
            hoursUntilSession: 24,
            sessionUrl: `${appUrl}/sessions/${session.id}?tab=preparation`,
          })
        );

        const effectiveRecipient = getEffectiveRecipient(student.email);
        const subjectPrefix = getSubjectPrefix();
        const testIndicator = isTestModeEnabled() ? ` (to: ${student.email})` : "";

        console.log(`[Scheduler] Sending prep24h to Resend for ${student.email}...`);
        const result = await rateLimitedResend(() =>
          resend.emails.send({
            from: fromEmail,
            to: effectiveRecipient,
            subject: `${subjectPrefix}Submit meeting prep to unlock Zoom link - session tomorrow${testIndicator}`,
            html,
            scheduledAt: times.prep24h.toISOString(),
          })
        );

        if (result.data?.id) {
          scheduledEmailIds[`prep24h_${student.email}`] = result.data.id;
          console.log(`[Scheduler] Scheduled prep24h for ${student.email}: ${result.data.id}`);
        } else if (result.error) {
          console.error(`[Scheduler] Resend error for prep24h ${student.email}:`, result.error);
        }
      } catch (error) {
        console.error(`[Scheduler] Failed to schedule prep24h for ${student.email}:`, error);
      }
    }
  }

  // Schedule immediate feedback for all participants (at session end)
  const allParticipants: Array<{ contact: Contact; role: "student" | "mentor"; otherPartyName: string }> = [
    ...students.map((s) => ({ contact: s, role: "student" as const, otherPartyName: mentorName })),
    ...(mentor ? [{ contact: mentor, role: "mentor" as const, otherPartyName: teamName }] : []),
  ];

  console.log(`[Scheduler] Scheduling feedback emails for ${allParticipants.length} participants (${students.length} students + ${mentor ? 1 : 0} mentor)`);

  for (let i = 0; i < allParticipants.length; i++) {
    const { contact, role, otherPartyName } = allParticipants[i];
    if (!contact.email) {
      console.log(`[Scheduler] Skipping feedback ${i + 1}/${allParticipants.length}: no email`);
      continue;
    }

    console.log(`[Scheduler] Processing feedback ${i + 1}/${allParticipants.length}: ${contact.email} (${role})`);

    if (isValidScheduleTime(times.feedbackImmediate)) {
      try {
        console.log(`[Scheduler] Rendering feedbackImmediate email for ${contact.email}...`);
        const html = await render(
          ImmediateFeedbackReminderEmail({
            recipientName: contact.fullName || "there",
            role,
            sessionType: session.sessionType || "Session",
            otherPartyName,
            sessionDate,
            sessionTime, // Show session START time in body (email sends at end time via scheduledAt)
            sessionUrl: `${appUrl}/sessions/${session.id}?tab=feedback`,
          })
        );

        const effectiveRecipient = getEffectiveRecipient(contact.email);
        const subjectPrefix = getSubjectPrefix();
        const testIndicator = isTestModeEnabled() ? ` (to: ${contact.email})` : "";

        const baseSubject = role === "student"
          ? `How was your session with ${otherPartyName}?`
          : `Quick feedback on your session with ${otherPartyName}`;

        console.log(`[Scheduler] Sending feedbackImmediate to Resend for ${contact.email}...`);
        const result = await rateLimitedResend(() =>
          resend.emails.send({
            from: fromEmail,
            to: effectiveRecipient,
            subject: `${subjectPrefix}${baseSubject}${testIndicator}`,
            html,
            scheduledAt: times.feedbackImmediate.toISOString(),
          })
        );

        if (result.data?.id) {
          scheduledEmailIds[`feedbackImmediate_${contact.email}`] = result.data.id;
          console.log(`[Scheduler] Scheduled feedbackImmediate for ${contact.email}: ${result.data.id}`);
        } else if (result.error) {
          console.error(`[Scheduler] Resend error for feedbackImmediate ${contact.email}:`, result.error);
        }
      } catch (error) {
        console.error(`[Scheduler] Failed to schedule feedbackImmediate for ${contact.email}:`, error);
      }
    } else {
      console.log(`[Scheduler] Skipping feedbackImmediate for ${contact.email}: invalid schedule time`);
    }
  }

  console.log(`[Scheduler] Scheduled ${Object.keys(scheduledEmailIds).length} emails for session ${session.id}`);
  return scheduledEmailIds;
}

/**
 * Reschedule emails when session time changes
 */
export async function rescheduleSessionEmails(
  _sessionId: string,
  currentEmailIds: ScheduledEmailIds,
  newScheduledStart: string,
  newDuration: number
): Promise<ScheduledEmailIds> {
  const resend = getResendClient();

  if (!resend) {
    console.log("[Scheduler] Email disabled - skipping reschedule");
    return currentEmailIds;
  }

  const times = calculateEmailTimes(newScheduledStart, newDuration);
  const updatedEmailIds: ScheduledEmailIds = { ...currentEmailIds };

  for (const [key, emailId] of Object.entries(currentEmailIds)) {
    try {
      // Determine new scheduled time based on email type
      let newScheduledAt: Date;
      if (key.startsWith("prep48h_")) {
        newScheduledAt = times.prep48h;
      } else if (key.startsWith("prep24h_")) {
        newScheduledAt = times.prep24h;
      } else if (key.startsWith("feedbackImmediate_")) {
        newScheduledAt = times.feedbackImmediate;
      } else {
        continue;
      }

      // If new time is invalid (in past or >30 days out), cancel instead
      if (!isValidScheduleTime(newScheduledAt)) {
        await rateLimitedResend(() => resend.emails.cancel(emailId));
        delete updatedEmailIds[key];
        console.log(`[Scheduler] Cancelled ${key} (${emailId}) - new time invalid`);
        continue;
      }

      // Update the scheduled time
      await rateLimitedResend(() =>
        resend.emails.update({
          id: emailId,
          scheduledAt: newScheduledAt.toISOString(),
        })
      );
      console.log(`[Scheduler] Rescheduled ${key} (${emailId}) to ${newScheduledAt.toISOString()}`);
    } catch (error) {
      console.error(`[Scheduler] Failed to reschedule ${key} (${emailId}):`, error);
      // If update fails, the email might already be sent or cancelled - remove from tracking
      delete updatedEmailIds[key];
    }
  }

  return updatedEmailIds;
}

/**
 * Cancel all scheduled emails for a session
 */
export async function cancelSessionEmails(
  currentEmailIds: ScheduledEmailIds
): Promise<void> {
  const resend = getResendClient();

  if (!resend) {
    console.log("[Scheduler] Email disabled - skipping cancellation");
    return;
  }

  for (const [key, emailId] of Object.entries(currentEmailIds)) {
    try {
      await rateLimitedResend(() => resend.emails.cancel(emailId));
      console.log(`[Scheduler] Cancelled ${key} (${emailId})`);
    } catch (error) {
      // Email might already be sent or cancelled - that's OK
      console.warn(`[Scheduler] Could not cancel ${key} (${emailId}):`, error);
    }
  }
}

/**
 * Parse scheduled email IDs from a session's JSON field
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
 * Stringify scheduled email IDs for storage in session
 */
export function stringifyScheduledEmailIds(emailIds: ScheduledEmailIds): string {
  return JSON.stringify(emailIds);
}

/**
 * Get all participants (mentor + students) from a session
 * Used for recipient selection in the UI
 */
export function getSessionParticipants(session: Session): SessionParticipant[] {
  const participants: SessionParticipant[] = [];

  // Add mentor
  const mentor = session.mentor?.[0];
  if (mentor && mentor.id && mentor.email) {
    participants.push({
      id: mentor.id,
      name: mentor.fullName || mentor.email,
      email: mentor.email,
      role: "mentor",
    });
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
 * Send session update notification emails to selected recipients
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
  const mentor = session.mentor?.[0];
  const mentorName = mentor?.fullName || "your mentor";
  const team = session.team?.[0];
  const teamName = team?.teamName || "the team";

  const sessionDate = formatDateForEmail(session.scheduledStart);
  const sessionTime = formatTimeForEmail(session.scheduledStart);

  // Get all potential recipients
  const allParticipants = getSessionParticipants(session);

  // Filter to only the selected recipients
  const selectedParticipants = allParticipants.filter((p) =>
    recipientContactIds.includes(p.id)
  );

  console.log(`[Scheduler] Sending update notifications to ${selectedParticipants.length} of ${allParticipants.length} participants`);

  for (const participant of selectedParticipants) {
    try {
      const html = await render(
        SessionUpdateNotificationEmail({
          recipientName: participant.name,
          recipientRole: participant.role,
          sessionType: session.sessionType || "Session",
          teamName,
          mentorName,
          sessionDate,
          sessionTime,
          changes,
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

/**
 * Handle prep reminder rescheduling with proximity-based cancellation
 * - Within 24 hours: Cancel BOTH 24h and 48h prep reminders
 * - More than 24 hours out: Cancel 48h prep reminder, UPDATE 24h prep reminder
 * - Always reschedule feedback reminder
 */
/**
 * Handle rescheduling of session emails when time/duration changes.
 *
 * This cancels existing emails and schedules new ones with updated content.
 * Resend's emails.update() only supports changing scheduledAt, not content,
 * so we must cancel and recreate to update the email body with new times.
 *
 * Proximity logic:
 * - Within 24 hours: Cancel both prep reminders (48h and 24h)
 * - More than 24 hours: Cancel 48h, reschedule 24h
 * - Always reschedule feedback reminder
 */
export async function handlePrepReminderRescheduling(
  session: Session,
  currentEmailIds: ScheduledEmailIds
): Promise<ScheduledEmailIds> {
  const resend = getResendClient();

  if (!resend) {
    console.log("[Scheduler] Email disabled - skipping reschedule");
    return currentEmailIds;
  }

  // Calculate hours until session using proper UTC parsing
  const hoursUntilSession = hoursUntil(session.scheduledStart || "");

  console.log(`[Scheduler] Session is ${hoursUntilSession.toFixed(1)} hours away - cancelling old emails`);

  // First, cancel all existing emails
  for (const [key, emailId] of Object.entries(currentEmailIds)) {
    try {
      await rateLimitedResend(() => resend.emails.cancel(emailId));
      console.log(`[Scheduler] Cancelled ${key}: ${emailId}`);
    } catch (error) {
      // Email might already be sent or cancelled - that's OK
      console.warn(`[Scheduler] Could not cancel ${key} (${emailId}):`, error);
    }
  }

  // Now schedule new emails with updated content
  // The scheduleSessionEmails function will apply proximity logic internally
  // by checking isValidScheduleTime for each email type
  console.log(`[Scheduler] Scheduling new emails with updated content`);

  // We need to handle proximity logic here since scheduleSessionEmails doesn't know
  // this is a reschedule. We'll schedule selectively based on time until session.
  const newEmailIds: ScheduledEmailIds = {};
  const times = calculateEmailTimes(session.scheduledStart || "", session.duration || 60);

  // Get session data for email rendering
  const mentor = session.mentor?.[0];
  const team = session.team?.[0];

  // Debug: Log session structure
  console.log(`[Scheduler] Session team exists: ${!!team}, mentor exists: ${!!mentor}`);
  console.log(`[Scheduler] Team members count: ${team?.members?.length || 0}`);
  console.log(`[Scheduler] Session has pre-populated students: ${!!(session as any).students?.length}`);

  // Use pre-populated students if available (from getSessionDetail transform), otherwise extract
  const students = (session as any).students?.length > 0
    ? (session as any).students as Contact[]
    : getStudentsFromSession(session);

  console.log(`[Scheduler] Final students count: ${students.length}`);

  const teamName = team?.teamName || "your team";
  const mentorName = mentor?.fullName || "your mentor";
  const sessionDate = formatDateForEmail(session.scheduledStart || "");
  const sessionTime = formatTimeForEmail(session.scheduledStart || "");
  const fromEmail = getFromEmail();

  // Only schedule prep reminders if more than 24 hours out
  if (hoursUntilSession > 24) {
    // Schedule 24h prep reminder for students (skip 48h since we're rescheduling)
    for (const student of students) {
      if (!student.email) continue;

      if (isValidScheduleTime(times.prep24h)) {
        try {
          const html = await render(
            MeetingPrepReminderEmail({
              recipientName: student.fullName || "Student",
              mentorName,
              sessionType: session.sessionType || "Mentorship Session",
              sessionDate,
              sessionTime,
              sessionUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://mentorhub.xfoundry.org"}/sessions/${session.id}`,
              hoursUntilSession: 24,
            })
          );

          const effectiveRecipient = getEffectiveRecipient(student.email);
          const subjectPrefix = getSubjectPrefix();
          const testIndicator = isTestModeEnabled() ? ` (to: ${student.email})` : "";

          const result = await rateLimitedResend(() =>
            resend.emails.send({
              from: fromEmail,
              to: effectiveRecipient,
              subject: `${subjectPrefix}Submit meeting prep to unlock Zoom link - session tomorrow${testIndicator}`,
              html,
              scheduledAt: times.prep24h.toISOString(),
            })
          );

          if (result.data?.id) {
            newEmailIds[`prep24h_${student.email}`] = result.data.id;
            console.log(`[Scheduler] Scheduled new prep24h for ${student.email}: ${result.data.id}`);
          }
        } catch (error) {
          console.error(`[Scheduler] Failed to schedule prep24h for ${student.email}:`, error);
        }
      }
    }
  } else {
    console.log(`[Scheduler] Skipping prep reminders - session within 24 hours`);
  }

  // Always schedule feedback reminder at session end
  const allParticipants: Array<{ contact: Contact; role: "student" | "mentor"; otherPartyName: string }> = [
    ...students.map((s) => ({ contact: s, role: "student" as const, otherPartyName: mentorName })),
    ...(mentor ? [{ contact: mentor, role: "mentor" as const, otherPartyName: teamName }] : []),
  ];

  console.log(`[Scheduler] Participants for feedback: ${allParticipants.length} (${students.length} students + ${mentor ? 1 : 0} mentor)`);
  console.log(`[Scheduler] Feedback time valid: ${isValidScheduleTime(times.feedbackImmediate)}, scheduled for: ${times.feedbackImmediate.toISOString()}`);

  for (const { contact, role, otherPartyName } of allParticipants) {
    if (!contact.email) {
      console.log(`[Scheduler] Skipping participant with no email`);
      continue;
    }

    console.log(`[Scheduler] Processing feedback for ${contact.email}...`);

    if (isValidScheduleTime(times.feedbackImmediate)) {
      try {
        console.log(`[Scheduler] Rendering email for ${contact.email}...`);
        const html = await render(
          ImmediateFeedbackReminderEmail({
            recipientName: contact.fullName || (role === "mentor" ? "Mentor" : "Student"),
            role,
            otherPartyName,
            sessionType: session.sessionType || "Mentorship Session",
            sessionDate,
            sessionTime, // Show session START time in body (email sends at end time via scheduledAt)
            sessionUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://mentorhub.xfoundry.org"}/feedback?sessionId=${session.id}`,
          })
        );

        const effectiveRecipient = getEffectiveRecipient(contact.email);
        const subjectPrefix = getSubjectPrefix();
        const testIndicator = isTestModeEnabled() ? ` (to: ${contact.email})` : "";

        console.log(`[Scheduler] Sending to Resend for ${contact.email} (effective: ${effectiveRecipient})...`);
        const result = await rateLimitedResend(() =>
          resend.emails.send({
            from: fromEmail,
            to: effectiveRecipient,
            subject: `${subjectPrefix}Quick feedback request - ${session.sessionType || "session"} just ended${testIndicator}`,
            html,
            scheduledAt: times.feedbackImmediate.toISOString(),
          })
        );

        console.log(`[Scheduler] Resend result for ${contact.email}:`, JSON.stringify(result));

        if (result.data?.id) {
          newEmailIds[`feedbackImmediate_${contact.email}`] = result.data.id;
          console.log(`[Scheduler] Scheduled new feedback for ${contact.email}: ${result.data.id}`);
        } else if (result.error) {
          console.error(`[Scheduler] Resend error for ${contact.email}:`, result.error);
        }
      } catch (error) {
        console.error(`[Scheduler] Failed to schedule feedback for ${contact.email}:`, error);
      }
    } else {
      console.log(`[Scheduler] Skipping ${contact.email} - invalid schedule time`);
    }
  }

  console.log(`[Scheduler] Rescheduling complete: ${Object.keys(newEmailIds).length} new emails scheduled`);
  return newEmailIds;
}
