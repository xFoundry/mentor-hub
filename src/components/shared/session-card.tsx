"use client";

import Link from "next/link";
import { isPast, isFuture } from "date-fns";
import { formatAsEastern, TIMEZONE_ABBR } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MessageSquare, Video, MoreHorizontal, Trash2 } from "lucide-react";
import type { Session } from "@/types/schema";
import type { UserType } from "@/lib/permissions";
import { hasMentorFeedback, hasMenteeFeedback, isSessionEligibleForFeedback, isCurrentUserMentor, parseAsLocalTime, getMentorParticipants, isSessionPrepRequired, isSessionFeedbackRequired } from "@/components/sessions/session-transformers";
import { useFeedbackDialog } from "@/contexts/feedback-dialog-context";
import { MentorAvatarStack, MentorTextDisplay } from "@/components/shared/mentor-avatar-stack";

interface SessionCardProps {
  session: Session;
  variant?: "compact" | "detailed";
  userType: UserType;
  userEmail?: string;
  showTeamName?: boolean;
  showMentorName?: boolean;
  showFeedbackStatus?: boolean;
  /** @deprecated Use feedback dialog context instead. This prop is kept for backwards compatibility. */
  onFeedbackClick?: (sessionId: string) => void;
  /** When false, the card is not wrapped in a link (used for other mentor's sessions) */
  isInteractive?: boolean;
  /** Callback when delete is requested (staff only) */
  onDeleteClick?: (session: Session) => void;
}

export function SessionCard({
  session,
  variant = "compact",
  userType,
  userEmail,
  showTeamName = false,
  showMentorName = false,
  showFeedbackStatus = false,
  onFeedbackClick,
  isInteractive = true,
  onDeleteClick,
}: SessionCardProps) {
  const { openFeedbackDialog } = useFeedbackDialog();
  const team = session.team?.[0];
  const mentors = getMentorParticipants(session);
  const isUserMentor = isCurrentUserMentor(session, userEmail);
  const canDelete = userType === "staff" && onDeleteClick;

  const handleFeedbackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Support legacy onFeedbackClick prop, but prefer dialog
    if (onFeedbackClick) {
      onFeedbackClick(session.id);
    } else {
      openFeedbackDialog(session);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteClick?.(session);
  };
  // Check if current user type has submitted feedback (for past or completed sessions)
  const needsFeedback = isSessionEligibleForFeedback(session) &&
    (userType === "student" ? !hasMenteeFeedback(session) : !hasMentorFeedback(session));

  const sessionDate = session.scheduledStart
    ? parseAsLocalTime(session.scheduledStart)
    : null;
  const isUpcoming = sessionDate && isFuture(sessionDate);
  const isPastSession = sessionDate && isPast(sessionDate);

  const getStatusBadge = () => {
    if (session.status === "Cancelled") {
      return <Badge variant="secondary">Cancelled</Badge>;
    }
    if (session.status === "Completed") {
      return <Badge variant="outline">Completed</Badge>;
    }
    if (session.status === "In Progress") {
      return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
    }
    if (isUpcoming) {
      return <Badge className="bg-green-100 text-green-800">Upcoming</Badge>;
    }
    return null;
  };

  if (variant === "compact") {
    const content = (
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{session.sessionType}</span>
            {getStatusBadge()}
            {showFeedbackStatus && needsFeedback && isInteractive && (
              <Badge variant="outline" className="border-yellow-400 bg-yellow-50 text-yellow-800">
                Needs Feedback
              </Badge>
            )}
            {/* Staff badges for optional prep/feedback */}
            {userType === "staff" && !isSessionPrepRequired(session) && (
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                Prep Optional
              </Badge>
            )}
            {userType === "staff" && !isSessionFeedbackRequired(session) && (
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                Feedback Optional
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {showTeamName && team && (
              <span className="font-medium text-foreground">{team.teamName}</span>
            )}
            {showMentorName && mentors.length > 0 && (
              <MentorTextDisplay
                session={session}
                currentUserEmail={userEmail}
                prefix="with"
              />
            )}
            {session.scheduledStart && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatAsEastern(session.scheduledStart, "MMM d, yyyy")}
              </span>
            )}
            {session.scheduledStart && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatAsEastern(session.scheduledStart, "h:mm a")} {TIMEZONE_ABBR}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {showFeedbackStatus && needsFeedback && isInteractive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFeedbackClick}
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              Add Feedback
            </Button>
          )}

          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Session actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );

    // Non-interactive card (for other mentor's sessions)
    if (!isInteractive) {
      return (
        <div className="block rounded-lg border p-3">
          {content}
        </div>
      );
    }

    return (
      <Link
        href={`/sessions/${session.id}`}
        className="block rounded-lg border p-3 transition-colors hover:bg-muted"
      >
        {content}
      </Link>
    );
  }

  // Detailed variant
  const detailedContent = (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-medium">{session.sessionType}</span>
            {getStatusBadge()}
            {/* Staff badges for optional prep/feedback */}
            {userType === "staff" && !isSessionPrepRequired(session) && (
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                Prep Optional
              </Badge>
            )}
            {userType === "staff" && !isSessionFeedbackRequired(session) && (
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                Feedback Optional
              </Badge>
            )}
          </div>
          {showTeamName && team && (
            <p className="text-sm text-muted-foreground">{team.teamName}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {session.meetingUrl && isInteractive && (
            <Button variant="outline" size="sm" asChild>
              <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                <Video className="mr-1 h-3 w-3" />
                Join
              </a>
            </Button>
          )}

          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Session actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {session.scheduledStart && (
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatAsEastern(session.scheduledStart, "EEEE, MMMM d, yyyy")} at {formatAsEastern(session.scheduledStart, "h:mm a")} {TIMEZONE_ABBR}
          </span>
        )}
        {session.duration && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {session.duration} min
          </span>
        )}
      </div>

      {showMentorName && mentors.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mentor{mentors.length > 1 ? "s" : ""}:</span>
          <MentorAvatarStack
            session={session}
            size="sm"
            currentUserEmail={userEmail}
            showNames={true}
            showRoles={mentors.length > 1}
            maxDisplay={3}
          />
        </div>
      )}

      {session.agenda && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {session.agenda}
        </p>
      )}

      {showFeedbackStatus && needsFeedback && isInteractive && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-yellow-600">Feedback pending</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFeedbackClick}
          >
            <MessageSquare className="mr-1 h-3 w-3" />
            Add Feedback
          </Button>
        </div>
      )}
    </div>
  );

  // Non-interactive card (for other mentor's sessions)
  if (!isInteractive) {
    return (
      <div className="block rounded-lg border p-4">
        {detailedContent}
      </div>
    );
  }

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block rounded-lg border p-4 transition-colors hover:bg-muted"
    >
      {detailedContent}
    </Link>
  );
}
