"use client";

/**
 * Job Status Context
 *
 * Provides real-time job progress tracking across the application.
 * Polls for active jobs and provides status to components.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { JobProgress } from "@/lib/notifications/job-types";

interface JobStatusContextValue {
  /** All active job batches */
  activeJobs: JobProgress[];
  /** Whether we're currently polling */
  isPolling: boolean;
  /** Whether the initial load is complete */
  isLoaded: boolean;
  /** Error from last poll attempt */
  error: string | null;
  /** Manually refresh job status */
  refreshJobs: () => Promise<void>;
  /** Track a new batch ID */
  trackBatch: (batchId: string) => void;
  /** Get progress for a specific session */
  getSessionProgress: (sessionId: string) => JobProgress | null;
  /** Get progress for a specific batch */
  getBatchProgress: (batchId: string) => JobProgress | null;
}

const JobStatusContext = createContext<JobStatusContextValue | null>(null);

/** Polling interval when jobs are active */
const ACTIVE_POLL_INTERVAL = 5000; // 5 seconds

/** Polling interval when no active jobs (or only checking globally) */
const IDLE_POLL_INTERVAL = 60000; // 60 seconds - reduced frequency to avoid Redis overload

interface JobStatusProviderProps {
  children: ReactNode;
  /** User ID for tracking their batches */
  userId?: string;
}

export function JobStatusProvider({ children, userId }: JobStatusProviderProps) {
  const [activeJobs, setActiveJobs] = useState<JobProgress[]>([]);
  const [trackedBatches, setTrackedBatches] = useState<Set<string>>(new Set());
  const [isPolling, setIsPolling] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which batches we've already scheduled for cleanup to avoid infinite loops
  const scheduledForCleanupRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const trackedFetchTimestampsRef = useRef<Map<string, number>>(new Map());

  const fetchJobStatus = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      // Build query params
      const params = new URLSearchParams();
      if (userId) {
        params.set("userId", userId);
      } else {
        params.set("active", "true");
      }

      const response = await fetch(`/api/jobs/status?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job status");
      }

      const data = await response.json();
      const batches: JobProgress[] = data.batches || [];

      // Fetch individually tracked batches that might not be in the user's active list
      // Use functional update to get current value without adding to dependencies
      setTrackedBatches(currentTracked => {
        const trackedArray = Array.from(currentTracked);
        // Schedule fetches for tracked batches not in results
        for (const batchId of trackedArray) {
          const existing = batches.find(b => b.batchId === batchId);
          if (!existing) {
            const lastFetch = trackedFetchTimestampsRef.current.get(batchId) ?? 0;
            const now = Date.now();
            if (now - lastFetch < 15000) {
              continue;
            }
            trackedFetchTimestampsRef.current.set(batchId, now);

            // Fetch async but don't block
            fetch(`/api/jobs/status?batchId=${batchId}`)
              .then(res => res.ok ? res.json() : null)
              .then(batchData => {
                if (batchData?.progress) {
                  setActiveJobs(prev => {
                    if (prev.find(b => b.batchId === batchId)) return prev;
                    return [...prev, batchData.progress];
                  });
                }
              })
              .catch(() => {});
          }
        }
        return currentTracked; // Don't modify
      });

      // Remove completed/failed batches from tracking after a delay
      // Only schedule cleanup once per batch to avoid infinite loops
      const completedBatches = batches.filter(
        b => b.status === "completed" || b.status === "failed" || b.status === "partial_failure"
      );
      for (const batch of completedBatches) {
        if (!scheduledForCleanupRef.current.has(batch.batchId)) {
          scheduledForCleanupRef.current.add(batch.batchId);
          // Keep completed batches visible for 5 seconds before removing from tracking
          setTimeout(() => {
            setTrackedBatches(prev => {
              const next = new Set(prev);
              next.delete(batch.batchId);
              return next;
            });
            scheduledForCleanupRef.current.delete(batch.batchId);
          }, 5000);
        }
      }

      setActiveJobs(batches);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      inFlightRef.current = false;
      setIsLoaded(true);
    }
  }, [userId]); // Removed trackedBatches from dependencies

  // Initial fetch
  useEffect(() => {
    fetchJobStatus();
  }, [fetchJobStatus]);

  // Polling logic
  useEffect(() => {
    const hasActiveJobs = activeJobs.some(
      job => job.status === "pending" || job.status === "in_progress"
    );

    const interval = hasActiveJobs ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL;

    setIsPolling(hasActiveJobs);

    const timer = setInterval(fetchJobStatus, interval);
    return () => clearInterval(timer);
  }, [activeJobs, fetchJobStatus]);

  const refreshJobs = useCallback(async () => {
    await fetchJobStatus();
  }, [fetchJobStatus]);

  const trackBatch = useCallback((batchId: string) => {
    setTrackedBatches(prev => new Set([...prev, batchId]));
    // Immediately fetch to get the new batch
    fetchJobStatus();
  }, [fetchJobStatus]);

  const getSessionProgress = useCallback((sessionId: string): JobProgress | null => {
    // Return the most recent batch for this session
    const sessionBatches = activeJobs.filter(b => b.sessionId === sessionId);
    if (sessionBatches.length === 0) return null;
    // Sort by most recent (pending/in_progress first, then by total)
    return sessionBatches.sort((a, b) => {
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return b.total - a.total;
    })[0];
  }, [activeJobs]);

  const getBatchProgress = useCallback((batchId: string): JobProgress | null => {
    return activeJobs.find(b => b.batchId === batchId) || null;
  }, [activeJobs]);

  return (
    <JobStatusContext.Provider
      value={{
        activeJobs,
        isPolling,
        isLoaded,
        error,
        refreshJobs,
        trackBatch,
        getSessionProgress,
        getBatchProgress,
      }}
    >
      {children}
    </JobStatusContext.Provider>
  );
}

/**
 * Hook to access job status context
 */
export function useJobStatus() {
  const context = useContext(JobStatusContext);
  if (!context) {
    throw new Error("useJobStatus must be used within a JobStatusProvider");
  }
  return context;
}

/**
 * Hook to get progress for a specific session
 */
export function useSessionJobProgress(sessionId: string | null) {
  const { getSessionProgress, isLoaded, isPolling } = useJobStatus();

  if (!sessionId) {
    return { progress: null, isLoaded, isPolling };
  }

  return {
    progress: getSessionProgress(sessionId),
    isLoaded,
    isPolling,
  };
}

/**
 * Hook to get progress for a specific batch
 */
export function useBatchJobProgress(batchId: string | null) {
  const { getBatchProgress, trackBatch, isLoaded, isPolling } = useJobStatus();

  // Track the batch when mounted
  useEffect(() => {
    if (batchId) {
      trackBatch(batchId);
    }
  }, [batchId, trackBatch]);

  if (!batchId) {
    return { progress: null, isLoaded, isPolling };
  }

  return {
    progress: getBatchProgress(batchId),
    isLoaded,
    isPolling,
  };
}
