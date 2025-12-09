"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Repeat, Calendar, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Session } from "@/types/schema";
import { useSeriesSessions, getSessionPositionInSeries } from "@/hooks/use-series-sessions";
import { formatAsEastern } from "@/lib/timezone";
import { cn } from "@/lib/utils";

interface SeriesIndicatorProps {
  session: Session;
  /** Whether to show the full badge or just an icon */
  variant?: "badge" | "icon";
  /** Size of the indicator */
  size?: "sm" | "md";
}

/**
 * Indicator showing that a session is part of a recurring series
 * Click to view all sessions in the series
 */
export function SeriesIndicator({
  session,
  variant = "badge",
  size = "sm",
}: SeriesIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { sessions, isLoading } = useSeriesSessions(isOpen ? session.seriesId : null);

  // Don't render if not part of a series
  if (!session.seriesId) {
    return null;
  }

  const position = sessions.length > 0
    ? getSessionPositionInSeries(session, sessions)
    : null;

  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    size === "sm" ? "h-6 w-6" : "h-8 w-8"
                  )}
                >
                  <Repeat className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
                </Button>
              </DialogTrigger>
              <SeriesDialogContent
                session={session}
                sessions={sessions}
                isLoading={isLoading}
                onClose={() => setIsOpen(false)}
              />
            </Dialog>
          </TooltipTrigger>
          <TooltipContent>
            Part of recurring series
            {position && ` (${position.position} of ${position.total})`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer hover:bg-accent gap-1.5 transition-colors",
            "border-blue-200 bg-blue-50/50 text-blue-700",
            "dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
            size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"
          )}
        >
          <Repeat className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Recurring
          {position && (
            <span className="text-muted-foreground">
              ({position.position}/{position.total})
            </span>
          )}
        </Badge>
      </DialogTrigger>
      <SeriesDialogContent
        session={session}
        sessions={sessions}
        isLoading={isLoading}
        onClose={() => setIsOpen(false)}
      />
    </Dialog>
  );
}

/**
 * Dialog content showing all sessions in the series
 */
function SeriesDialogContent({
  session,
  sessions,
  isLoading,
  onClose,
}: {
  session: Session;
  sessions: Session[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const now = new Date();
  const sortedSessions = [...sessions].sort(
    (a, b) =>
      new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime()
  );

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Recurring Series
        </DialogTitle>
        <DialogDescription>
          {sessions.length} sessions in this series
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">
          Loading sessions...
        </div>
      ) : (
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-1">
            {sortedSessions.map((s, index) => {
              const sessionDate = new Date(s.scheduledStart!);
              const isPast = sessionDate < now;
              const isCurrent = s.id === session.id;

              return (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-2.5 transition-colors",
                    "hover:bg-accent",
                    isCurrent && "bg-accent/50 ring-1 ring-primary/20"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                      isPast
                        ? "bg-muted text-muted-foreground"
                        : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                    )}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span
                        className={cn(
                          "text-sm",
                          isPast && "text-muted-foreground"
                        )}
                      >
                        {formatAsEastern(s.scheduledStart!, "EEE, MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatAsEastern(s.scheduledStart!, "h:mm a")}
                      {s.status && s.status !== "Scheduled" && (
                        <span className="ml-2">• {s.status}</span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </DialogContent>
  );
}

/**
 * Compact series info for use in lists/cards
 */
export function SeriesInfoCompact({ session }: { session: Session }) {
  if (!session.seriesId) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Repeat className="h-3 w-3" />
      <span>Recurring</span>
    </div>
  );
}
