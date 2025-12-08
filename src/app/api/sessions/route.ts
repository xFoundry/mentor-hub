import { NextRequest, NextResponse } from "next/server";
import { createSession as createSessionInDb, getSessionDetail, updateSession } from "@/lib/baseql";
import { scheduleSessionEmails, stringifyScheduledEmailIds } from "@/lib/notifications/scheduler";

/**
 * POST /api/sessions
 *
 * Create a new session and schedule notification emails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { sessionType, scheduledStart, mentorId, teamId } = body;
    if (!sessionType || !scheduledStart || !mentorId || !teamId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionType, scheduledStart, mentorId, teamId" },
        { status: 400 }
      );
    }

    // Create session in BaseQL
    const result = await createSessionInDb({
      sessionType: body.sessionType,
      scheduledStart: body.scheduledStart,
      duration: body.duration,
      mentorId: body.mentorId,
      teamId: body.teamId,
      cohortId: body.cohortId,
      meetingPlatform: body.meetingPlatform,
      meetingUrl: body.meetingUrl,
      agenda: body.agenda,
      status: body.status,
      locationId: body.locationId,
    });

    const createdSession = Array.isArray(result.insert_sessions)
      ? result.insert_sessions[0]
      : result.insert_sessions;

    if (!createdSession?.id) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Fetch full session with team members for email scheduling
    const sessionDetailResult = await getSessionDetail(createdSession.id);
    const fullSession = sessionDetailResult.sessions?.[0];

    if (!fullSession) {
      console.warn(`[Sessions API] Could not fetch session detail for ${createdSession.id}`);
      return NextResponse.json({ session: createdSession });
    }

    // Schedule notification emails
    let scheduledEmailIds = {};
    try {
      scheduledEmailIds = await scheduleSessionEmails(fullSession);
      console.log(`[Sessions API] Scheduled ${Object.keys(scheduledEmailIds).length} emails for session ${createdSession.id}`);
    } catch (error) {
      // Email scheduling failure shouldn't fail the session creation
      console.error(`[Sessions API] Failed to schedule emails:`, error);
    }

    // Save scheduled email IDs to Airtable session record
    if (Object.keys(scheduledEmailIds).length > 0) {
      const emailIdsJson = stringifyScheduledEmailIds(scheduledEmailIds);
      console.log(`[Sessions API] Saving scheduled email IDs: ${emailIdsJson}`);

      try {
        await updateSession(createdSession.id, {
          scheduledEmailIds: emailIdsJson,
        });
        console.log(`[Sessions API] Saved email IDs to session ${createdSession.id}`);
      } catch (updateError) {
        console.error(`[Sessions API] Failed to save email IDs to session:`, updateError);
      }
    }

    return NextResponse.json({
      session: createdSession,
      scheduledEmails: Object.keys(scheduledEmailIds).length,
    });
  } catch (error) {
    console.error("[Sessions API] Error creating session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create session" },
      { status: 500 }
    );
  }
}
