"use client";

import { useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSessionEmailJobs,
  getStatusLabel,
  getStatusVariant,
  getEmailTypeLabel,
} from "@/hooks/use-session-email-jobs";
import type { EmailJob, EmailJobStatus } from "@/lib/notifications/job-types";

interface SessionEmailsTabProps {
  sessionId: string;
}

const STATUS_ICONS: Record<EmailJobStatus, typeof Clock> = {
  pending: Clock,
  scheduled: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: AlertTriangle,
  cancelled: Ban,
};

const STATUS_COLORS: Record<EmailJobStatus, string> = {
  pending: "text-slate-500",
  scheduled: "text-blue-500",
  processing: "text-amber-500",
  completed: "text-green-500",
  failed: "text-red-500",
  cancelled: "text-slate-400",
};

export function SessionEmailsTab({ sessionId }: SessionEmailsTabProps) {
  const { jobs, summary, total, isLoading, error, mutate, cancelJob } =
    useSessionEmailJobs(sessionId);

  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [confirmCancelJob, setConfirmCancelJob] = useState<EmailJob | null>(null);

  const handleCancelJob = async (job: EmailJob) => {
    setCancellingJobId(job.id);
    try {
      await cancelJob(job.id);
    } finally {
      setCancellingJobId(null);
      setConfirmCancelJob(null);
    }
  };

  // Calculate stats for display
  const pendingCount = summary.pending + summary.scheduled;
  const activeCount = summary.processing;
  const completedCount = summary.completed;
  const failedCount = summary.failed;
  const cancelledCount = summary.cancelled;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive/50 mb-4" />
          <p className="font-medium text-destructive">Failed to load emails</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message || "Unable to fetch email job data"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => mutate()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Email Notifications
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mutate()}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
          <CardDescription>
            Scheduled and sent email notifications for this session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-400">{cancelledCount}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Jobs Table */}
      {jobs.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <EmailJobRow
                    key={job.id}
                    job={job}
                    isCancelling={cancellingJobId === job.id}
                    onCancel={() => setConfirmCancelJob(job)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">No email notifications</p>
            <p className="text-sm text-muted-foreground mt-1">
              No scheduled emails found for this session
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={!!confirmCancelJob}
        onOpenChange={(open) => !open && setConfirmCancelJob(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the {getEmailTypeLabel(confirmCancelJob?.type || "prep24h")} email
              to <strong>{confirmCancelJob?.recipientEmail}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Scheduled</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCancelJob && handleCancelJob(confirmCancelJob)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Individual email job row
 */
function EmailJobRow({
  job,
  isCancelling,
  onCancel,
}: {
  job: EmailJob;
  isCancelling: boolean;
  onCancel: () => void;
}) {
  const StatusIcon = STATUS_ICONS[job.status];
  const statusColor = STATUS_COLORS[job.status];
  const canCancel = job.status === "pending" || job.status === "scheduled";

  const scheduledDate = new Date(job.scheduledFor);
  const isUpcoming = !isPast(scheduledDate);
  const timeDisplay = isUpcoming
    ? `In ${formatDistanceToNow(scheduledDate)}`
    : formatDistanceToNow(scheduledDate, { addSuffix: true });

  return (
    <TableRow>
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <StatusIcon
                  className={cn(
                    "h-4 w-4",
                    statusColor,
                    job.status === "processing" && "animate-spin"
                  )}
                />
                <Badge variant={getStatusVariant(job.status)}>
                  {getStatusLabel(job.status)}
                </Badge>
              </div>
            </TooltipTrigger>
            {job.lastError && (
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs text-destructive">{job.lastError}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell>
        <span className="text-sm">{getEmailTypeLabel(job.type)}</span>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{job.recipientName}</span>
          <span className="text-xs text-muted-foreground">{job.recipientEmail}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm">{format(scheduledDate, "MMM d, yyyy")}</span>
          <span className="text-xs text-muted-foreground">
            {format(scheduledDate, "h:mm a")} ({timeDisplay})
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {canCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isCancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <XCircle className="mr-1 h-4 w-4" />
                Cancel
              </>
            )}
          </Button>
        )}
        {job.status === "completed" && job.resendEmailId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground">
                  {job.resendEmailId.slice(0, 8)}...
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Resend ID: {job.resendEmailId}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
    </TableRow>
  );
}
