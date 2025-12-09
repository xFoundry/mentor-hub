"use client";

import useSWR, { mutate } from "swr";
import { getStudentSessions, getSessionDetail, getAllSessions } from "@/lib/baseql";
import type { Session } from "@/types/schema";
import { toast } from "sonner";
import { useEffectiveUser } from "@/hooks/use-effective-user";

/**
 * Hook to fetch sessions for a user
 * Uses effective user context to support impersonation
 * @param email - User email
 * @param cohortId - Optional cohort ID to filter sessions (use "all" to show all cohorts)
 */
export function useSessions(email?: string, cohortId?: string) {
  const { userType } = useEffectiveUser();

  const { data, error, isLoading, mutate } = useSWR(
    email ? [`/sessions`, email, cohortId, userType] : null,
    async () => {
      if (!email) return [];

      let sessions: any[] = [];

      // For staff, fetch all sessions
      if (userType === "staff") {
        const result = await getAllSessions();
        sessions = result.sessions || [];
      } else {
        // For students and mentors, fetch their specific sessions
        const result = await getStudentSessions(email);

        // Add sessions from team memberships (for students)
        result.members?.forEach((member) => {
          member.team?.forEach((team) => {
            if (team.mentorshipSessions) {
              sessions.push(...team.mentorshipSessions);
            }
          });
        });

        // Add sessions where user is mentor (for mentors - already transformed)
        if (result.mentorSessions) {
          sessions.push(...result.mentorSessions);
        }
      }

      // Transform all sessions to add students from team members, extract mentors, and add aliases
      const transformedSessions = sessions.map((session) => {
        // Extract students from team members if not already present
        let students = session.students;
        if (!students && session.team?.[0]?.members) {
          students = session.team[0].members
            ?.map((member: any) => member.contact?.[0])
            .filter(Boolean) || [];
        }

        // Extract mentors from sessionParticipants (with backwards compatibility)
        const participants = session.sessionParticipants || [];
        const mentorParticipants = participants.filter(
          (p: any) => p.status === "Active" || !p.status
        );
        const mentors = mentorParticipants
          .map((p: any) => p.contact?.[0])
          .filter(Boolean);

        // Backwards compat: populate mentor[] from sessionParticipants if available
        const mentor = mentors.length > 0 ? mentors : session.mentor;

        return {
          ...session,
          students,
          mentor,                          // Backwards compat (array of all mentors)
          mentors,                         // NEW: explicit all mentors array
          sessionParticipants: participants,
          actionItems: session.tasks || session.actionItems,
          sessionFeedback: session.feedback || session.sessionFeedback,
        };
      });

      // Filter by cohort if specified (and not "all")
      let filteredSessions = transformedSessions;
      if (cohortId && cohortId !== "all") {
        filteredSessions = transformedSessions.filter((session) => {
          // Check if session's team cohorts include the selected cohort
          const teamCohorts = session.team?.[0]?.cohorts || [];
          return teamCohorts.some((cohort: any) => cohort.id === cohortId);
        });
      }

      // Sort by scheduled start (most recent first)
      return filteredSessions.sort((a, b) => {
        const dateA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
        const dateB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
        return dateB - dateA;
      });
    }
  );

  return {
    sessions: data || [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a single session by ID
 */
export function useSession(sessionId?: string) {
  const { data, error, isLoading } = useSWR(
    sessionId ? [`/session`, sessionId] : null,
    async () => {
      if (!sessionId) return null;

      const result = await getSessionDetail(sessionId);
      return result.sessions?.[0] || null;
    }
  );

  return {
    session: data,
    isLoading,
    error,
  };
}

/**
 * Revalidate sessions cache
 */
export function revalidateSessions(email: string) {
  return mutate([`/sessions`, email]);
}

/**
 * Revalidate single session cache
 */
export function revalidateSession(sessionId: string) {
  return mutate([`/session`, sessionId]);
}
