"use client";

import Link from "next/link";
import { Video, MapPin, Calendar, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { isToday, isTomorrow, differenceInDays } from "date-fns";
import { parseAsLocalTime, getMentorParticipants, getLeadMentor } from "@/components/sessions/session-transformers";
import { formatAsEastern, TIMEZONE_ABBR } from "@/lib/timezone";
import { MentorAvatarStack } from "@/components/shared/mentor-avatar-stack";
import type { Session } from "@/types/schema";

interface NextSessionCardProps {
  session: Session;
  /** Whether current user is a mentor */
  isMentor?: boolean;
  className?: string;
}

/**
 * Prominent card displaying the next upcoming session
 * Shows session details with easy access to join/view
 */
export function NextSessionCard({
  session,
  isMentor = false,
  className,
}: NextSessionCardProps) {
  const mentors = getMentorParticipants(session);
  const leadMentor = getLeadMentor(session);
  const teamName = session.team?.[0]?.teamName;
  const sessionType = session.sessionType || "Session";
  const isInPerson = session.meetingPlatform === "In-Person";
  const hasMeetingUrl = !!session.meetingUrl;
  const duration = session.duration || 60;

  // Parse and format date/time
  const startTime = session.scheduledStart ? parseAsLocalTime(session.scheduledStart) : null;

  // Get relative date label
  const getDateLabel = () => {
    if (!startTime) return "";
    if (isToday(startTime)) return "Today";
    if (isTomorrow(startTime)) return "Tomorrow";
    const daysAway = differenceInDays(startTime, new Date());
    if (daysAway <= 7) return session.scheduledStart ? formatAsEastern(session.scheduledStart, "EEEE") : ""; // Day name
    return session.scheduledStart ? formatAsEastern(session.scheduledStart, "MMM d") : ""; // Month day
  };

  // Get formatted time with timezone
  const timeDisplay = session.scheduledStart ? `${formatAsEastern(session.scheduledStart, "h:mm a")} ${TIMEZONE_ABBR}` : "";
  const dateLabel = getDateLabel();

  // Display the other party based on user type
  const getOtherPartyText = () => {
    if (isMentor) {
      return `with team ${teamName || ""}`;
    }
    if (mentors.length === 0) {
      return "";
    }
    if (mentors.length === 1) {
      return `with ${leadMentor?.fullName || "mentor"}`;
    }
    return `with ${leadMentor?.fullName || "mentor"} +${mentors.length - 1}`;
  };

  // Get avatar info (for single mentor or lead mentor)
  const avatarUrl = leadMentor?.headshot?.[0]?.url;
  const avatarInitials = leadMentor?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "M";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Next Session
          </CardTitle>
          {dateLabel && (
            <Badge variant="secondary" className="font-normal">
              {dateLabel}, {timeDisplay}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session info row */}
        <div className="flex items-center gap-3">
          {!isMentor && mentors.length > 0 && (
            mentors.length === 1 ? (
              <Avatar className="h-12 w-12 border">
                <AvatarImage src={avatarUrl} alt={leadMentor?.fullName} />
                <AvatarFallback>{avatarInitials}</AvatarFallback>
              </Avatar>
            ) : (
              <MentorAvatarStack
                session={session}
                size="lg"
                maxDisplay={3}
              />
            )
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg leading-tight">{sessionType}</p>
            <p className="text-sm text-muted-foreground truncate">
              {getOtherPartyText()}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {duration} min
            </div>
          </div>
        </div>

        {/* Agenda preview if available */}
        {session.agenda && (
          <p className="text-sm text-muted-foreground line-clamp-2 border-l-2 border-muted pl-3">
            {session.agenda}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {isInPerson ? (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/sessions/${session.id}`}>
                <MapPin className="mr-2 h-4 w-4" />
                See Location
              </Link>
            </Button>
          ) : hasMeetingUrl ? (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={session.meetingUrl!} target="_blank" rel="noopener noreferrer">
                <Video className="mr-2 h-4 w-4" />
                Join Meeting
              </a>
            </Button>
          ) : null}

          <Button variant="ghost" size="sm" className="flex-1" asChild>
            <Link href={`/sessions/${session.id}`}>
              View Details
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state when no upcoming sessions
 */
export function NoUpcomingSessionCard({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Next Session
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          No upcoming sessions scheduled
        </p>
        <Button variant="link" size="sm" className="mt-2 h-auto p-0" asChild>
          <Link href="/sessions">
            View all sessions
            <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
