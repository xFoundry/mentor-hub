"use client";

import { mutate } from "swr";
import {
  updateTeam as updateTeamApi,
  createMember as createMemberApi,
  updateMember as updateMemberApi,
} from "@/lib/baseql";
import type { Team, Member } from "@/types/schema";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  status?: string;
  contact?: Array<{ id: string }>;
}

/**
 * Hook for team management mutations
 * Used by staff users to update, delete teams and manage members
 */
export function useTeamMutations(teamId?: string, members?: TeamMember[]) {
  /**
   * Update team details
   * Note: teamStatus is computed from member statuses. When changing team status,
   * we update all active members' statuses instead.
   */
  const updateTeam = async (
    updates: {
      teamName?: string;
      description?: string;
      teamStatus?: "Active" | "Inactive" | "Archived";
    }
  ): Promise<Team | null> => {
    if (!teamId) {
      toast.error("No team selected");
      return null;
    }

    try {
      // Handle teamStatus changes by updating member statuses
      if (updates.teamStatus && members && members.length > 0) {
        const targetStatus = updates.teamStatus;

        // Get members that need to be updated
        // If changing to Inactive/Archived, update all Active members
        // If changing to Active, update all Inactive members
        const membersToUpdate = members.filter(m => {
          if (targetStatus === "Inactive" || targetStatus === "Archived") {
            return m.status === "Active";
          } else if (targetStatus === "Active") {
            return m.status === "Inactive";
          }
          return false;
        });

        // Update member statuses in parallel
        if (membersToUpdate.length > 0) {
          await Promise.all(
            membersToUpdate.map(m => updateMemberApi(m.id, { status: targetStatus }))
          );
        }
      }

      // Update other team fields (name, description) if provided
      const { teamStatus: _, ...otherUpdates } = updates;
      if (Object.keys(otherUpdates).length > 0) {
        await updateTeamApi(teamId, otherUpdates);
      }

      // Revalidate team detail cache
      await mutate([`/teams/${teamId}`]);
      // Revalidate teams list cache
      await mutate((key) => Array.isArray(key) && key[0] === "/teams", undefined, { revalidate: true });

      toast.success("Team updated successfully");
      return null; // We don't have a single result anymore
    } catch (error) {
      console.error("Error updating team:", error);
      toast.error("Failed to update team");
      throw error;
    }
  };

  /**
   * Delete (archive) a team
   * Since teamStatus is computed, we archive all members to mark the team as archived
   */
  const deleteTeam = async (): Promise<boolean> => {
    if (!teamId) {
      toast.error("No team selected");
      return false;
    }

    try {
      // Archive all members (which will make the computed teamStatus become Archived)
      if (members && members.length > 0) {
        const activeMembers = members.filter(m => m.status !== "Archived");
        if (activeMembers.length > 0) {
          await Promise.all(
            activeMembers.map(m => updateMemberApi(m.id, { status: "Archived" }))
          );
        }
      }

      // Revalidate teams list cache
      await mutate((key) => Array.isArray(key) && key[0] === "/teams", undefined, { revalidate: true });

      toast.success("Team archived successfully");
      return true;
    } catch (error) {
      console.error("Error archiving team:", error);
      toast.error("Failed to archive team");
      throw error;
    }
  };

  /**
   * Add a member to the team
   */
  const addMember = async (
    contactId: string,
    type?: string
  ): Promise<Member | null> => {
    if (!teamId) {
      toast.error("No team selected");
      return null;
    }

    try {
      const result = await createMemberApi({
        teamId,
        contactId,
        type: type || "Member",
        status: "Active",
      });

      // Revalidate team detail cache
      await mutate([`/teams/${teamId}`]);

      toast.success("Member added successfully");
      return result.insert_members;
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add member");
      throw error;
    }
  };

  /**
   * Remove a member from the team (soft delete - sets status to Inactive)
   */
  const removeMember = async (memberId: string): Promise<boolean> => {
    if (!teamId) {
      toast.error("No team selected");
      return false;
    }

    try {
      await updateMemberApi(memberId, { status: "Inactive" });

      // Revalidate team detail cache
      await mutate([`/teams/${teamId}`]);

      toast.success("Member removed successfully");
      return true;
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
      throw error;
    }
  };

  return {
    updateTeam,
    deleteTeam,
    addMember,
    removeMember,
  };
}

/**
 * Revalidate team detail cache
 */
export function revalidateTeamDetail(teamId: string) {
  return mutate([`/teams/${teamId}`]);
}

/**
 * Revalidate all teams cache
 */
export function revalidateTeams() {
  return mutate((key) => Array.isArray(key) && key[0] === "/teams", undefined, { revalidate: true });
}
