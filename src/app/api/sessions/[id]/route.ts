import { NextRequest, NextResponse } from "next/server";
import {
  updateSession as updateSessionInDb,
  getSessionDetail,
  deleteSession as deleteSessionInDb,
  createSessionParticipant,
  updateSessionParticipant,
  deleteSessionParticipant,
} from "@/lib/baseql";
import { sendSessionUpdateNotifications } from "@/lib/notifications/scheduler";
import {
  scheduleSessionEmailsViaQStash,
  cancelSessionEmailsViaQStash,
} from "@/lib/notifications/qstash-scheduler";
import type { SessionChanges } from "@/lib/notifications/types";

interface MentorInput {
  contactId: string;
  role: "Lead Mentor" | "Supporting Mentor" | "Observer";
}

/**
 * PUT /api/sessions/[id]
 *
 * Update a session and reschedule notification emails if needed
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();

    // Extract notification recipients and mentors from body (separate from update fields)
    const { notificationRecipients, mentors, requirePrep, requireFeedback, ...updateFields } = body;
    const mentorUpdates: MentorInput[] | undefined = mentors;

    // Get current session to compare changes
    const currentSessionResult = await getSessionDetail(sessionId);
    const currentSession = currentSessionResult.sessions?.[0];

    if (!currentSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Build SessionChanges object for notification emails
    const changes: SessionChanges = {};
    if (updateFields.scheduledStart && updateFields.scheduledStart !== currentSession.scheduledStart) {
      changes.scheduledStart = {
        old: currentSession.scheduledStart || "",
        new: updateFields.scheduledStart,
      };
    }
    if (updateFields.duration && updateFields.duration !== currentSession.duration) {
      changes.duration = {
        old: currentSession.duration || 60,
        new: updateFields.duration,
      };
    }
    if (updateFields.locationId !== undefined) {
      const oldLocationId = currentSession.locations?.[0]?.id || "";
      const newLocationId = updateFields.locationId || "";
      if (oldLocationId !== newLocationId) {
        changes.locationId = { old: oldLocationId, new: newLocationId };
        changes.locationName = {
          old: currentSession.locations?.[0]?.name || "",
          new: "", // Will be resolved after update
        };
      }
    }
    if (updateFields.meetingUrl !== undefined && updateFields.meetingUrl !== (currentSession.meetingUrl || "")) {
      changes.meetingUrl = {
        old: currentSession.meetingUrl || "",
        new: updateFields.meetingUrl || "",
      };
    }

    // Check if time or duration changed (for email rescheduling)
    const timeChanged =
      (updateFields.scheduledStart && updateFields.scheduledStart !== currentSession.scheduledStart) ||
      (updateFields.duration && updateFields.duration !== currentSession.duration);

    const statusChangedToCancelled =
      updateFields.status === "Cancelled" && currentSession.status !== "Cancelled";

    // Check if prep/feedback requirements changed to false (need to cancel related emails)
    // For backwards compatibility, undefined means true
    const prepChangedToNotRequired =
      requirePrep === false && currentSession.requirePrep !== false;
    const feedbackChangedToNotRequired =
      requireFeedback === false && currentSession.requireFeedback !== false;

    // Update session in BaseQL
    const result = await updateSessionInDb(sessionId, {
      sessionType: updateFields.sessionType,
      scheduledStart: updateFields.scheduledStart,
      duration: updateFields.duration,
      status: updateFields.status,
      meetingPlatform: updateFields.meetingPlatform,
      meetingUrl: updateFields.meetingUrl,
      agenda: updateFields.agenda,
      granolaNotesUrl: updateFields.granolaNotesUrl,
      summary: updateFields.summary,
      fullTranscript: updateFields.fullTranscript,
      locationId: updateFields.locationId,
      requirePrep,
      requireFeedback,
    });

    const updatedSession = result.update_sessions;

    // Handle mentor updates (add/remove/update sessionParticipants)
    if (mentorUpdates && Array.isArray(mentorUpdates)) {
      try {
        const currentParticipants = currentSession.sessionParticipants || [];
        const currentMentorIds = new Set(
          currentParticipants.map(p => p.contact?.[0]?.id).filter(Boolean)
        );
        const newMentorIds = new Set(mentorUpdates.map(m => m.contactId));

        // Find mentors to add, remove, and update
        const mentorsToAdd = mentorUpdates.filter(m => !currentMentorIds.has(m.contactId));
        const mentorsToRemove = currentParticipants.filter(
          p => p.contact?.[0]?.id && !newMentorIds.has(p.contact[0].id)
        );
        const mentorsToUpdate = mentorUpdates.filter(m => {
          const existing = currentParticipants.find(p => p.contact?.[0]?.id === m.contactId);
          return existing && existing.role !== m.role;
        });

        // Remove mentors no longer in the list
        for (const participant of mentorsToRemove) {
          await deleteSessionParticipant(participant.id);
          console.log(`[Sessions API] Removed mentor participant ${participant.id}`);
        }

        // Add new mentors
        for (const mentor of mentorsToAdd) {
          await createSessionParticipant({
            sessionId,
            contactId: mentor.contactId,
            role: mentor.role,
            status: "Active",
          });
          console.log(`[Sessions API] Added mentor ${mentor.contactId} as ${mentor.role}`);
        }

        // Update roles for existing mentors
        for (const mentor of mentorsToUpdate) {
          const existing = currentParticipants.find(p => p.contact?.[0]?.id === mentor.contactId);
          if (existing) {
            await updateSessionParticipant(existing.id, { role: mentor.role });
            console.log(`[Sessions API] Updated mentor ${mentor.contactId} to ${mentor.role}`);
          }
        }

        // Update legacy mentor field with lead mentor for backwards compatibility
        const leadMentor = mentorUpdates.find(m => m.role === "Lead Mentor");
        if (leadMentor) {
          await updateSessionInDb(sessionId, { mentorId: leadMentor.contactId });
        }

        console.log(`[Sessions API] Synced mentors for session ${sessionId}: ` +
          `+${mentorsToAdd.length} -${mentorsToRemove.length} ~${mentorsToUpdate.length}`);
      } catch (error) {
        console.error(`[Sessions API] Failed to sync mentors:`, error);
        // Don't fail the whole update - mentor sync is supplemental
      }
    }

    // Track email send results for response
    let emailsSent = 0;
    let emailsFailed = 0;

    // Handle email rescheduling/cancellation via QStash
    if (statusChangedToCancelled) {
      // Cancel all scheduled emails via QStash
      try {
        const cancelResult = await cancelSessionEmailsViaQStash(sessionId);
        console.log(`[Sessions API] Cancelled ${cancelResult.cancelled} emails for session ${sessionId}`);
      } catch (error) {
        console.error(`[Sessions API] Failed to cancel emails:`, error);
      }
    } else if (timeChanged) {
      // Time/duration changed - cancel existing and reschedule
      // First cancel any existing scheduled emails
      try {
        const cancelResult = await cancelSessionEmailsViaQStash(sessionId);
        console.log(`[Sessions API] Cancelled ${cancelResult.cancelled} existing emails for reschedule`);
      } catch (error) {
        console.error(`[Sessions API] Failed to cancel existing emails:`, error);
      }

      // Schedule new emails with updated times
      try {
        const fullSessionResult = await getSessionDetail(sessionId);
        const fullSession = fullSessionResult.sessions?.[0];
        if (fullSession) {
          const scheduleResult = await scheduleSessionEmailsViaQStash(fullSession);
          if (scheduleResult) {
            console.log(`[Sessions API] Scheduled ${scheduleResult.jobCount} new emails for session ${sessionId}`);
          }
        }
      } catch (error) {
        console.error(`[Sessions API] Failed to schedule emails:`, error);
      }
    }

    // Handle cancelling specific email types when requirements change
    if (prepChangedToNotRequired || feedbackChangedToNotRequired) {
      try {
        // Cancel all scheduled emails for this session and reschedule (the scheduler will respect the new flags)
        const cancelResult = await cancelSessionEmailsViaQStash(sessionId);
        console.log(`[Sessions API] Cancelled ${cancelResult.cancelled} emails due to requirement change`);

        // Reschedule with the new requirement flags in effect
        const fullSessionResult = await getSessionDetail(sessionId);
        const fullSession = fullSessionResult.sessions?.[0];
        if (fullSession) {
          const scheduleResult = await scheduleSessionEmailsViaQStash(fullSession);
          if (scheduleResult) {
            console.log(`[Sessions API] Rescheduled ${scheduleResult.jobCount} emails (respecting new requirements)`);
          }
        }
      } catch (error) {
        console.error(`[Sessions API] Failed to handle requirement change emails:`, error);
      }
    }

    // Send update notification emails if recipients were provided
    if (Array.isArray(notificationRecipients) && notificationRecipients.length > 0 && Object.keys(changes).length > 0) {
      try {
        // Get fresh session with resolved location name
        const fullSessionResult = await getSessionDetail(sessionId);
        const fullSession = fullSessionResult.sessions?.[0];

        if (fullSession) {
          // Update location name in changes if it was changed
          if (changes.locationId) {
            changes.locationName = {
              old: changes.locationName?.old || "",
              new: fullSession.locations?.[0]?.name || "",
            };
          }

          const result = await sendSessionUpdateNotifications(
            fullSession,
            changes,
            notificationRecipients
          );
          emailsSent = result.sent;
          emailsFailed = result.failed;
          console.log(`[Sessions API] Sent ${emailsSent} update notifications, ${emailsFailed} failed`);
        }
      } catch (error) {
        console.error(`[Sessions API] Failed to send update notifications:`, error);
      }
    }

    return NextResponse.json({
      session: updatedSession,
      emailsSent,
      emailsFailed,
    });
  } catch (error) {
    console.error("[Sessions API] Error updating session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 *
 * Delete a session and cancel notification emails
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Get session to verify it exists
    const sessionResult = await getSessionDetail(sessionId);
    const session = sessionResult.sessions?.[0];

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Cancel all scheduled emails via QStash
    try {
      const cancelResult = await cancelSessionEmailsViaQStash(sessionId);
      console.log(`[Sessions API] Cancelled ${cancelResult.cancelled} emails for session ${sessionId}`);
    } catch (error) {
      console.error(`[Sessions API] Failed to cancel emails:`, error);
      // Continue with deletion even if email cancellation fails
    }

    // Delete session
    await deleteSessionInDb(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sessions API] Error deleting session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete session" },
      { status: 500 }
    );
  }
}
