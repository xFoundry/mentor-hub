"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Users,
  Video,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Circle,
  XCircle,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { parseISO, format, isFuture } from "date-fns";
import type { Session, UserType } from "@/types/schema";
import {
  SESSION_STATUS_CONFIG,
  SESSION_TYPE_CONFIG,
  isSessionUpcoming,
  isSessionStartingSoon,
  formatSessionDate,
  formatSessionTime,
  hasMentorFeedback,
  isSessionEligibleForFeedback,
  isCurrentUserMentor,
  getMentorParticipants,
  getLeadMentor,
  type SessionStatus,
  type SessionType,
} from "../session-transformers";
import { MentorAvatarStack } from "@/components/shared/mentor-avatar-stack";
import { TableColumnHeader } from "@/components/kibo-ui/table";

interface CreateColumnsOptions {
  userType: UserType;
  userEmail?: string;
  visibleColumns: string[];
  onSessionClick?: (session: Session) => void;
  onFeedbackClick?: (sessionId: string) => void;
  onDeleteClick?: (session: Session) => void;
  canAddFeedback?: (session: Session) => boolean;
  /** When true, only sessions where userEmail matches the mentor are interactive */
  restrictInteractionToUserSessions?: boolean;
}

/**
 * Get status indicator icon and color
 */
function getStatusIndicator(
  session: Session,
  userType: UserType,
  isUserSession: boolean = true
) {
  // Only show "needs feedback" indicator for the user's own sessions
  const needsFeedback = isUserSession &&
    isSessionEligibleForFeedback(session) &&
    (userType === "mentor" || userType === "staff") &&
    !hasMentorFeedback(session);

  if (needsFeedback) {
    return {
      icon: AlertCircle,
      color: "text-yellow-500",
      pulse: false,
      title: "Needs feedback",
    };
  }

  // Starting soon (within 30 min)
  if (isSessionStartingSoon(session, 30)) {
    return {
      icon: Circle,
      color: "text-blue-500",
      pulse: true,
      title: "Starting soon",
    };
  }

  // Upcoming
  if (isSessionUpcoming(session)) {
    return {
      icon: Circle,
      color: "text-green-500",
      pulse: false,
      title: "Upcoming",
    };
  }

  // Completed
  if (session.status === "Completed") {
    return {
      icon: CheckCircle2,
      color: "text-muted-foreground",
      pulse: false,
      title: "Completed",
    };
  }

  // Cancelled
  if (session.status === "Cancelled") {
    return {
      icon: XCircle,
      color: "text-muted-foreground",
      pulse: false,
      title: "Cancelled",
    };
  }

  // No-Show
  if (session.status === "No-Show") {
    return {
      icon: AlertCircle,
      color: "text-destructive",
      pulse: false,
      title: "No-Show",
    };
  }

  // Default (scheduled)
  return {
    icon: Circle,
    color: "text-muted-foreground",
    pulse: false,
    title: "Scheduled",
  };
}

