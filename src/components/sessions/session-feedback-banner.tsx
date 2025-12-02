"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Filter, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SessionFeedbackBannerProps {
  count: number;
  isFilterActive?: boolean;
  onShowFeedbackSessions: () => void;
  onClearFilter?: () => void;
  className?: string;
}

export function SessionFeedbackBanner({
  count,
  isFilterActive = false,
  onShowFeedbackSessions,
  onClearFilter,
  className,
}: SessionFeedbackBannerProps) {
  if (count === 0 && !isFilterActive) {
    return null;
  }

  // When filter is active, show "filtered" state
  if (isFilterActive) {
    return (
      <Alert
        className={cn(
          "flex items-center justify-between border-yellow-300 bg-yellow-100/70 dark:border-yellow-800 dark:bg-yellow-950/40",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Showing {count} session{count !== 1 ? "s" : ""} needing feedback
          </span>
        </div>
        {onClearFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilter}
            className="border-yellow-400 text-yellow-700 hover:bg-yellow-200 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900"
          >
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
            Clear Filter
          </Button>
        )}
      </Alert>
    );
  }

  return (
    <Alert
      className={cn(
        "flex items-center justify-between border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        <span className="text-sm text-yellow-800 dark:text-yellow-200">
          {count} session{count !== 1 ? "s" : ""} need{count === 1 ? "s" : ""} your feedback
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onShowFeedbackSessions}
        className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-950"
      >
        Show These
      </Button>
    </Alert>
  );
}
