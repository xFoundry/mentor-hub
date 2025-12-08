import { NextRequest, NextResponse } from "next/server";
import { updateSession as updateSessionInDb, getSessionDetail, deleteSession as deleteSessionInDb } from "@/lib/baseql";
import {
  scheduleSessionEmails,
  cancelSessionEmails,
  parseScheduledEmailIds,
  stringifyScheduledEmailIds,
  sendSessionUpdateNotifications,
  handlePrepReminderRescheduling,
} from "@/lib/notifications/scheduler";
import type { SessionChanges } from "@/lib/notifications/types";

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

    // Extract notification recipients from body (separate from update fields)
    const { notificationRecipients, ...updateFields } = body;

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
    });

    const updatedSession = result.update_sessions;

    // Handle email rescheduling/cancellation
    const currentEmailIds = parseScheduledEmailIds(currentSession.scheduledEmailIds as string);
    let updatedEmailIds = currentEmailIds;

    // Track email send results for response
    let emailsSent = 0;
    let emailsFailed = 0;

    if (statusChangedToCancelled) {
      // Cancel all scheduled emails
      try {
        await cancelSessionEmails(currentEmailIds);
        updatedEmailIds = {}; // Clear all email IDs
        console.log(`[Sessions API] Cancelled emails for session ${sessionId}`);

        // Save empty email IDs to Airtable
        await updateSessionInDb(sessionId, {
          scheduledEmailIds: stringifyScheduledEmailIds(updatedEmailIds),
        });
      } catch (error) {
        console.error(`[Sessions API] Failed to cancel emails:`, error);
      }
    } else if (timeChanged && Object.keys(currentEmailIds).length > 0) {
      // Reschedule emails with proximity-based logic
      // Must fetch full session with updated data and team members for email rendering
      try {
        const fullSessionResult = await getSessionDetail(sessionId);
        const fullSession = fullSessionResult.sessions?.[0];
        if (fullSession) {
          updatedEmailIds = await handlePrepReminderRescheduling(
            fullSession,
            currentEmailIds
          );
          console.log(`[Sessions API] Rescheduled emails for session ${sessionId} (${Object.keys(updatedEmailIds).length} new emails)`);

          // Save updated email IDs to Airtable
          await updateSessionInDb(sessionId, {
            scheduledEmailIds: stringifyScheduledEmailIds(updatedEmailIds),
          });
        }
      } catch (error) {
        console.error(`[Sessions API] Failed to reschedule emails:`, error);
      }
    } else if (timeChanged && Object.keys(currentEmailIds).length === 0) {
      // No existing emails tracked - schedule new ones
      // This handles the case where session was created before email scheduling was implemented
      try {
        const fullSessionResult = await getSessionDetail(sessionId);
        const fullSession = fullSessionResult.sessions?.[0];
        if (fullSession) {
          updatedEmailIds = await scheduleSessionEmails(fullSession);
          console.log(`[Sessions API] Scheduled ${Object.keys(updatedEmailIds).length} new emails for session ${sessionId}`);

          // Save new email IDs to Airtable
          if (Object.keys(updatedEmailIds).length > 0) {
            await updateSessionInDb(sessionId, {
              scheduledEmailIds: stringifyScheduledEmailIds(updatedEmailIds),
            });
          }
        }
      } catch (error) {
        console.error(`[Sessions API] Failed to schedule emails:`, error);
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

    // Get session to get scheduled email IDs
    const sessionResult = await getSessionDetail(sessionId);
    const session = sessionResult.sessions?.[0];

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Cancel all scheduled emails
    const currentEmailIds = parseScheduledEmailIds(session.scheduledEmailIds as string);

    if (Object.keys(currentEmailIds).length > 0) {
      try {
        await cancelSessionEmails(currentEmailIds);
        console.log(`[Sessions API] Cancelled emails for session ${sessionId}`);
      } catch (error) {
        console.error(`[Sessions API] Failed to cancel emails:`, error);
      }
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