export function createSessionTableColumns({
  userType,
  userEmail,
  visibleColumns,
  onSessionClick,
  onFeedbackClick,
  onDeleteClick,
  canAddFeedback,
  restrictInteractionToUserSessions = false,
}: CreateColumnsOptions): ColumnDef<Session>[] {
  const columns: ColumnDef<Session>[] = [];

  // Helper to check if this is the user's session
  const checkIsUserSession = (session: Session) => {
    if (!restrictInteractionToUserSessions) return true;
    return isCurrentUserMentor(session, userEmail);
  };

  // Status indicator column (always first)
  if (visibleColumns.includes("indicator")) {
    columns.push({
      id: "indicator",
      header: "",
      size: 40,
      cell: ({ row }) => {
        const session = row.original;
        const isUserSession = checkIsUserSession(session);
        const indicator = getStatusIndicator(session, userType, isUserSession);
        const Icon = indicator.icon;

        return (
          <div className="flex items-center justify-center" title={indicator.title}>
            <Icon
              className={cn(
                "h-4 w-4",
                indicator.color,
                indicator.pulse && "animate-pulse"
              )}
            />
          </div>
        );
      },
    });
  }

  // Date & Time column
  if (visibleColumns.includes("dateTime")) {
    columns.push({
      accessorKey: "scheduledStart",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Date & Time" />
      ),
      cell: ({ row }) => {
        const session = row.original;

        if (!session.scheduledStart) {
          return <span className="text-muted-foreground">Not scheduled</span>;
        }

        const upcoming = isSessionUpcoming(session);
        const startingSoon = isSessionStartingSoon(session, 60);

        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className={cn(
                "text-sm",
                !upcoming && "text-muted-foreground"
              )}>
                {formatSessionDate(session.scheduledStart)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatSessionTime(session.scheduledStart)}
                {session.duration && ` (${session.duration} min)`}
              </span>
              {startingSoon && (
                <Badge variant="default" className="text-xs">
                  Soon
                </Badge>
              )}
            </div>
          </div>
        );
      },
    });
  }

  // Session type column
  if (visibleColumns.includes("type")) {
    columns.push({
      accessorKey: "sessionType",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const session = row.original;
        const typeConfig = SESSION_TYPE_CONFIG[session.sessionType as SessionType];

        return (
          <Badge
            variant="outline"
            style={{
              borderColor: typeConfig?.color,
              color: typeConfig?.color,
            }}
          >
            {session.sessionType || "Session"}
          </Badge>
        );
      },
    });
  }

  // Team column
  if (visibleColumns.includes("team")) {
    columns.push({
      accessorKey: "team",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Team" />
      ),
      cell: ({ row }) => {
        const team = row.original.team?.[0];

        if (!team) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate max-w-[150px]">{team.teamName}</span>
          </div>
        );
      },
    });
  }

  // Mentor column
  if (visibleColumns.includes("mentor")) {
    columns.push({
      accessorKey: "mentor",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Mentor" />
      ),
      cell: ({ row }) => {
        const session = row.original;
        const mentors = getMentorParticipants(session);

        if (mentors.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <MentorAvatarStack
            session={session}
            size="sm"
            maxDisplay={2}
            currentUserEmail={userEmail}
            showNames={mentors.length === 1}
          />
        );
      },
    });
  }

  // Status column
  if (visibleColumns.includes("status")) {
    columns.push({
      accessorKey: "status",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const session = row.original;
        const status = session.status as SessionStatus || "Scheduled";
        const config = SESSION_STATUS_CONFIG[status];

        return (
          <Badge
            variant="outline"
            style={{
              borderColor: config?.color,
              color: config?.color,
            }}
          >
            {status}
          </Badge>
        );
      },
    });
  }

  // Feedback column
  if (visibleColumns.includes("feedback")) {
    columns.push({
      id: "feedback",
      header: "Feedback",
      cell: ({ row }) => {
        const session = row.original;
        const isUserSession = checkIsUserSession(session);

        // Only show for completed sessions
        if (session.status !== "Completed") {
          return <span className="text-muted-foreground">-</span>;
        }

        // For non-user sessions, just show a dash
        if (!isUserSession) {
          return <span className="text-muted-foreground">-</span>;
        }

        const needsFeedback = canAddFeedback?.(session) ?? false;

        if (needsFeedback) {
          return (
            <Badge
              variant="outline"
              className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950/50 dark:border-yellow-800 dark:text-yellow-400"
            >
              Pending
            </Badge>
          );
        }

        return (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>Added</span>
          </div>
        );
      },
    });
  }

  // Actions column
  if (visibleColumns.includes("actions")) {
    columns.push({
      id: "actions",
      header: "",
      size: 150,
      cell: ({ row }) => {
        const session = row.original;
        const isUserSession = checkIsUserSession(session);
        const upcoming = isSessionUpcoming(session);
        const hasMeetingUrl = session.meetingUrl && upcoming && isUserSession;
        const needsFeedback = isUserSession && (canAddFeedback?.(session) ?? false);
        const canDelete = userType === "staff" && onDeleteClick;

        // For non-user sessions, only show delete if staff
        if (!isUserSession && !canDelete) {
          return null;
        }

        return (
          <div className="flex items-center justify-end gap-1">
            {/* Join meeting button */}
            {hasMeetingUrl && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(session.meetingUrl, "_blank");
                }}
              >
                <Video className="h-3 w-3 mr-1" />
                Join
              </Button>
            )}

            {/* Add feedback button */}
            {needsFeedback && onFeedbackClick && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeedbackClick(session.id);
                }}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Feedback
              </Button>
            )}

            {/* View details button */}
            {isUserSession && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onSessionClick?.(session);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {/* Staff actions dropdown */}
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Session actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick(session);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Session
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    });
  }

  return columns;
}
