"use client";

import useSWR from "swr";
import type { EmailJob, EmailJobStatus } from "@/lib/notifications/job-types";

interface SessionEmailsResponse {
  success: boolean;
  sessionId: string;
  jobs: EmailJob[];
  total: number;
  summary: {
    pending: number;
    scheduled: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

/**
 * Fetcher for session email jobs
 */
async function fetcher(url: string): Promise<SessionEmailsResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch email jobs");
  }
  return response.json();
}

/**
 * Hook to fetch email jobs for a session
 * @param sessionId - Session ID to fetch jobs for
 */
export function useSessionEmailJobs(sessionId?: string) {
  const { data, error, isLoading, mutate } = useSWR<SessionEmailsResponse>(
    sessionId ? `/api/sessions/${sessionId}/emails` : null,
    fetcher,
    {
      // Refresh every 30 seconds if there are pending/scheduled jobs
      refreshInterval: (latestData) => {
        if (!latestData?.summary) return 0;
        const { pending, scheduled, processing } = latestData.summary;
        // Poll more frequently if jobs are in progress
        if (processing > 0) return 5000;
        if (pending > 0 || scheduled > 0) return 30000;
        return 0; // Don't poll if all jobs are terminal
      },
      revalidateOnFocus: true,
    }
  );

  /**
   * Cancel a specific email job
   */
  const cancelJob = async (jobId: string): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/emails?jobId=${jobId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel email");
      }

      // Revalidate after cancellation
      await mutate();
      return true;
    } catch (error) {
      console.error("Failed to cancel email job:", error);
      return false;
    }
  };

  /**
   * Retry a failed email job
   */
  const retryJob = async (jobId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/admin/emails/${jobId}/retry`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to retry email");
      }

      // Revalidate after retry
      await mutate();
      return true;
    } catch (error) {
      console.error("Failed to retry email job:", error);
      return false;
    }
  };

  /**
   * Retry all failed email jobs for this session
   */
  const retryAllFailed = async (): Promise<{ retried: number; failed: number; total: number }> => {
    if (!sessionId) return { retried: 0, failed: 0, total: 0 };

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/emails`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to retry emails");
      }

      const result = await response.json();

      // Revalidate after retry
      await mutate();
      return { retried: result.retried, failed: result.failed, total: result.total };
    } catch (error) {
      console.error("Failed to retry all failed email jobs:", error);
      throw error;
    }
  };

  return {
    jobs: data?.jobs || [],
    summary: data?.summary || {
      pending: 0,
      scheduled: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    },
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
    cancelJob,
    retryJob,
    retryAllFailed,
  };
}

/**
 * Helper to get human-readable status label
 */
export function getStatusLabel(status: EmailJobStatus): string {
  const labels: Record<EmailJobStatus, string> = {
    pending: "Pending",
    scheduled: "Scheduled",
    processing: "Sending",
    completed: "Sent",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

/**
 * Helper to get status badge variant
 */
export function getStatusVariant(
  status: EmailJobStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "pending":
    case "scheduled":
      return "secondary";
    case "processing":
      return "outline";
    case "failed":
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

/**
 * Helper to get email type label
 */
export function getEmailTypeLabel(type: EmailJob["type"]): string {
  const labels: Record<EmailJob["type"], string> = {
    prep48h: "48h Prep Reminder",
    prep24h: "24h Prep Reminder",
    mentorPrep: "Mentor Prep",
    feedback: "Feedback Reminder",
    feedbackImmediate: "Immediate Feedback",
  };
  return labels[type] || type;
}
