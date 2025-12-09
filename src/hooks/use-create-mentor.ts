"use client";

import { useState } from "react";
import { mutate } from "swr";
import type { Contact, Participation, Cohort } from "@/types/schema";
import { toast } from "sonner";
import type { MentorWithCohort } from "./use-mentors";

interface CreateMentorInput {
  mode: "link" | "create";
  cohortId: string;
  capacityId: string;
  capacityName: string;
  // For "link" mode
  contactId?: string;
  // For "create" mode
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  expertise?: string[];
  linkedIn?: string;
  websiteUrl?: string;
}

interface CreateMentorResult {
  participation: Participation;
  contact: Contact;
}

/**
 * Hook to create a new mentor (staff only)
 * Supports linking existing contacts or creating new ones
 */
export function useCreateMentor() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMentor = async (input: CreateMentorInput): Promise<CreateMentorResult | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/mentors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle duplicate mentor case
        if (response.status === 409) {
          if (data.existingContact) {
            throw new Error(`A contact with this email already exists: ${data.existingContact.fullName}`);
          }
          if (data.existingParticipation) {
            throw new Error("This contact already has this capacity in this cohort");
          }
        }
        throw new Error(data.error || "Failed to create mentor");
      }

      // Optimistically update mentor caches
      await updateMentorCaches(input.cohortId, data as CreateMentorResult);

      const contactName = data.contact?.fullName || "Contact";
      toast.success(`${contactName} added successfully`);

      return data as CreateMentorResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create mentor");
      setError(error);
      toast.error(error.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createMentor, isCreating, error };
}

/**
 * Optimistically update mentor caches with new mentor
 */
async function updateMentorCaches(cohortId: string, result: CreateMentorResult) {
  const { contact, participation } = result;

  // Create a MentorWithCohort object from the result
  const newMentor: MentorWithCohort = {
    ...contact,
    cohorts: participation.cohorts as Cohort[] || [],
    participations: [
      {
        participationId: participation.id,
        cohortId: participation.cohorts?.[0]?.id || cohortId,
        status: participation.status,
      },
    ],
  };

  // Update the specific cohort's mentor list
  await mutate(
    ["/mentors", cohortId],
    (currentMentors: MentorWithCohort[] | undefined) => {
      if (!currentMentors) return [newMentor];

      // Check if mentor already exists (shouldn't happen, but just in case)
      const exists = currentMentors.some((m) => m.id === contact.id);
      if (exists) {
        return currentMentors.map((m) =>
          m.id === contact.id
            ? {
                ...m,
                cohorts: [...(m.cohorts || []), ...(newMentor.cohorts || [])],
                participations: [...(m.participations || []), ...(newMentor.participations || [])],
              }
            : m
        );
      }

      // Add new mentor and sort by name
      const updated = [...currentMentors, newMentor];
      return updated.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    },
    { revalidate: false }
  );

  // Also update the "all" mentors cache if it exists
  await mutate(
    ["/mentors", "all"],
    (currentMentors: MentorWithCohort[] | undefined) => {
      if (!currentMentors) return undefined; // Don't create cache if it doesn't exist

      const exists = currentMentors.some((m) => m.id === contact.id);
      if (exists) {
        return currentMentors.map((m) =>
          m.id === contact.id
            ? {
                ...m,
                cohorts: [...(m.cohorts || []), ...(newMentor.cohorts || [])],
                participations: [...(m.participations || []), ...(newMentor.participations || [])],
              }
            : m
        );
      }

      const updated = [...currentMentors, newMentor];
      return updated.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    },
    { revalidate: false }
  );

  // Also trigger a background revalidation to ensure data is in sync
  mutate(
    (key) => {
      if (Array.isArray(key) && key[0] === "/mentors") {
        return true;
      }
      return false;
    },
    undefined,
    { revalidate: true }
  );
}
