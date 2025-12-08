"use client";

import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import type { Session, SessionParticipant, Contact, EnrichedMentorParticipant } from "@/types/schema";
import {
  createSessionParticipant,
  updateSessionParticipant,
  deleteSessionParticipant,
  getSessionDetail,
} from "@/lib/baseql";

/**
 * Hook for managing session participants (mentors)
 * Provides read access to participants and mutations for adding/updating/removing mentors
 */
export function useSessionParticipants(sessionId?: string) {
  const { data: session, error, isLoading, mutate: mutateSession } = useSWR(
    sessionId ? [`/session-participants`, sessionId] : null,
    async () => {
      if (!sessionId) return null;
      const result = await getSessionDetail(sessionId);
      return result.sessions?.[0] || null;
    }
  );

  // Extract and enrich mentor participants
  const participants = session?.sessionParticipants || [];
  const mentorParticipants = participants.filter(
    (p) => p.status === "Active" || !p.status
  );

  const mentors: EnrichedMentorParticipant[] = mentorParticipants
    .map((p) => ({
      ...p,
      contact: p.contact?.[0] || ({} as Contact),
      isLead: p.role === "Lead Mentor",
    }))
    .sort((a, b) => {
      // Lead mentor first
      if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
      return (a.contact?.fullName || "").localeCompare(b.contact?.fullName || "");
    });

  const leadMentor = mentors.find((m) => m.isLead) || mentors[0] || null;

  /**
   * Add a mentor to the session
   */
  const addMentor = async (
    contactId: string,
    role: "Lead Mentor" | "Supporting Mentor" | "Observer" = "Supporting Mentor"
  ) => {
    if (!sessionId) {
      toast.error("No session selected");
      return null;
    }

    // Check if there's already a lead mentor when adding a new lead
    if (role === "Lead Mentor" && leadMentor) {
      toast.error("Session already has a lead mentor. Remove or change their role first.");
      return null;
    }

    try {
      const result = await createSessionParticipant({
        sessionId,
        contactId,
        role,
        status: "Active",
      });

      // Revalidate session data
      await mutateSession();
      revalidateSessionParticipants(sessionId);

      toast.success("Mentor added to session");
      return result.insert_sessionParticipants;
    } catch (err) {
      console.error("Failed to add mentor:", err);
      toast.error("Failed to add mentor to session");
      return null;
    }
  };

  /**
   * Update a participant's role, attendance, or status
   */
  const updateParticipant = async (
    participantId: string,
    updates: {
      role?: "Lead Mentor" | "Supporting Mentor" | "Observer";
      attended?: boolean;
      attendanceNotes?: string;
      status?: string;
    }
  ) => {
    // Check if promoting to lead when one already exists
    if (updates.role === "Lead Mentor" && leadMentor && leadMentor.id !== participantId) {
      toast.error("Session already has a lead mentor. Change their role first.");
      return null;
    }

    try {
      const result = await updateSessionParticipant(participantId, updates);

      // Revalidate session data
      await mutateSession();
      if (sessionId) {
        revalidateSessionParticipants(sessionId);
      }

      toast.success("Participant updated");
      return result.update_sessionParticipants;
    } catch (err) {
      console.error("Failed to update participant:", err);
      toast.error("Failed to update participant");
      return null;
    }
  };

  /**
   * Remove a mentor from the session
   */
  const removeMentor = async (participantId: string) => {
    try {
      await deleteSessionParticipant(participantId);

      // Revalidate session data
      await mutateSession();
      if (sessionId) {
        revalidateSessionParticipants(sessionId);
      }

      toast.success("Mentor removed from session");
      return true;
    } catch (err) {
      console.error("Failed to remove mentor:", err);
      toast.error("Failed to remove mentor from session");
      return false;
    }
  };

  /**
   * Mark attendance for a mentor
   */
  const updateAttendance = async (
    participantId: string,
    attended: boolean,
    notes?: string
  ) => {
    return updateParticipant(participantId, {
      attended,
      attendanceNotes: notes,
    });
  };

  /**
   * Change a mentor's role
   */
  const changeRole = async (
    participantId: string,
    newRole: "Lead Mentor" | "Supporting Mentor" | "Observer"
  ) => {
    return updateParticipant(participantId, { role: newRole });
  };

  return {
    // Data
    session,
    participants,
    mentors,
    leadMentor,
    isLoading,
    error,

    // Mutations
    addMentor,
    updateParticipant,
    removeMentor,
    updateAttendance,
    changeRole,

    // Revalidation
    mutate: mutateSession,
  };
}

/**
 * Revalidate session participants cache
 */
export function revalidateSessionParticipants(sessionId: string) {
  return mutate([`/session-participants`, sessionId]);
}
