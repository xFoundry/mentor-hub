"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import {
  getPreMeetingSubmissions,
  createPreMeetingSubmission as createSubmissionApi,
  updatePreMeetingSubmission as updateSubmissionApi,
} from "@/lib/baseql";
import type { PreMeetingSubmission } from "@/types/schema";
import { toast } from "sonner";

/**
 * Hook to fetch and manage pre-meeting submissions for a session
 */
export function usePreMeetingSubmissions(sessionId?: string) {
  const { data, error, isLoading, mutate: boundMutate } = useSWR<PreMeetingSubmission[]>(
    sessionId ? [`/pre-meeting-submissions`, sessionId] : null,
    async () => {
      if (!sessionId) return [];
      const result = await getPreMeetingSubmissions(sessionId);
      return result.preMeetingSubmissions || [];
    },
    { revalidateOnFocus: false }
  );

  /**
   * Force revalidation
   */
  const revalidate = useCallback(() => {
    return boundMutate();
  }, [boundMutate]);

  return {
    submissions: data || [],
    isLoading,
    error,
    revalidate,
    mutate: boundMutate,
  };
}

/**
 * Hook to create a pre-meeting submission
 */
export function useCreatePreMeetingSubmission() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSubmission = async (input: {
    sessionId: string;
    respondantId: string;
    agendaItems?: string;
    questions?: string;
    topicsToDiscuss?: string;
    materialsLinks?: string;
  }): Promise<PreMeetingSubmission | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createSubmissionApi(input);

      // Invalidate sessions cache to refresh embedded preMeetingSubmissions
      await mutate(
        (key) => Array.isArray(key) && key[0]?.includes("/sessions"),
        undefined,
        { revalidate: true }
      );

      toast.success("Pre-meeting prep submitted successfully");
      return result.insert_preMeetingSubmissions;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to submit pre-meeting prep");
      setError(error);
      toast.error(error.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createSubmission, isCreating, error };
}

/**
 * Hook to update a pre-meeting submission
 */
export function useUpdatePreMeetingSubmission() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateSubmission = async (
    submissionId: string,
    updates: {
      agendaItems?: string;
      questions?: string;
      topicsToDiscuss?: string;
      materialsLinks?: string;
    }
  ): Promise<PreMeetingSubmission | null> => {
    setIsUpdating(true);
    setError(null);

    try {
      const result = await updateSubmissionApi(submissionId, updates);

      // Invalidate sessions cache to refresh embedded preMeetingSubmissions
      await mutate(
        (key) => Array.isArray(key) && key[0]?.includes("/sessions"),
        undefined,
        { revalidate: true }
      );

      toast.success("Pre-meeting prep updated successfully");
      return result.update_preMeetingSubmissions;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update pre-meeting prep");
      setError(error);
      toast.error(error.message);
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateSubmission, isUpdating, error };
}

/**
 * Check if the current user has already submitted pre-meeting prep
 */
export function hasUserSubmitted(
  submissions: PreMeetingSubmission[],
  contactId: string
): PreMeetingSubmission | null {
  return submissions.find(
    (s) => s.respondant?.[0]?.id === contactId
  ) || null;
}
