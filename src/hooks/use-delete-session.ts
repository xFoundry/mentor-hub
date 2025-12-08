"use client";

import { useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";

/**
 * Hook to delete a session (staff only)
 * Uses API route to ensure email cancellation happens server-side
 */
export function useDeleteSession() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteSession = async (sessionId: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      // Call API route (handles session deletion + email cancellation)
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete session");
      }

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
