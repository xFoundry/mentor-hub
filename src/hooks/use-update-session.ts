"use client";

import { useState } from "react";
import { mutate } from "swr";
import type { Session } from "@/types/schema";
import { toast } from "sonner";

interface UpdateSessionInput {
  sessionType?: string;
  scheduledStart?: string;
  duration?: number;
  status?: string;
  meetingPlatform?: string;
  meetingUrl?: string;
  agenda?: string;
  granolaNotesUrl?: string;
  summary?: string;
  fullTranscript?: string;
  locationId?: string;
  /**
   * Contact IDs to send update notification emails to.
   * - null or undefined: No notification emails sent
   * - string[]: Send to these specific contacts
   */
  notificationRecipients?: string[] | null;
}

/**
 * Hook to update a session (staff only)
 * Uses API route to ensure email rescheduling happens server-side
 */
export function useUpdateSession() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateSession = async (
    sessionId: string,
    updates: UpdateSessionInput
  ): Promise<Session | null> => {
    setIsUpdating(true);
    setError(null);

    try {
      // Call API route (handles session update + email rescheduling)
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update session");
      }

      const data = await response.json();

      // Invalidate session-related caches
      await invalidateSessionCaches();

      // Show success message with email info if applicable
      if (data.emailsSent > 0) {
        toast.success(`Session updated. ${data.emailsSent} notification email${data.emailsSent > 1 ? "s" : ""} sent.`);
      } else {
        toast.success("Session updated successfully");
      }

      return data.session;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update session");
      setError(error);
      toast.error(error.message);
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateSession, isUpdating, error };
}

/**
 * Invalidate all session-related caches
 */
async function invalidateSessionCaches() {
  await mutate(
    (key) => Array.isArray(key) && (
      key[0]?.includes("/sessions") ||
      key[0]?.includes("/session") ||
      key[0]?.includes("/sessions-by-team")
    ),
    undefined,
    { revalidate: true }
  );
}
