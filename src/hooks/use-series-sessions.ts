"use client";

import useSWR, { mutate } from "swr";
import type { Session } from "@/types/schema";
import type { SeriesScope } from "@/types/recurring";
import { toast } from "sonner";

interface SeriesInfo {
  count: number;
  firstSession: Session | null;
  lastSession: Session | null;
  upcomingCount: number;
  pastCount: number;
}

interface SeriesResponse {
  seriesId: string;
  sessions: Session[];
  info: SeriesInfo;
}

/**
 * Fetcher for series data
 */
async function fetchSeries(url: string): Promise<SeriesResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch series sessions");
  }
  return response.json();
}

/**
 * Hook to fetch sessions in a series
 */
export function useSeriesSessions(seriesId: string | null | undefined) {
  const { data, error, isLoading, mutate: mutateSeries } = useSWR<SeriesResponse>(
    seriesId ? `/api/sessions/series/${seriesId}` : null,
    fetchSeries,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    sessions: data?.sessions || [],
    info: data?.info || null,
    isLoading,
    error,
    mutate: mutateSeries,
  };
}

/**
 * Hook to update sessions in a series
 */
export function useUpdateSeriesSessions() {
  const updateSeries = async (
    seriesId: string,
    sessionId: string,
    updates: Partial<Session>,
    scope: SeriesScope
  ): Promise<{ updatedCount: number } | null> => {
    try {
      const response = await fetch(
        `/api/sessions/series/${seriesId}?scope=${scope}&sessionId=${sessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update sessions");
      }

      const data = await response.json();

      // Invalidate caches
      await mutate(
        (key) =>
          Array.isArray(key) &&
          (key[0]?.includes("/sessions") || key[0]?.includes(`/series/${seriesId}`)),
        undefined,
        { revalidate: true }
      );

      toast.success(`Updated ${data.updatedCount} session(s)`);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update sessions");
      toast.error(error.message);
      return null;
    }
  };

  return { updateSeries };
}

/**
 * Hook to delete sessions in a series
 */
export function useDeleteSeriesSessions() {
  const deleteSeries = async (
    seriesId: string,
    sessionId: string,
    scope: SeriesScope
  ): Promise<{ deletedCount: number } | null> => {
    try {
      const response = await fetch(
        `/api/sessions/series/${seriesId}?scope=${scope}&sessionId=${sessionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete sessions");
      }

      const data = await response.json();

      // Invalidate caches
      await mutate(
        (key) =>
          Array.isArray(key) &&
          (key[0]?.includes("/sessions") || key[0]?.includes(`/series/${seriesId}`)),
        undefined,
        { revalidate: true }
      );

      toast.success(`Deleted ${data.deletedCount} session(s)`);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete sessions");
      toast.error(error.message);
      return null;
    }
  };

  return { deleteSeries };
}

/**
 * Get position of a session within its series
 */
export function getSessionPositionInSeries(
  session: Session,
  seriesSessions: Session[]
): { position: number; total: number } | null {
  if (!session.seriesId || seriesSessions.length === 0) {
    return null;
  }

  const sortedSessions = [...seriesSessions].sort(
    (a, b) =>
      new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime()
  );

  const position = sortedSessions.findIndex((s) => s.id === session.id) + 1;

  return position > 0
    ? { position, total: sortedSessions.length }
    : null;
}
