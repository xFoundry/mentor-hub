"use client";

import { useState } from "react";
import { mutate } from "swr";
import { createSession as createSessionApi } from "@/lib/baseql";
import type { Session } from "@/types/schema";
import { toast } from "sonner";

interface CreateSessionInput {
  sessionType: string;
  scheduledStart: string;
  duration?: number;
  mentorId: string;
  teamId: string;
  cohortId?: string;
  meetingPlatform?: string;
  meetingUrl?: string;
  locationId?: string;
  agenda?: string;
  status?: string;
}

/**
 * Hook to create a new session (staff only)
 */
export function useCreateSession() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSession = async (input: CreateSessionInput): Promise<Session | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createSessionApi(input);

      // Invalidate session-related caches
      await invalidateSessionCaches();

      toast.success("Session created successfully");
      // BaseQL insert_* mutations return an array of inserted records
      const sessions = result.insert_sessions;
      return Array.isArray(sessions) ? sessions[0] : sessions;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create session");
      setError(error);
      toast.error(error.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createSession, isCreating, error };
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
