import { NextRequest, NextResponse } from "next/server";
import { createSession as createSessionInDb, getSessionDetail, addMentorsToSession } from "@/lib/baseql";
import { scheduleSessionEmailsViaQStash } from "@/lib/notifications/qstash-scheduler";

interface MentorInput {
  contactId: string;
  role: "Lead Mentor" | "Supporting Mentor" | "Observer";
}

/**
 * POST /api/sessions
 *
 * Create a new session and schedule notification emails
 * Supports both legacy single mentorId and new mentors array format
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract mentors - support both legacy mentorId and new mentors array
    const mentors: MentorInput[] = body.mentors || [];
    const legacyMentorId = body.mentorId;

    // Get lead mentor ID for the legacy mentor field
    const leadMentor = mentors.find(m => m.role === "Lead Mentor");
    const mentorIdForSession = leadMentor?.contactId || legacyMentorId || mentors[0]?.contactId;

    // Validate required fields
    const { sessionType, scheduledStart, teamId } = body;
    if (!sessionType || !scheduledStart || !teamId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionType, scheduledStart, teamId" },
        { status: 400 }
      );
    }

    if (!mentorIdForSession && mentors.length === 0) {
      return NextResponse.json(
        { error: "At least one mentor is required" },
        { status: 400 }
      );
    }

    // Create session in BaseQL (with lead mentor for backwards compatibility)
    const result = await createSessionInDb({
      sessionType: body.sessionType,
      scheduledStart: body.scheduledStart,
      duration: body.duration,
      mentorId: mentorIdForSession,
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

    // Create sessionParticipants for all mentors (new schema)
    if (mentors.length > 0) {
      try {
        await addMentorsToSession(createdSession.id, mentors);
        console.log(`[Sessions API] Created ${mentors.length} sessionParticipants for session ${createdSession.id}`);
      } catch (participantError) {
        // Log but don't fail - session is created, participants are supplemental
        console.error(`[Sessions API] Failed to create sessionParticipants:`, participantError);
      }
    } else if (legacyMentorId) {
      // Backwards compat: create single participant from legacy mentorId
      try {
        await addMentorsToSession(createdSession.id, [{ contactId: legacyMentorId, role: "Lead Mentor" }]);
        console.log(`[Sessions API] Created sessionParticipant from legacy mentorId for session ${createdSession.id}`);
      } catch (participantError) {
        console.error(`[Sessions API] Failed to create sessionParticipant from legacy:`, participantError);
      }
    }

    // Fetch full session with team members for email scheduling
    const sessionDetailResult = await getSessionDetail(createdSession.id);
    const fullSession = sessionDetailResult.sessions?.[0];

    if (!fullSession) {
      console.warn(`[Sessions API] Could not fetch session detail for ${createdSession.id}`);
      return NextResponse.json({ session: createdSession });
    }

    // Schedule notification emails via QStash
    let batchId: string | null = null;

    try {
      const qstashResult = await scheduleSessionEmailsViaQStash(fullSession);
      if (qstashResult) {
        batchId = qstashResult.batchId;
        console.log(`[Sessions API] Queued ${qstashResult.jobCount} emails via QStash (batch: ${batchId})`);
      }
    } catch (error) {
      // Email scheduling failure shouldn't fail the session creation
      console.error(`[Sessions API] Failed to queue emails via QStash:`, error);
    }

    return NextResponse.json({
      session: createdSession,
      emailBatchId: batchId, // Return batch ID for UI progress tracking
    });
  } catch (error) {
    console.error("[Sessions API] Error creating session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create session" },
      { status: 500 }
    );
  }
}
