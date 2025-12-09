/**
 * Series Operations for Recurring Sessions
 *
 * High-level operations for creating and managing session series.
 * Uses BaseQL functions for database operations.
 */

import { v4 as uuidv4 } from "uuid";
import type { Session } from "@/types/schema";
import type {
  RecurringSessionInput,
  SeriesConfig,
  SeriesScope,
  RecurringSessionResult,
} from "@/types/recurring";
import { generateOccurrences, configToRRule } from "./rrule-helpers";
import {
  createSessionWithSeries,
  addMentorsToSession,
  getSessionDetail,
  getSessionsBySeries,
  updateSession,
  deleteSession,
  deleteSessionsByIds,
} from "@/lib/baseql";
import { scheduleSessionEmailsViaQStash } from "@/lib/notifications/qstash-scheduler";

/**
 * Generate a unique series ID
 */
export function generateSeriesId(): string {
  return uuidv4();
}

/**
 * Create a recurring session series
 *
 * Creates all session occurrences at once, scheduling emails for each.
 *
 * @param input - Recurring session configuration
 * @returns Created sessions and series metadata
 */
export async function createRecurringSessions(
  input: RecurringSessionInput
): Promise<RecurringSessionResult> {
  const { sessionConfig, recurrence, scheduledStart } = input;

  // Generate series ID
  const seriesId = generateSeriesId();

  // Generate all occurrence dates
  const occurrenceDates = generateOccurrences(scheduledStart, recurrence);

  if (occurrenceDates.length === 0) {
    throw new Error("No occurrences generated for the given recurrence pattern");
  }

  // Generate RRULE string for storage
  const rruleString = configToRRule(new Date(scheduledStart), recurrence);

  // Stringify the series config for storage
  const seriesConfigJson = JSON.stringify(sessionConfig);

  // Get lead mentor ID for legacy field
  const leadMentor = sessionConfig.mentors.find((m) => m.role === "Lead Mentor");
  const mentorIdForSession =
    leadMentor?.contactId || sessionConfig.mentors[0]?.contactId;

  if (!mentorIdForSession) {
    throw new Error("At least one mentor is required");
  }

  const createdSessions: { id: string; scheduledStart: string }[] = [];
  let totalScheduledEmails = 0;

  // Create each session occurrence
  for (let i = 0; i < occurrenceDates.length; i++) {
    const occurrenceDate = occurrenceDates[i];
    const isFirstSession = i === 0;

    try {
      // Create session in database
      const result = await createSessionWithSeries({
        sessionType: sessionConfig.sessionType,
        scheduledStart: occurrenceDate.toISOString(),
        duration: sessionConfig.duration,
        mentorId: mentorIdForSession,
        teamId: sessionConfig.teamId,
        cohortId: sessionConfig.cohortId,
        meetingPlatform: sessionConfig.meetingPlatform,
        meetingUrl: sessionConfig.meetingUrl,
        agenda: sessionConfig.agenda,
        status: "Scheduled",
        locationId: sessionConfig.locationId,
        seriesId,
        // Only store rrule and seriesConfig on the first (parent) session
        rrule: isFirstSession ? rruleString : undefined,
        seriesConfig: isFirstSession ? seriesConfigJson : undefined,
      });

      const createdSession = Array.isArray(result.insert_sessions)
        ? result.insert_sessions[0]
        : result.insert_sessions;

      if (!createdSession?.id) {
        console.error(`Failed to create session for occurrence ${i + 1}`);
        continue;
      }

      // Create session participants for all mentors
      if (sessionConfig.mentors.length > 0) {
        try {
          await addMentorsToSession(createdSession.id, sessionConfig.mentors);
        } catch (participantError) {
          console.error(
            `Failed to create sessionParticipants for session ${createdSession.id}:`,
            participantError
          );
        }
      }

      // Schedule emails for this session via QStash
      try {
        const sessionDetailResult = await getSessionDetail(createdSession.id);
        const fullSession = sessionDetailResult.sessions?.[0];

        if (fullSession) {
          const qstashResult = await scheduleSessionEmailsViaQStash(fullSession);
          if (qstashResult) {
            totalScheduledEmails += qstashResult.jobCount;
          }
        }
      } catch (emailError) {
        // Email scheduling failure shouldn't fail the session creation
        console.error(
          `Failed to schedule emails for session ${createdSession.id}:`,
          emailError
        );
      }

      createdSessions.push({
        id: createdSession.id,
        scheduledStart: occurrenceDate.toISOString(),
      });
    } catch (error) {
      console.error(`Error creating occurrence ${i + 1}:`, error);
      // Continue with remaining occurrences
    }
  }

  return {
    sessions: createdSessions,
    seriesId,
    count: createdSessions.length,
    scheduledEmails: totalScheduledEmails,
  };
}

