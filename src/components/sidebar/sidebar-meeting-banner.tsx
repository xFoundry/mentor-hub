"use client";

import Link from "next/link";
import { Video, MapPin, Clock, Radio, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSidebarSession } from "@/hooks/use-sidebar-session";
import { useSidebar } from "@/components/ui/sidebar";
import type { Session } from "@/types/schema";

interface SidebarMeetingBannerProps {
  userEmail: string;
}

/**
 * Sidebar banner showing current or next session
 * Displays above the sidebar footer for students and mentors
 */
export function SidebarMeetingBanner({ userEmail }: SidebarMeetingBannerProps) {
  const { state } = useSidebar();
  const {
    displaySession,
    phase,
    phaseConfig,
    isLive,
    isStartingSoon,
    timeUntilStart,
    isLoading,
  } = useSidebarSession(userEmail);

  // Hide when sidebar is collapsed
  if (state === "collapsed") {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  // No session to display
  if (!displaySession) {
    return null;
  }

  const isInPerson = displaySession.meetingPlatform === "In-Person";
  const hasMeetingUrl = !!displaySession.meetingUrl;
  const mentorName = displaySession.mentor?.[0]?.fullName || "Mentor";
  const sessionType = displaySession.sessionType || "Session";

  // Determine border color based on phase
  const borderColorClass = isLive
    ? "border-l-green-500"
    : isStartingSoon
    ? "border-l-amber-500"
    : "border-l-blue-500";

  return (
    <div className="px-3 py-2">
      <Link
        href={`/sessions/${displaySession.id}`}
        className={cn(
          "block rounded-lg border border-l-4 p-3 transition-colors hover:bg-accent/50",
          borderColorClass,
          phaseConfig.bgColor
        )}
      >
        {/* Phase indicator */}
        <div className="mb-2 flex items-center gap-2">
          {isLive ? (
            <>
              <LiveDot />
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                Live Now
              </span>
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {isStartingSoon ? `Starts in ${timeUntilStart}` : "Next Session"}
              </span>
            </>
          )}
        </div>

        {/* Session info */}
        <div className="mb-2">
          <p className="font-medium text-sm leading-tight">{sessionType}</p>
          <p className="text-xs text-muted-foreground">with {mentorName}</p>
        </div>

        {/* Action button */}
        {isLive || isStartingSoon ? (
          <SessionActionButton
            session={displaySession}
            isLive={isLive}
            isInPerson={isInPerson}
            hasMeetingUrl={hasMeetingUrl}
          />
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>View details</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </Link>
    </div>
  );
}

/**
 * Animated live indicator dot
 */
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
    </span>
  );
}

/**
 * Action button for joining meeting or viewing location
 */
function SessionActionButton({
  session,
  isLive,
  isInPerson,
  hasMeetingUrl,
}: {
  session: Session;
  isLive: boolean;
  isInPerson: boolean;
  hasMeetingUrl: boolean;
}) {
  // For in-person meetings, link to session detail for location info
  if (isInPerson) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs"
        asChild
        onClick={(e) => e.stopPropagation()}
      >
        <Link href={`/sessions/${session.id}`}>
          <MapPin className="mr-1.5 h-3 w-3" />
          See Location
        </Link>
      </Button>
    );
  }

  // For online meetings with URL
  if (hasMeetingUrl) {
    return (
      <Button
        variant={isLive ? "default" : "outline"}
        size="sm"
        className={cn(
          "w-full h-8 text-xs",
          isLive && "bg-green-600 hover:bg-green-700"
        )}
        asChild
        onClick={(e) => e.stopPropagation()}
      >
        <a href={session.meetingUrl!} target="_blank" rel="noopener noreferrer">
          <Video className="mr-1.5 h-3 w-3" />
          Join Meeting
        </a>
      </Button>
    );
  }

  // No meeting URL yet
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span>View details</span>
      <ChevronRight className="h-3 w-3" />
    </div>
  );
}
