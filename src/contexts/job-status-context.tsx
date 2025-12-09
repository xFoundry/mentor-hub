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
const ACTIVE_POLL_INTERVAL = 3000; // 3 seconds

/** Polling interval when no active jobs */
const IDLE_POLL_INTERVAL = 30000; // 30 seconds

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

  const fetchJobStatus = useCallback(async () => {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (userId) {
        params.set("userId", userId);
      } else {
        params.set("active", "true");
      }

      // Also fetch any specifically tracked batches
      const trackedArray = Array.from(trackedBatches);

      const response = await fetch(`/api/jobs/status?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job status");
      }

      const data = await response.json();
      let batches: JobProgress[] = data.batches || [];

      // Fetch individually tracked batches that might not be in the user's active list
      for (const batchId of trackedArray) {
        const existing = batches.find(b => b.batchId === batchId);
        if (!existing) {
          const batchResponse = await fetch(`/api/jobs/status?batchId=${batchId}`);
          if (batchResponse.ok) {
            const batchData = await batchResponse.json();
            if (batchData.progress) {
              batches.push(batchData.progress);
            }
          }
        }
      }

      // Remove completed/failed batches from tracking after a delay
      const completedBatches = batches.filter(
        b => b.status === "completed" || b.status === "failed" || b.status === "partial_failure"
      );
      for (const batch of completedBatches) {
        // Keep completed batches visible for 5 seconds before removing from tracking
        setTimeout(() => {
          setTrackedBatches(prev => {
            const next = new Set(prev);
            next.delete(batch.batchId);
            return next;
          });
        }, 5000);
      }

      setActiveJobs(batches);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoaded(true);
    }
  }, [userId, trackedBatches]);

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
