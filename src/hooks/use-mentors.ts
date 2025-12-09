"use client";

import useSWR from "swr";
import { getMentorsInCohort, getAllMentors } from "@/lib/baseql";
import type { Contact, Cohort, Participation } from "@/types/schema";

/**
 * Participation info for a specific cohort
 */
export interface MentorParticipation {
  participationId: string;
  cohortId: string;
  status?: string;
}

/**
 * Mentor with cohort info attached
 */
export interface MentorWithCohort extends Contact {
  cohorts?: Cohort[];
  /** Participation records for this mentor (for editing) */
  participations?: MentorParticipation[];
}

/**
 * Hook to fetch mentors in a cohort
 * @param cohortId - Cohort ID to filter mentors, or "all" to get all mentors
 */
export function useMentors(cohortId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    cohortId ? [`/mentors`, cohortId] : null,
    async () => {
      if (!cohortId) return [];

      // Fetch all mentors if cohortId is "all", otherwise filter by cohort
      const result = cohortId === "all"
        ? await getAllMentors()
        : await getMentorsInCohort(cohortId);

      // Extract contact info from participation records, including cohort data
      // Use a Map to merge cohorts for mentors with multiple participation records
      const mentorMap = new Map<string, MentorWithCohort>();

      result.participation?.forEach((participation) => {
        if (participation.contacts) {
          participation.contacts.forEach((contact) => {
            const existingMentor = mentorMap.get(contact.id);
            const participationInfo: MentorParticipation = {
              participationId: participation.id,
              cohortId: participation.cohorts?.[0]?.id || "",
              status: participation.status,
            };

            if (existingMentor) {
              // Merge cohorts from this participation into existing mentor
              const existingCohortIds = new Set(existingMentor.cohorts?.map(c => c.id) || []);
              const newCohorts = participation.cohorts?.filter(c => !existingCohortIds.has(c.id)) || [];
              existingMentor.cohorts = [...(existingMentor.cohorts || []), ...newCohorts];
              // Add participation info
              existingMentor.participations = [...(existingMentor.participations || []), participationInfo];
            } else {
              // First time seeing this mentor
              mentorMap.set(contact.id, {
                ...contact,
                cohorts: participation.cohorts ? [...participation.cohorts] : [],
                participations: [participationInfo],
              });
            }
          });
        }
      });

      const uniqueMentors = Array.from(mentorMap.values());

      // Sort by name
      return uniqueMentors.sort((a, b) => {
        const nameA = a.fullName || "";
        const nameB = b.fullName || "";
        return nameA.localeCompare(nameB);
      });
    }
  );

  return {
    mentors: data || [],
    isLoading,
    error,
    mutate,
  };
}
