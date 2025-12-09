"use client";

import { useState } from "react";
import { mutate } from "swr";
import type { RecurringSessionInput, RecurringSessionResult } from "@/types/recurring";
import { toast } from "sonner";

/**
 * Hook to create a recurring session series (staff only)
 */
export function useCreateRecurringSession() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createRecurringSessions = async (
    input: RecurringSessionInput
  ): Promise<RecurringSessionResult | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create recurring sessions");
      }

      const data = await response.json();

      // Invalidate session-related caches
      await invalidateSessionCaches();

      if (data.scheduledEmails > 0) {
        toast.success(
          `Created ${data.count} sessions and scheduled ${data.scheduledEmails} reminder emails`
        );
      } else {
        toast.success(`Created ${data.count} recurring sessions`);
      }

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create recurring sessions");
      setError(error);
      toast.error(error.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createRecurringSessions, isCreating, error };
}

/**
 * Invalidate all session-related caches
 */
async function invalidateSessionCaches() {
  await mutate(
    (key) =>
      Array.isArray(key) &&
      (key[0]?.includes("/sessions") ||
        key[0]?.includes("/session") ||
        key[0]?.includes("/sessions-by-team")),
    undefined,
    { revalidate: true }
  );
}