/**
 * Get all sessions in a series
 */
export async function getSeriesSessions(seriesId: string): Promise<Session[]> {
  const result = await getSessionsBySeries(seriesId);
  return result.sessions;
}

/**
 * Get series info (count, first/last dates, etc.)
 */
export async function getSeriesInfo(seriesId: string): Promise<{
  count: number;
  firstSession: Session | null;
  lastSession: Session | null;
  upcomingCount: number;
  pastCount: number;
}> {
  const sessions = await getSeriesSessions(seriesId);
  const now = new Date();

  const upcoming = sessions.filter(
    (s) => new Date(s.scheduledStart!) > now
  );
  const past = sessions.filter(
    (s) => new Date(s.scheduledStart!) <= now
  );

  return {
    count: sessions.length,
    firstSession: sessions[0] || null,
    lastSession: sessions[sessions.length - 1] || null,
    upcomingCount: upcoming.length,
    pastCount: past.length,
  };
}

/**
 * Get the position of a session within its series (e.g., "3 of 12")
 */
export async function getSessionSeriesPosition(
  session: Session
): Promise<{ position: number; total: number } | null> {
  if (!session.seriesId) {
    return null;
  }

  const sessions = await getSeriesSessions(session.seriesId);
  const sortedSessions = sessions.sort(
    (a, b) =>
      new Date(a.scheduledStart!).getTime() -
      new Date(b.scheduledStart!).getTime()
  );

  const position = sortedSessions.findIndex((s) => s.id === session.id) + 1;

  return {
    position,
    total: sortedSessions.length,
  };
}

/**
 * Update sessions in a series with scope control
 *
 * @param seriesId - Series ID
 * @param sessionId - Current session ID (for future scope)
 * @param updates - Fields to update
 * @param scope - Which sessions to update
 */
export async function updateSeriesSessions(
  seriesId: string,
  sessionId: string,
  updates: Partial<Session>,
  scope: SeriesScope
): Promise<{ updatedCount: number }> {
  const sessions = await getSeriesSessions(seriesId);
  let sessionsToUpdate: Session[] = [];

  if (scope === "single") {
    sessionsToUpdate = sessions.filter((s) => s.id === sessionId);
  } else if (scope === "future") {
    const currentSession = sessions.find((s) => s.id === sessionId);
    if (currentSession) {
      const currentDate = new Date(currentSession.scheduledStart!);
      sessionsToUpdate = sessions.filter(
        (s) => new Date(s.scheduledStart!) >= currentDate
      );
    }
  } else {
    // scope === "all"
    sessionsToUpdate = sessions;
  }

  let updatedCount = 0;

  for (const session of sessionsToUpdate) {
    try {
      await updateSession(session.id, updates as any);
      updatedCount++;
    } catch (error) {
      console.error(`Failed to update session ${session.id}:`, error);
    }
  }

  return { updatedCount };
}

/**
 * Delete sessions in a series with scope control
 *
 * @param seriesId - Series ID
 * @param sessionId - Current session ID (for single/future scope)
 * @param scope - Which sessions to delete
 */
export async function deleteSeriesSessions(
  seriesId: string,
  sessionId: string,
  scope: SeriesScope
): Promise<{ deletedCount: number }> {
  const sessions = await getSeriesSessions(seriesId);
  let sessionsToDelete: Session[] = [];

  if (scope === "single") {
    sessionsToDelete = sessions.filter((s) => s.id === sessionId);
  } else if (scope === "future") {
    const currentSession = sessions.find((s) => s.id === sessionId);
    if (currentSession) {
      const currentDate = new Date(currentSession.scheduledStart!);
      sessionsToDelete = sessions.filter(
        (s) => new Date(s.scheduledStart!) >= currentDate
      );
    }
  } else {
    // scope === "all"
    sessionsToDelete = sessions;
  }

  const sessionIds = sessionsToDelete.map((s) => s.id);
  const result = await deleteSessionsByIds(sessionIds);

  return { deletedCount: result.deletedCount };
}

/**
 * Parse the series config JSON from a parent session
 */
export function parseSeriesConfig(session: Session): SeriesConfig | null {
  if (!session.seriesConfig) {
    return null;
  }

  try {
    return JSON.parse(session.seriesConfig) as SeriesConfig;
  } catch {
    return null;
  }
}
