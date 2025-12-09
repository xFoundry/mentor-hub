"use client";

/**
 * Job Progress Overlay
 *
 * Semi-transparent overlay showing job progress on cards.
 * Used for inline integration on session cards or other components.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useSessionJobProgress, useBatchJobProgress } from "@/contexts/job-status-context";
import { cn } from "@/lib/utils";
import type { JobProgress, EmailJob } from "@/lib/notifications/job-types";

interface JobProgressOverlayProps {
  /** Session ID to show progress for */
  sessionId?: string;
  /** Batch ID to show progress for */
  batchId?: string;
  /** Children to wrap with overlay */
  children: React.ReactNode;
  /** Additional class names for the wrapper */
  className?: string;
  /** Show overlay only when jobs are active */
  showOnlyWhenActive?: boolean;
}

/**
 * Overlay wrapper that shows job progress on top of children
 */
export function JobProgressOverlay({
  sessionId,
  batchId,
  children,
  className,
  showOnlyWhenActive = true,
}: JobProgressOverlayProps) {
  const sessionProgress = useSessionJobProgress(sessionId || null);
  const batchProgress = useBatchJobProgress(batchId || null);

  const progress = batchId ? batchProgress.progress : sessionProgress.progress;

  // Don't show overlay if no progress or if configured to only show when active
  const isActive = progress && (progress.status === "pending" || progress.status === "in_progress");
  const shouldShowOverlay = progress && (!showOnlyWhenActive || isActive);

  return (
    <div className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {shouldShowOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10"
          >
            <OverlayContent progress={progress} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Content displayed in the overlay
 */
function OverlayContent({ progress }: { progress: JobProgress }) {
  const [showDetails, setShowDetails] = useState(false);

  const progressPercent = Math.round(
    ((progress.completed + progress.failed + progress.cancelled) / progress.total) * 100
  );

  const isComplete = progress.status === "completed" || progress.status === "failed" || progress.status === "partial_failure";
  const hasErrors = progress.failed > 0;
  const isPending = progress.status === "pending";
  const isInProgress = progress.status === "in_progress";

  return (
    <div className="text-center p-4 max-w-[200px]">
      {/* Status icon */}
      <div className="mb-2">
        {isPending && (
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Mail className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {isInProgress && (
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}
        {isComplete && !hasErrors && (
          <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
        )}
        {isComplete && hasErrors && (
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="text-sm font-medium mb-2">
        {isPending && "Emails Queued"}
        {isInProgress && "Sending Emails"}
        {isComplete && !hasErrors && "Emails Sent"}
        {isComplete && hasErrors && "Partial Failure"}
      </div>

      {/* Progress indicator */}
      {!isComplete && (
        <div className="space-y-1 mb-2">
          <Progress value={progressPercent} className="h-1.5" />
          <div className="text-xs text-muted-foreground">
            {progress.completed}/{progress.total}
          </div>
        </div>
      )}

      {/* Summary badges */}
      {isComplete && (
        <div className="flex justify-center gap-1 mb-2">
          {progress.completed > 0 && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {progress.completed} sent
            </Badge>
          )}
          {progress.failed > 0 && (
            <Badge variant="destructive" className="text-xs">
              {progress.failed} failed
            </Badge>
          )}
        </div>
      )}

      {/* Details button */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs h-7">
            <Info className="h-3 w-3 mr-1" />
            Details
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Status</DialogTitle>
            <DialogDescription>{progress.sessionName}</DialogDescription>
          </DialogHeader>
          <JobDetailsContent progress={progress} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Detailed job list for dialog
 */
function JobDetailsContent({ progress }: { progress: JobProgress }) {
  const jobs = progress.jobs || [];

  if (jobs.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        No job details available
      </div>
    );
  }

  // Group by type
  const groupedJobs: Record<string, EmailJob[]> = {};
  for (const job of jobs) {
    if (!groupedJobs[job.type]) {
      groupedJobs[job.type] = [];
    }
    groupedJobs[job.type].push(job);
  }

  const typeLabels: Record<string, string> = {
    prep48h: "48h Prep Reminder",
    prep24h: "24h Prep Reminder",
    mentorPrep: "Mentor Prep Reminder",
    feedback: "Feedback Request",
    feedbackImmediate: "Immediate Feedback",
  };

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {Object.entries(groupedJobs).map(([type, typeJobs]) => (
        <div key={type}>
          <h4 className="text-sm font-medium mb-2">{typeLabels[type] || type}</h4>
          <div className="space-y-1">
            {typeJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between text-sm py-2 px-3 rounded-md bg-muted/50"
              >
                <span className="truncate max-w-[200px]">{job.recipientEmail}</span>
                <div className="flex items-center gap-2">
                  <JobStatusIndicator status={job.status} />
                  {job.lastError && (
                    <span className="text-xs text-red-500 truncate max-w-[100px]" title={job.lastError}>
                      {job.lastError}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Status indicator for individual jobs
 */
function JobStatusIndicator({ status }: { status: string }) {
  const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    pending: {
      icon: <Mail className="h-3.5 w-3.5" />,
      label: "Pending",
      className: "text-muted-foreground",
    },
    scheduled: {
      icon: <Mail className="h-3.5 w-3.5" />,
      label: "Scheduled",
      className: "text-blue-500",
    },
    processing: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: "Sending",
      className: "text-blue-500",
    },
    completed: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Sent",
      className: "text-green-500",
    },
    failed: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Failed",
      className: "text-red-500",
    },
    cancelled: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Cancelled",
      className: "text-muted-foreground",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className={cn("flex items-center gap-1", config.className)}>
      {config.icon}
      <span className="text-xs">{config.label}</span>
    </div>
  );
}

/**
 * Export components index
 */
export { JobProgressOverlay as default };
