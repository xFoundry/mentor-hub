"use client";

import useSWR from "swr";
import { getAllTeams, getTeamsInCohort } from "@/lib/baseql";

/**
 * Hook to fetch teams
 * @param cohortId - Cohort ID to filter teams, or "all" to get all teams
 */
export function useTeams(cohortId?: string) {
  const { data, error, isLoading } = useSWR(
    cohortId ? [`/teams`, cohortId] : null,
    async () => {
      if (!cohortId) return [];

      // Fetch all teams if cohortId is "all", otherwise filter by cohort
      const result = cohortId === "all"
        ? await getAllTeams()
        : await getTeamsInCohort(cohortId);

      return result.teams || [];
    }
  );

  return {
    teams: data || [],
    isLoading,
    error,
  };
}
