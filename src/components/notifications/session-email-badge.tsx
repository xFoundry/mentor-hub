"use client";

/**
 * Session Email Badge
 *
 * Small badge showing email scheduling status for a session.
 * Used in session cards and list views.
 */

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useSessionJobProgress } from "@/contexts/job-status-context";
import { cn } from "@/lib/utils";

interface SessionEmailBadgeProps {
  sessionId: string;
  /** Display variant */
  variant?: "badge" | "icon" | "text";
  /** Size */
  size?: "sm" | "md";
  /** Additional class names */
  className?: string;
}

/**
 * Badge showing email scheduling status for a session
 */
export function SessionEmailBadge({
  sessionId,
  variant = "badge",
  size = "sm",
  className,
}: SessionEmailBadgeProps) {
  const { progress, isLoaded } = useSessionJobProgress(sessionId);

  // Don't show anything if no jobs or still loading
  if (!isLoaded || !progress) {
    return null;
  }

  const isComplete = progress.status === "completed" || progress.status === "failed" || progress.status === "partial_failure";
  const hasErrors = progress.failed > 0;
  const isPending = progress.status === "pending";
  const isInProgress = progress.status === "in_progress";

  // For the text variant, show a simple status
  if (variant === "text") {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {isPending && "Emails queued"}
        {isInProgress && `Sending ${progress.completed}/${progress.total}`}
        {isComplete && !hasErrors && "Emails sent"}
        {isComplete && hasErrors && `${progress.failed} failed`}
      </span>
    );
  }

  // For the icon variant, show just an icon with tooltip
  if (variant === "icon") {
    const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex", className)}>
              {isPending && <Clock className={cn(iconClass, "text-muted-foreground")} />}
              {isInProgress && <Loader2 className={cn(iconClass, "animate-spin text-blue-500")} />}
              {isComplete && !hasErrors && <CheckCircle2 className={cn(iconClass, "text-green-500")} />}
              {isComplete && hasErrors && <AlertTriangle className={cn(iconClass, "text-amber-500")} />}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <EmailStatusTooltip progress={progress} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Badge variant (default)
  const badgeClass = cn(
    size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-0.5",
    "gap-1"
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {isPending && (
            <Badge variant="secondary" className={cn(badgeClass, className)}>
              <Clock className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
              Queued
            </Badge>
          )}
          {isInProgress && (
            <Badge variant="secondary" className={cn(badgeClass, "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", className)}>
              <Loader2 className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", "animate-spin")} />
              {progress.completed}/{progress.total}
            </Badge>
          )}
          {isComplete && !hasErrors && (
            <Badge variant="secondary" className={cn(badgeClass, "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", className)}>
              <CheckCircle2 className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
              Sent
            </Badge>
          )}
          {isComplete && hasErrors && (
            <Badge variant="secondary" className={cn(badgeClass, "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", className)}>
              <AlertTriangle className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
              {progress.failed} failed
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">
          <EmailStatusTooltip progress={progress} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Tooltip content showing detailed email status
 */
function EmailStatusTooltip({ progress }: { progress: NonNullable<ReturnType<typeof useSessionJobProgress>["progress"]> }) {
  const pending = progress.total - progress.completed - progress.failed - progress.cancelled;

  return (
    <div className="space-y-1">
      <div className="font-medium text-sm">Email Status</div>
      <div className="text-xs space-y-0.5">
        {progress.completed > 0 && (
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            {progress.completed} scheduled
          </div>
        )}
        {pending > 0 && (
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <Mail className="h-3 w-3" />
            {pending} pending
          </div>
        )}
        {progress.failed > 0 && (
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            {progress.failed} failed
          </div>
        )}
        {progress.cancelled > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <XCircle className="h-3 w-3" />
            {progress.cancelled} cancelled
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact email status for table views
 */
export function SessionEmailStatusCell({ sessionId }: { sessionId: string }) {
  const { progress, isLoaded } = useSessionJobProgress(sessionId);

  if (!isLoaded || !progress) {
    return <span className="text-muted-foreground">-</span>;
  }

  const isComplete = progress.status === "completed" || progress.status === "failed" || progress.status === "partial_failure";
  const hasErrors = progress.failed > 0;

  return (
    <div className="flex items-center gap-1">
      {progress.status === "pending" && (
        <>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Queued</span>
        </>
      )}
      {progress.status === "in_progress" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          <span className="text-xs">{progress.completed}/{progress.total}</span>
        </>
      )}
      {isComplete && !hasErrors && (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs text-green-600">{progress.completed}</span>
        </>
      )}
      {isComplete && hasErrors && (
        <>
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs text-amber-600">{progress.failed} failed</span>
        </>
      )}
    </div>
  );
}
