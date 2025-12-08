"use client";

import useSWR from "swr";
import { getSessionsGroupedByTeam } from "@/lib/baseql";
import { useCohortContext } from "@/contexts/cohort-context";
import type { Session, Team } from "@/types/schema";
import {
  hasMentorFeedback,
  isSessionEligibleForFeedback,
  parseAsLocalTime,
  getLeadMentor,
  getMentorParticipants,
} from "@/components/sessions/session-transformers";
import { isFuture } from "date-fns";

export interface TeamWithSessions extends Team {
  sessions: Session[];
  sessionCount: number;
  upcomingCount: number;
  completedCount: number;
  needsFeedbackCount: number;
}

/**
 * Hook to fetch sessions grouped by team
 * Used by staff dashboard for grouped view
 */
export function useSessionsGroupedByTeam() {
  const { selectedCohortId } = useCohortContext();

  const { data, error, isLoading, mutate } = useSWR(
    [`/sessions-by-team`, selectedCohortId],
    async () => {
      const cohortId = selectedCohortId === "all" ? undefined : selectedCohortId;
      const result = await getSessionsGroupedByTeam(cohortId);

      // Calculate stats for each team
      const teamsWithStats: TeamWithSessions[] = result.teams.map((team: any) => {
        const sessions = team.sessions || [];

        const upcomingCount = sessions.filter((s: any) => {
          if (!s.scheduledStart) return false;
          return isFuture(parseAsLocalTime(s.scheduledStart)) && s.status !== "Cancelled";
        }).length;

        const completedCount = sessions.filter((s: any) =>
          s.status === "Completed"
        ).length;

        const needsFeedbackCount = sessions.filter((s: any) =>
          isSessionEligibleForFeedback(s) && !hasMentorFeedback(s)
        ).length;

        return {
          ...team,
          sessions,
          sessionCount: sessions.length,
          upcomingCount,
          completedCount,
          needsFeedbackCount,
        };
      });

      return teamsWithStats;
    }
  );

  return {
    teamsWithSessions: data || [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Group sessions by lead mentor (client-side grouping)
 * Uses lead mentor from sessionParticipants, with fallback to legacy mentor field
 * Sessions with multiple mentors are grouped under the lead mentor only
 * The session cards will show all mentors assigned
 */
export function useSessionsGroupedByMentor(sessions: Session[]) {
  const mentorMap = new Map<string, {
    mentor: any;
    mentorCount: number;  // Track total mentors for display
    sessions: Session[];
    sessionCount: number;
    upcomingCount: number;
    completedCount: number;
  }>();

  sessions.forEach((session: any) => {
    // Use lead mentor for grouping (falls back to first mentor or legacy mentor field)
    const leadMentor = getLeadMentor(session);
    const allMentors = getMentorParticipants(session);

    if (!leadMentor) return;

    const existing = mentorMap.get(leadMentor.id);
    const isUpcoming = session.scheduledStart &&
      isFuture(parseAsLocalTime(session.scheduledStart)) &&
      session.status !== "Cancelled";
    const isCompleted = session.status === "Completed";

    if (existing) {
      existing.sessions.push(session);
      existing.sessionCount++;
      if (isUpcoming) existing.upcomingCount++;
      if (isCompleted) existing.completedCount++;
      // Track max mentors across sessions for this group
      existing.mentorCount = Math.max(existing.mentorCount, allMentors.length);
    } else {
      mentorMap.set(leadMentor.id, {
        mentor: leadMentor,
        mentorCount: allMentors.length,
        sessions: [session],
        sessionCount: 1,
        upcomingCount: isUpcoming ? 1 : 0,
        completedCount: isCompleted ? 1 : 0,
      });
    }
  });

  return Array.from(mentorMap.values());
}
