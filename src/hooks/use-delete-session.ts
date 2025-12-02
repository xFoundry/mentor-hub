"use client";

import { useState } from "react";
import { mutate } from "swr";
import { deleteSession as deleteSessionApi } from "@/lib/baseql";
import { toast } from "sonner";

/**
 * Hook to delete a session (staff only)
 */
export function useDeleteSession() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteSession = async (sessionId: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteSessionApi(sessionId);

      // Invalidate session-related caches
      await invalidateSessionCaches();

      toast.success("Session deleted successfully");
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete session");
      setError(error);
      toast.error(error.message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteSession, isDeleting, error };
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
