"use client";

import { useState } from "react";
import { mutate } from "swr";
import type { Contact, Participation } from "@/types/schema";
import { toast } from "sonner";

interface UpdateMentorInput {
  contactId: string;
  // Contact fields
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  expertise?: string[];
  linkedIn?: string;
  websiteUrl?: string;
  // Participation fields
  participationId?: string;
  status?: string;
}

interface UpdateMentorResult {
  contact?: Contact;
  participation?: Participation;
}

/**
 * Hook to update a mentor's contact info and/or participation status (staff only)
 */
export function useUpdateMentor() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateMentor = async (input: UpdateMentorInput): Promise<UpdateMentorResult | null> => {
    setIsUpdating(true);
    setError(null);

    const { contactId, ...updates } = input;

    try {
      const response = await fetch(`/api/mentors/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update mentor");
      }

      // Invalidate mentor-related caches
      await invalidateMentorCaches();

      toast.success("Mentor updated successfully");

      return data as UpdateMentorResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update mentor");
      setError(error);
      toast.error(error.message);
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateMentor, isUpdating, error };
}

/**
 * Invalidate all mentor-related caches
 */
async function invalidateMentorCaches() {
  await mutate(
    (key) => {
      if (typeof key === "string") {
        return key.includes("/mentors") || key.includes("/api/mentors");
      }
      if (Array.isArray(key)) {
        return key.some((k) =>
          typeof k === "string" && (k.includes("/mentors") || k.includes("/api/mentors"))
        );
      }
      return false;
    },
    undefined,
    { revalidate: true }
  );
}
