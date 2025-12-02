"use client";

import useSWR from "swr";
import { getMentorTeams } from "@/lib/baseql";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { useCohortContext } from "@/contexts/cohort-context";
import type { Team, SessionFeedback } from "@/types/schema";

export interface MentorSessionSummary {
  id: string;
  sessionId?: string;
  sessionType?: string;
  scheduledStart?: string;
  status?: string;
  feedback: SessionFeedback[];
}

export interface MentorTeam extends Team {
  memberCount: number;
  openTaskCount: number;
  mentorSessions: MentorSessionSummary[];
}

/**
 * Hook to fetch teams that a mentor is assigned to (via sessions)
 * Uses effective user context to support impersonation
 */
export function useMentorTeams() {
  const { userContext, isLoading: isUserLoading } = useEffectiveUser();
  const { selectedCohortId } = useCohortContext();

  const { data, error, isLoading } = useSWR(
    userContext?.email ? [`/mentor-teams`, userContext.email, selectedCohortId] : null,
    async () => {
      if (!userContext?.email) return [];

      const result = await getMentorTeams(userContext.email);
      let teams = result.teams || [];

      // Filter by cohort if specified
      if (selectedCohortId && selectedCohortId !== "all") {
        teams = teams.filter((team: any) => {
          const teamCohorts = team.cohorts || [];
          return teamCohorts.some((cohort: any) => cohort.id === selectedCohortId);
        });
      }

      return teams as MentorTeam[];
    }
  );

  return {
    teams: data || [],
    isLoading: isUserLoading || isLoading,
    error,
  };
}
