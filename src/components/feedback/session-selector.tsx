"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Calendar, ChevronDown, Users, User, Check, Clock, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  parseAsLocalTime,
  isSessionEligibleForFeedback,
  SESSION_TYPE_CONFIG,
  type SessionType,
} from "@/components/sessions/session-transformers";
import type { Session } from "@/types/schema";
import type { UserType } from "@/types/schema";

interface SessionSelectorProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelect: (session: Session) => void;
  userType: UserType;
  userContactId?: string;
  isStaff?: boolean;
  disabled?: boolean;
}

interface SessionEligibility {
  eligible: boolean;
  reason?: string;
}

function getSessionEligibility(
  session: Session,
  userType: UserType,
  userContactId?: string,
  isStaff: boolean = false
): SessionEligibility {
  // Staff can select any session
  if (isStaff) {
    // Still check if they already submitted
    const feedback = session.feedback || [];
    const hasStaffFeedback = feedback.some(
      (f) => f.respondant?.[0]?.id === userContactId && f.role === "Mentor"
    );
    if (hasStaffFeedback) {
      return { eligible: true, reason: "You already submitted feedback (as Mentor)" };
    }
    return { eligible: true };
  }

  // Check session status
  if (session.status === "Cancelled" || session.status === "No-Show") {
    return { eligible: false, reason: `Session was ${session.status?.toLowerCase()}` };
  }

  // Check if session is in the past
  if (!isSessionEligibleForFeedback(session)) {
    return { eligible: false, reason: "Session hasn't occurred yet" };
  }

  // Check if user already submitted feedback
  const feedback = session.feedback || [];
  const targetRole = userType === "student" ? "Mentee" : "Mentor";
  const hasUserFeedback = feedback.some(
    (f) => f.respondant?.[0]?.id === userContactId && f.role === targetRole
  );

  if (hasUserFeedback) {
    return { eligible: false, reason: "You already submitted feedback" };
  }

  return { eligible: true };
}

function SessionItemContent({ session, userType }: { session: Session; userType: UserType }) {
  const date = session.scheduledStart ? parseAsLocalTime(session.scheduledStart) : null;
  const teamName = session.team?.[0]?.teamName;
  const mentorName = session.mentor?.[0]?.fullName;
  const sessionTypeConfig = SESSION_TYPE_CONFIG[session.sessionType as SessionType];

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            borderColor: sessionTypeConfig?.color,
            color: sessionTypeConfig?.color,
          }}
        >
          {session.sessionType}
        </Badge>
        {session.status && session.status !== "Scheduled" && (
          <Badge variant="secondary" className="text-xs">
            {session.status}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        {userType === "student" && mentorName && (
          <span className="text-foreground font-medium">{mentorName}</span>
        )}
        {userType !== "student" && teamName && (
          <span className="text-foreground font-medium">{teamName}</span>
        )}
        {date && (
          <span className="text-muted-foreground">
            {format(date, "MMM d, yyyy")} at {format(date, "h:mm a")}
          </span>
        )}
      </div>
    </div>
  );
}

export function SessionSelector({
  sessions,
  selectedSession,
  onSelect,
  userType,
  userContactId,
  isStaff = false,
  disabled = false,
}: SessionSelectorProps) {
  // Partition and sort sessions
  const { eligibleSessions, ineligibleSessions } = useMemo(() => {
    const eligible: Array<{ session: Session; eligibility: SessionEligibility }> = [];
    const ineligible: Array<{ session: Session; eligibility: SessionEligibility }> = [];

    for (const session of sessions) {
      const eligibility = getSessionEligibility(session, userType, userContactId, isStaff);
      if (eligibility.eligible && !eligibility.reason) {
        eligible.push({ session, eligibility });
      } else {
        ineligible.push({ session, eligibility });
      }
    }

    // Sort by date descending (most recent first)
    const sortByDate = (
      a: { session: Session },
      b: { session: Session }
    ) => {
      const dateA = a.session.scheduledStart
        ? parseAsLocalTime(a.session.scheduledStart).getTime()
        : 0;
      const dateB = b.session.scheduledStart
        ? parseAsLocalTime(b.session.scheduledStart).getTime()
        : 0;
      return dateB - dateA;
    };

    eligible.sort(sortByDate);
    ineligible.sort(sortByDate);

    return { eligibleSessions: eligible, ineligibleSessions: ineligible };
  }, [sessions, userType, userContactId, isStaff]);

  const selectedDate = selectedSession?.scheduledStart
    ? parseAsLocalTime(selectedSession.scheduledStart)
    : null;
  const selectedTeam = selectedSession?.team?.[0]?.teamName;
  const selectedMentor = selectedSession?.mentor?.[0]?.fullName;
  const selectedTypeConfig = selectedSession?.sessionType
    ? SESSION_TYPE_CONFIG[selectedSession.sessionType as SessionType]
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "w-full rounded-lg border bg-card p-4 text-left transition-colors",
            "hover:bg-accent hover:border-accent-foreground/20",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {selectedSession ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: selectedTypeConfig?.color,
                      color: selectedTypeConfig?.color,
                    }}
                  >
                    {selectedSession.sessionType}
                  </Badge>
                  {selectedSession.status && selectedSession.status !== "Scheduled" && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedSession.status}
                    </Badge>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {selectedDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(selectedDate, "MMM d, yyyy")} at {format(selectedDate, "h:mm a")}
                    </span>
                  </div>
                )}
                {selectedTeam && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{selectedTeam}</span>
                  </div>
                )}
                {selectedMentor && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{selectedMentor}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Select a session
                </div>
                <p className="text-sm text-muted-foreground">
                  Click to choose from your eligible sessions
                </p>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[400px] overflow-y-auto">
        {eligibleSessions.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Check className="h-3 w-3" />
              Needs Your Feedback
            </DropdownMenuLabel>
            {eligibleSessions.map(({ session }) => (
              <DropdownMenuItem
                key={session.id}
                onClick={() => onSelect(session)}
                className="cursor-pointer px-3 py-2"
              >
                <SessionItemContent session={session} userType={userType} />
              </DropdownMenuItem>
            ))}
          </>
        )}

        {ineligibleSessions.length > 0 && eligibleSessions.length > 0 && (
          <DropdownMenuSeparator />
        )}

        {ineligibleSessions.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Not Available
            </DropdownMenuLabel>
            {ineligibleSessions.map(({ session, eligibility }) => (
              <DropdownMenuItem
                key={session.id}
                disabled
                className="opacity-50 cursor-not-allowed px-3 py-2"
              >
                <div className="flex flex-col gap-1">
                  <SessionItemContent session={session} userType={userType} />
                  {eligibility.reason && (
                    <span className="text-xs text-muted-foreground italic">
                      {eligibility.reason}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {sessions.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No sessions available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
