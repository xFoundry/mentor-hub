"use client";

import useSWR from "swr";
import { getTeamDetail } from "@/lib/baseql";

/**
 * Hook to fetch team detail by ID
 * @param teamId - Team ID
 */
export function useTeamDetail(teamId?: string) {
  const { data, error, isLoading } = useSWR(
    teamId ? [`/teams/${teamId}`] : null,
    async () => {
      if (!teamId) return null;

      const result = await getTeamDetail(teamId);
      return result.teams?.[0] || null;
    }
  );

  return {
    team: data,
    isLoading,
    error,
  };
}
