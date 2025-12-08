"use client";

import { useState } from "react";
import { mutate } from "swr";
import type { Session } from "@/types/schema";
import { toast } from "sonner";

interface MentorInput {
  contactId: string;
  role: "Lead Mentor" | "Supporting Mentor" | "Observer";
}

interface CreateSessionInput {
  sessionType: string;
  scheduledStart: string;
  duration?: number;
  /** @deprecated Use mentors array instead */
  mentorId?: string;
  /** Array of mentors with roles - first Lead Mentor is also set as legacy mentor */
  mentors?: MentorInput[];
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
 * Uses API route to ensure email scheduling happens server-side
 */
export function useCreateSession() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSession = async (input: CreateSessionInput): Promise<Session | null> => {
    setIsCreating(true);
    setError(null);

    try {
      // Call API route (handles session creation + email scheduling)
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create session");
      }

      const data = await response.json();

      // Invalidate session-related caches
      await invalidateSessionCaches();

      const scheduledCount = data.scheduledEmails || 0;
      if (scheduledCount > 0) {
        toast.success(`Session created and ${scheduledCount} reminder emails scheduled`);
      } else {
        toast.success("Session created successfully");
      }

      return data.session;
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
