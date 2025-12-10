"use client";

/**
 * Email Job Status Card
 *
 * Displays progress for email scheduling jobs.
 * Shows at the top of the page when emails are being scheduled.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
} from "lucide-react";
import { useBatchJobProgress, useJobStatus } from "@/contexts/job-status-context";
import type { JobProgress } from "@/lib/notifications/job-types";
import { cn } from "@/lib/utils";

interface EmailJobStatusCardProps {
  /** Specific batch ID to show */
  batchId?: string;
  /** Position style */
  position?: "top" | "floating";
  /** Whether the card can be dismissed */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

/**
 * Status card for email job progress
 */
export function EmailJobStatusCard({
  batchId,
  position = "top",
  dismissible = true,
  onDismiss,
}: EmailJobStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { progress } = useBatchJobProgress(batchId || null);

  if (!progress || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const progressPercent = Math.round(
    ((progress.completed + progress.failed + progress.cancelled) / progress.total) * 100
  );

  const isComplete = progress.status === "completed" || progress.status === "failed" || progress.status === "partial_failure";
  const isScheduled = progress.status === "scheduled"; // Queued in QStash, waiting for delivery
  const hasErrors = progress.failed > 0;

  // Don't show the card for scheduled batches - they're just waiting for their delivery time
  // Only show when actively processing or complete
  if (isScheduled) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          position === "floating" && "fixed top-4 right-4 z-50 w-96 shadow-lg"
        )}
      >
        <Card className={cn(
          "border-l-4",
          isComplete && !hasErrors && "border-l-green-500",
          isComplete && hasErrors && "border-l-amber-500",
          !isComplete && "border-l-blue-500"
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isComplete && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                {isComplete && !hasErrors && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {isComplete && hasErrors && (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <CardTitle className="text-sm font-medium">
                  {!isComplete && "Scheduling Emails"}
                  {isComplete && !hasErrors && "Emails Scheduled"}
                  {isComplete && hasErrors && "Partially Scheduled"}
                </CardTitle>
              </div>
              {dismissible && isComplete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              {progress.sessionName}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="space-y-1">
                <Progress value={progressPercent} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {progress.completed + progress.failed + progress.cancelled} of {progress.total}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-1">
                {progress.completed > 0 && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {progress.completed} sent
                  </Badge>
                )}
                {progress.total - progress.completed - progress.failed - progress.cancelled > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Mail className="h-3 w-3 mr-1" />
                    {progress.total - progress.completed - progress.failed - progress.cancelled} pending
                  </Badge>
                )}
                {progress.failed > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    {progress.failed} failed
                  </Badge>
                )}
              </div>

              {/* Expandable details */}
              {progress.jobs && progress.jobs.length > 0 && (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between px-2 h-7">
                      <span className="text-xs">Details</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {progress.jobs.map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50"
                        >
                          <span className="truncate max-w-[180px]">
                            {job.recipientEmail}
                          </span>
                          <JobStatusBadge status={job.status} />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Small badge showing job status
 */
function JobStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case "failed":
      return <XCircle className="h-3 w-3 text-red-500" />;
    case "processing":
      return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
    case "scheduled":
      return <Mail className="h-3 w-3 text-blue-400" />;
    default:
      return <Mail className="h-3 w-3 text-muted-foreground" />;
  }
}

/**
 * Floating notification for all active jobs
 */
export function ActiveJobsNotification() {
  const { activeJobs } = useJobStatus();

  // Only show jobs that are actively processing (not "scheduled" - those are just waiting)
  // "scheduled" means jobs are queued in QStash waiting for their delivery time
  const activeProcessing = activeJobs.filter(
    job => job.status === "pending" || job.status === "in_progress"
  );

  if (activeProcessing.length === 0) {
    return null;
  }

  // Calculate totals
  const totalJobs = activeProcessing.reduce((sum, b) => sum + b.total, 0);
  const completedJobs = activeProcessing.reduce((sum, b) => sum + b.completed, 0);
  const progressPercent = Math.round((completedJobs / totalJobs) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <Card className="w-64 shadow-lg border-l-4 border-l-blue-500">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm font-medium">Scheduling Emails</span>
          </div>
          <Progress value={progressPercent} className="h-1.5 mb-1" />
          <div className="text-xs text-muted-foreground">
            {completedJobs} of {totalJobs} ({activeProcessing.length} sessions)
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
