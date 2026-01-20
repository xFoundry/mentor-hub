"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Video, ArrowRight } from "lucide-react";
import { isToday, isTomorrow, differenceInDays, isFuture } from "date-fns";
import { parseAsLocalTime, getLeadMentor, isCurrentUserMentor } from "@/components/sessions/session-transformers";
import { formatAsEastern, TIMEZONE_ABBR } from "@/lib/timezone";
import type { Session } from "@/types/schema";

interface UpcomingSessionsCardProps {
  sessions: Session[];
  isLoading?: boolean;
  showViewAll?: boolean;
  teamId?: string;
  /** Current user's email - used to prioritize mentor's own sessions */
  currentUserEmail?: string;
  /** User type - determines action button visibility */
  userType?: "student" | "mentor" | "staff";
}

export function UpcomingSessionsCard({
  sessions,
  isLoading = false,
  showViewAll = true,
  teamId,
  currentUserEmail,
  userType,
}: UpcomingSessionsCardProps) {
  // Get upcoming sessions, prioritizing current user's sessions if they're a mentor
  const { nextSession, isUserSession } = useMemo(() => {
    const futureSessions = sessions
      .filter((s: Session) => {
        if (!s.scheduledStart) return false;
        // Only show sessions that are scheduled AND in the future
        // Cancelled sessions should not be shown
        if (s.status === "Cancelled" || s.status === "No-Show") return false;
        try {
          return isFuture(parseAsLocalTime(s.scheduledStart));
        } catch {
          return false;
        }
      })
      .sort((a: Session, b: Session) => {
        const dateA = new Date(a.scheduledStart!).getTime();
        const dateB = new Date(b.scheduledStart!).getTime();
        return dateA - dateB;
      });

    // If currentUserEmail is provided, check if user has their own upcoming sessions
    if (currentUserEmail) {
      const userSessions = futureSessions.filter((s) =>
        isCurrentUserMentor(s, currentUserEmail)
      );

      if (userSessions.length > 0) {
        // User has their own sessions - show their next one
        return { nextSession: userSessions[0], isUserSession: true };
      }
    }

    // No user-specific sessions or no email provided - show team's next session
    return { nextSession: futureSessions[0] || null, isUserSession: false };
  }, [sessions, currentUserEmail]);

  // Get relative date label
  const getDateLabel = (dateStr: string) => {
    const date = parseAsLocalTime(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    const daysUntil = differenceInDays(date, new Date());
    if (daysUntil > 0 && daysUntil <= 7) return `In ${daysUntil} days`;
    return formatAsEastern(dateStr, "EEEE, MMM d");
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Next Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-10 bg-muted rounded w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Next Session
          </CardTitle>
          <CardDescription>No upcoming sessions scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Check back later for your next mentorship session.
          </p>
        </CardContent>
      </Card>
    );
  }

  const mentor = getLeadMentor(nextSession);
  const mentorInitials = mentor?.fullName
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "M";

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Next Session
          </CardTitle>
          {nextSession?.scheduledStart && (
            <Badge variant="secondary" className="text-xs">
              {getDateLabel(nextSession.scheduledStart)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={mentor?.headshot?.[0]?.url} alt={mentor?.fullName} />
            <AvatarFallback>{mentorInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-lg">
              {nextSession?.sessionType || "Mentorship Session"}
            </h3>
            <p className="text-muted-foreground">
              with {mentor?.fullName || "Your Mentor"}
            </p>
          </div>
        </div>

        {/* Time info */}
        {nextSession?.scheduledStart && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4" />
              <span className="font-medium">
                {formatAsEastern(nextSession.scheduledStart, "h:mm a")} {TIMEZONE_ABBR}
              </span>
              {nextSession?.duration && (
                <span className="text-muted-foreground">
                  ({nextSession.duration} min)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Agenda preview */}
        {nextSession?.agenda && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {nextSession.agenda}
          </p>
        )}

        {/* Action buttons - show for students/staff always, mentors only for their sessions */}
        {(userType === "student" || userType === "staff" || isUserSession) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
            {nextSession?.meetingUrl && (
              <Button asChild className="w-full sm:w-auto">
                <a
                  href={nextSession.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Video className="mr-2 h-4 w-4" />
                  Join Meeting
                </a>
              </Button>
            )}
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href={`/sessions/${nextSession.id}`}>
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* View all link */}
        {showViewAll && nextSession && (
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/sessions">
                View all sessions
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
