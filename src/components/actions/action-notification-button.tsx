"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Video,
  MessageSquare,
  ClipboardList,
  AlertCircle,
  CheckSquare,
  ChevronRight,
  Clock,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useActionItems } from "@/hooks/use-action-items";
import { formatDistanceToNow } from "date-fns";
import type { ActionItemVariant, ActionType, ActionPriority } from "@/types/actions";

/**
 * Icon mapping for action types
 */
const ACTION_ICONS: Record<ActionType, typeof Bell> = {
  "pre-meeting-prep": ClipboardList,
  "post-session-feedback": MessageSquare,
  "overdue-task": AlertCircle,
  "pending-task": CheckSquare,
  "meeting-starting-soon": Video,
};

/**
 * Color classes for action types
 */
const ACTION_COLORS: Record<ActionType, { bg: string; text: string; border: string }> = {
  "pre-meeting-prep": {
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  "post-session-feedback": {
    bg: "bg-amber-50 dark:bg-amber-950",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  "overdue-task": {
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  "pending-task": {
    bg: "bg-orange-50 dark:bg-orange-950",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
  },
  "meeting-starting-soon": {
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
};

/**
 * Priority indicator colors
 */
const PRIORITY_COLORS: Record<ActionPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-slate-400",
};

/**
 * Action Notification Button
 *
 * Header dropdown showing pending actions with badge count
 */
export function ActionNotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { actions, summary, urgentActions, isLoading, hasActions } = useActionItems();
  const router = useRouter();

  const handleActionClick = (action: ActionItemVariant) => {
    setIsOpen(false);

    // For meeting links, open in new tab if it's an external URL
    if (action.type === "meeting-starting-soon" && action.href.startsWith("http")) {
      window.open(action.href, "_blank");
    } else {
      router.push(action.href);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={`${summary.total} pending actions`}
              >
                <Bell className={cn(
                  "h-5 w-5 transition-colors",
                  hasActions && "text-foreground",
                  !hasActions && "text-muted-foreground"
                )} />

                {/* Badge count */}
                {hasActions && (
                  <span className={cn(
                    "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                    summary.urgent > 0 ? "bg-red-500" : "bg-primary"
                  )}>
                    {summary.total > 9 ? "9+" : summary.total}
                  </span>
                )}

                {/* Urgent pulse animation */}
                {summary.urgent > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 animate-ping opacity-75" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasActions
              ? `${summary.total} pending action${summary.total !== 1 ? "s" : ""}`
              : "No pending actions"
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        className="w-[380px] max-h-[min(550px,80vh)] p-0 overflow-hidden flex flex-col"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Actions</h3>
            {hasActions && (
              <Badge variant="secondary" className="text-xs text-foreground">
                {summary.total}
              </Badge>
            )}
          </div>
          {summary.urgent > 0 && (
            <Badge variant="destructive" className="text-xs">
              {summary.urgent} urgent
            </Badge>
          )}
        </div>

        {/* Actions list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : hasActions ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div>
              {/* Urgent actions first */}
              {urgentActions.length > 0 && (
                <div>
                  <div className="sticky top-0 z-10 bg-red-50 dark:bg-red-950/50 px-4 py-2 border-b border-red-100 dark:border-red-900">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
                      Urgent
                    </p>
                  </div>
                  <div className="divide-y">
                    {urgentActions.map((action) => (
                      <ActionItem
                        key={action.id}
                        action={action}
                        onClick={() => handleActionClick(action)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Non-urgent actions */}
              {actions.filter((a) => a.priority !== "urgent").length > 0 && (
                <div>
                  <div className={cn(
                    "sticky top-0 z-10 bg-muted px-4 py-2 border-b",
                    urgentActions.length > 0 && "border-t"
                  )}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {urgentActions.length > 0 ? "Other" : "Pending Actions"}
                    </p>
                  </div>
                  <div className="divide-y">
                    {actions
                      .filter((a) => a.priority !== "urgent")
                      .map((action) => (
                        <ActionItem
                          key={action.id}
                          action={action}
                          onClick={() => handleActionClick(action)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState />
        )}

        {/* Footer - sticky at bottom */}
        {hasActions && (
          <div className="shrink-0 bg-popover border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs"
                asChild
              >
                <Link href="/dashboard">
                  View all in Dashboard
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Individual action item in the dropdown
 */
function ActionItem({
  action,
  onClick,
}: {
  action: ActionItemVariant;
  onClick: () => void;
}) {
  const Icon = ACTION_ICONS[action.type];
  const colors = ACTION_COLORS[action.type];
  const isExternal = action.href.startsWith("http");

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-muted/50 focus:bg-muted/50 focus:outline-none",
        action.priority === "urgent" && "bg-red-50/50 dark:bg-red-950/20"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        colors.bg,
        colors.border,
        "border"
      )}>
        <Icon className={cn("h-4 w-4", colors.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{action.title}</p>
          {/* Priority indicator */}
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              PRIORITY_COLORS[action.priority]
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {action.description}
        </p>
        {/* Time indicator */}
        {action.dueAt && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {formatDueTime(action.dueAt)}
            </span>
          </div>
        )}
      </div>

      {/* Action indicator */}
      <div className="flex items-center shrink-0">
        {isExternal ? (
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </button>
  );
}

/**
 * Empty state when no actions
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">All caught up!</p>
      <p className="text-xs text-muted-foreground mt-1">
        No pending actions right now
      </p>
    </div>
  );
}

/**
 * Format due time for display
 */
function formatDueTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));

  // Future times
  if (diffMins > 0) {
    if (diffMins <= 60) {
      return `In ${diffMins} min`;
    }
    return formatDistanceToNow(date, { addSuffix: true });
  }

  // Past times (for feedback actions showing when session was)
  const absDiffMins = Math.abs(diffMins);
  if (absDiffMins <= 60) {
    return "Just now";
  }

  return formatDistanceToNow(date, { addSuffix: true });
}
