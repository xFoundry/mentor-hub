"use client";

import { Button } from "@/components/ui/button";
import { Lock, ExternalLink, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlurredMeetingLinkProps {
  meetingUrl?: string | null;
  isLocked: boolean;
  onPrepare?: () => void;
  className?: string;
}

/**
 * Meeting link component that shows a blurred/locked state for students
 * who haven't submitted their meeting prep yet.
 *
 * - When unlocked: Shows normal meeting link button
 * - When locked: Shows blurred overlay with message to submit prep
 */
export function BlurredMeetingLink({
  meetingUrl,
  isLocked,
  onPrepare,
  className,
}: BlurredMeetingLinkProps) {
  if (!meetingUrl) {
    return <p className="text-sm text-muted-foreground">No meeting link set</p>;
  }

  // Unlocked: show normal link
  if (!isLocked) {
    return (
      <Button variant="outline" size="sm" asChild className={cn("w-full", className)}>
        <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          Join Meeting
        </a>
      </Button>
    );
  }

  // Locked: show blurred overlay with message
  return (
    <div className={cn("relative min-h-[100px]", className)}>
      {/* Blurred background layer */}
      <div className="absolute inset-0 backdrop-blur-sm bg-slate-100/50 dark:bg-slate-900/50 rounded-lg z-10" />

      {/* Underlying content (blurred and non-interactive) */}
      <div className="opacity-30 pointer-events-none select-none p-4">
        <Button variant="outline" size="sm" className="w-full" disabled>
          <ExternalLink className="mr-2 h-4 w-4" />
          Join Meeting
        </Button>
      </div>

      {/* Overlay message */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Meeting link locked
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Submit your meeting prep to unlock
          </p>
          {onPrepare && (
            <Button size="sm" onClick={onPrepare} className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Submit Prep
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
