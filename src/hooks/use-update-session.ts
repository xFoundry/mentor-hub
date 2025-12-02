"use client";

import { useState } from "react";
import { mutate } from "swr";
import { updateSession as updateSessionApi } from "@/lib/baseql";
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
}

/**
 * Hook to update a session (staff only)
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
      const result = await updateSessionApi(sessionId, updates);

      // Invalidate session-related caches
      await invalidateSessionCaches();

      toast.success("Session updated successfully");
      // BaseQL update_* mutations return the updated record
      const session = result.update_sessions;
      return Array.isArray(session) ? session[0] : session;
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
