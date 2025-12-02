"use client";

import { useState } from "react";
import { mutate } from "swr";
import { createSessionFeedback, updateSessionFeedback } from "@/lib/baseql";
import type { SessionFeedback } from "@/types/schema";
import { toast } from "sonner";

export interface FeedbackFormData {
  // Session link
  sessionId: string;
  respondantId?: string;
  role: "Mentor" | "Mentee";
  // Common fields
  whatWentWell?: string;
  areasForImprovement?: string;
  additionalNeeds?: string;
  // Mentor-specific fields
  menteeEngagement?: number;
  suggestedNextSteps?: string;
  privateNotes?: string;
  // Student-specific fields
  rating?: number;
  contentRelevance?: number;
  actionabilityOfAdvice?: number;
  mentorPreparedness?: number;
  requestFollowUp?: boolean;
}

/**
 * Hook to submit session feedback
 */
export function useFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitFeedback = async (
    data: FeedbackFormData
  ): Promise<SessionFeedback | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createSessionFeedback({
        session: [data.sessionId],
        respondant: data.respondantId ? [data.respondantId] : undefined,
        role: data.role,
        whatWentWell: data.whatWentWell,
        areasForImprovement: data.areasForImprovement,
        additionalNeeds: data.additionalNeeds,
        menteeEngagement: data.menteeEngagement,
        suggestedNextSteps: data.suggestedNextSteps,
        privateNotes: data.privateNotes,
        rating: data.rating,
        contentRelevance: data.contentRelevance,
        actionabilityOfAdvice: data.actionabilityOfAdvice,
        mentorPreparedness: data.mentorPreparedness,
        requestFollowUp: data.requestFollowUp,
      });

      // Invalidate session-related caches to refresh feedback data
      await invalidateFeedbackCaches();

      toast.success("Feedback submitted successfully");
      return result.insert_sessionFeedback;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to submit feedback");
      setError(error);
      toast.error(error.message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFeedback = async (
    feedbackId: string,
    data: Omit<FeedbackFormData, "sessionId" | "respondantId" | "role">
  ): Promise<SessionFeedback | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateSessionFeedback({
        id: feedbackId,
        whatWentWell: data.whatWentWell,
        areasForImprovement: data.areasForImprovement,
        additionalNeeds: data.additionalNeeds,
        menteeEngagement: data.menteeEngagement,
        suggestedNextSteps: data.suggestedNextSteps,
        privateNotes: data.privateNotes,
        rating: data.rating,
        contentRelevance: data.contentRelevance,
        actionabilityOfAdvice: data.actionabilityOfAdvice,
        mentorPreparedness: data.mentorPreparedness,
        requestFollowUp: data.requestFollowUp,
      });

      // Invalidate session-related caches to refresh feedback data
      await invalidateFeedbackCaches();

      toast.success("Feedback updated successfully");
      return result.update_sessionFeedback;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update feedback");
      setError(error);
      toast.error(error.message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitFeedback, updateFeedback, isSubmitting, error };
}

/**
 * Invalidate all feedback/session-related caches
 */
async function invalidateFeedbackCaches() {
  await mutate(
    (key) => Array.isArray(key) && (
      key[0]?.includes("/sessions") ||
      key[0]?.includes("/session") ||
      key[0]?.includes("/sessions-by-team") ||
      key[0]?.includes("/feedback")
    ),
    undefined,
    { revalidate: true }
  );
}
