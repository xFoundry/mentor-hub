"use client";

import useSWR from "swr";
import { getTeamMembers, getUserTeam } from "@/lib/baseql";
import type { Contact } from "@/types/schema";

export interface TeamMember {
  memberId: string;
  contact: Contact;
  type: "Member" | "Lead";
  status: string;
}

/**
 * Hook to fetch team members for task assignment
 */
export function useTeamMembers(teamId?: string) {
  const { data, error, isLoading } = useSWR(
    teamId ? [`/team-members`, teamId] : null,
    async () => {
      if (!teamId) return [];

      const result = await getTeamMembers(teamId);
      const team = result.teams?.[0];
      if (!team) return [];

      // Transform members to expected format
      const members: TeamMember[] = (team.members || []).map((member: any) => ({
        memberId: member.id,
        contact: member.contact?.[0] || {},
        type: member.type || "Member",
        status: member.status,
      }));

      return members;
    }
  );

  return {
    members: data || [],
    isLoading,
    error,
  };
}

/**
 * Hook to get user's team (for students)
 */
export function useUserTeam(email?: string) {
  const { data, error, isLoading } = useSWR(
    email ? [`/user-team`, email] : null,
    async () => {
      if (!email) return null;
      const result = await getUserTeam(email);
      return result.team;
    }
  );

  return {
    team: data,
    teamId: data?.id,
    isLoading,
    error,
  };
}
