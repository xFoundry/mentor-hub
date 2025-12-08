"use client";

import Link from "next/link";
import { Video, MapPin, ExternalLink, Clock, Radio, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { differenceInMinutes, addMinutes } from "date-fns";
import { parseAsLocalTime, getMentorParticipants, getLeadMentor } from "@/components/sessions/session-transformers";
import { formatAsEastern, TIMEZONE_ABBR } from "@/lib/timezone";
import { useNow } from "@/hooks/use-now";
import type { Session } from "@/types/schema";
import type { SessionPhase } from "@/hooks/use-session-phase";

interface LiveSessionBannerProps {
  session: Session;
  phase: SessionPhase;
  /** Whether current user is a mentor (affects messaging) */
  isMentor?: boolean;
  /** Whether the current student has submitted pre-meeting prep (only relevant for students) */
  hasSubmittedPrep?: boolean;
  className?: string;
}

/**
 * Prominent banner for live or starting-soon sessions
 * Displays at top of dashboard when action is needed
 */
export function LiveSessionBanner({
  session,
  phase,
  isMentor = false,
  hasSubmittedPrep = false,
  className,
}: LiveSessionBannerProps) {
  // Update time every 30 seconds - must be called before any early returns
  const now = useNow(30000);

  const isLive = phase === "during";
  const isStartingSoon = phase === "starting-soon";

  // Only show for live or starting-soon phases
  if (!isLive && !isStartingSoon) {
    return null;
  }

  // Get mentors using multi-mentor helpers
  const mentorParticipants = getMentorParticipants(session);
  const leadMentor = getLeadMentor(session);

  // Format mentor display: "Alex Smith" or "Alex Smith + 1 other"
  const mentorDisplay = (() => {
    if (mentorParticipants.length === 0) return "your mentor";
    const leadName = leadMentor?.fullName || mentorParticipants[0]?.contact?.fullName || "your mentor";
    const otherCount = mentorParticipants.length - 1;
    if (otherCount === 0) return leadName;
    if (otherCount === 1) return `${leadName} + 1 other`;
    return `${leadName} + ${otherCount} others`;
  })();

  const teamName = session.team?.[0]?.teamName;
  const sessionType = session.sessionType || "Session";
  const isInPerson = session.meetingPlatform === "In-Person";
  const hasMeetingUrl = !!session.meetingUrl;

  // Calculate time info
  const startTime = session.scheduledStart ? parseAsLocalTime(session.scheduledStart) : null;
  const duration = session.duration || 60;
  const endTime = startTime ? addMinutes(startTime, duration) : null;

  // Time until start or elapsed time
  const minutesUntilStart = startTime ? differenceInMinutes(startTime, now) : null;
  const minutesSinceStart = startTime ? differenceInMinutes(now, startTime) : null;
  const minutesUntilEnd = endTime ? differenceInMinutes(endTime, now) : null;

  // Display the other party based on user type
  const otherParty = isMentor ? teamName : mentorDisplay;
  const otherPartyLabel = isMentor ? "with team" : "with";

  return (
    <Alert
      className={cn(
        "border-l-4 [&>div]:col-span-full",
        isLive
          ? "border-l-green-500 bg-green-50 dark:bg-green-950/30"
          : "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Session info */}
        <div className="flex items-start gap-4">
          {/* Status indicator */}
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              isLive ? "bg-green-100 dark:bg-green-900/50" : "bg-amber-100 dark:bg-amber-900/50"
            )}
          >
            {isLive ? (
              <LiveDot size="lg" />
            ) : (
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          {/* Session details */}
          <div className="space-y-1">
            <AlertTitle className="mb-1 flex items-center gap-2">
              {isLive ? (
                <span className="text-green-700 dark:text-green-300">
                  You have a session in progress
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-300">
                  Your next session starts{" "}
                  {minutesUntilStart !== null && minutesUntilStart <= 60
                    ? `in ${minutesUntilStart} minute${minutesUntilStart !== 1 ? "s" : ""}`
                    : "soon"}
                </span>
              )}
            </AlertTitle>

            <AlertDescription className="text-foreground">
              <div className="flex flex-col gap-1">
                <span className="font-medium">
                  {sessionType} {otherPartyLabel} {otherParty}
                </span>
                <span className="text-sm text-muted-foreground">
                  {isLive ? (
                    <>
                      Started {minutesSinceStart} min ago
                      {minutesUntilEnd !== null && minutesUntilEnd > 0 && (
                        <> &middot; Ends in {minutesUntilEnd} min</>
                      )}
                    </>
                  ) : (
                    session.scheduledStart && (
                      <>
                        {formatAsEastern(session.scheduledStart, "h:mm a")} {TIMEZONE_ABBR} &middot; {duration} min
                      </>
                    )
                  )}
                </span>
              </div>
            </AlertDescription>
          </div>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          {isInPerson ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/sessions/${session.id}`}>
                <MapPin className="mr-2 h-4 w-4" />
                See Location
              </Link>
            </Button>
          ) : !isMentor && !hasSubmittedPrep ? (
            // Students without pre-meeting submission see "Submit Meeting Prep" button
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              className={cn(isLive && "bg-amber-600 hover:bg-amber-700")}
              asChild
            >
              <Link href={`/sessions/${session.id}?tab=preparation`}>
                <FileText className="mr-2 h-4 w-4" />
                Submit Meeting Prep
              </Link>
            </Button>
          ) : hasMeetingUrl ? (
            // Mentors or students with submitted prep see "Join Meeting" button
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              className={cn(isLive && "bg-green-600 hover:bg-green-700")}
              asChild
            >
              <a href={session.meetingUrl!} target="_blank" rel="noopener noreferrer">
                <Video className="mr-2 h-4 w-4" />
                Join Meeting
              </a>
            </Button>
          ) : null}

          <Button variant="ghost" size="sm" asChild>
            <Link href={`/sessions/${session.id}`}>
              View Details
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </Alert>
  );
}

/**
 * Animated live indicator dot
 */
function LiveDot({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <span className={cn("relative flex", sizeClasses[size])}>
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
        )}
      />
      <span
        className={cn(
          "relative inline-flex rounded-full bg-green-500",
          sizeClasses[size]
        )}
      />
    </span>
  );
}
