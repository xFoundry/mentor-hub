"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionCard } from "@/components/shared/session-card";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session, UserType } from "@/types/schema";
import {
  groupSessions,
  getGroupColor,
  sessionNeedsFeedback,
  isCurrentUserMentor,
  type SessionGroupBy,
} from "../session-transformers";

export interface SessionCardViewProps {
  sessions: Session[];
  userType: UserType;
  userEmail: string;
  isLoading?: boolean;
  groupBy?: SessionGroupBy;
  onSessionClick?: (session: Session) => void;
  onFeedbackClick?: (sessionId: string) => void;
  showTeamName?: boolean;
  showMentorName?: boolean;
  showFeedbackStatus?: boolean;
  /** When true, only sessions where userEmail matches the mentor are interactive */
  restrictInteractionToUserSessions?: boolean;
  className?: string;
}

export function SessionCardView({
  sessions,
  userType,
  userEmail,
  isLoading = false,
  groupBy = "none",
  onSessionClick,
  onFeedbackClick,
  showTeamName = false,
  showMentorName = false,
  showFeedbackStatus = false,
  restrictInteractionToUserSessions = false,
  className,
}: SessionCardViewProps) {
  // Track which groups are open (all open by default)
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const groups = groupSessions(sessions, groupBy);
    return new Set(Array.from(groups.keys()));
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  if (isLoading) {
    return <SessionCardViewSkeleton />;
  }

  if (sessions.length === 0) {
    return <SessionCardViewEmpty />;
  }

  // Grouped view
  if (groupBy !== "none") {
    const groups = groupSessions(sessions, groupBy);

    return (
      <div className={cn("space-y-2", className)}>
        {Array.from(groups.entries()).map(([groupName, groupSessions]) => {
          const groupColor = getGroupColor(groupBy, groupName);
          const isOpen = openGroups.has(groupName);

          return (
            <Collapsible
              key={groupName}
              open={isOpen}
              onOpenChange={() => toggleGroup(groupName)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50"
                >
                  <span className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: groupColor }}
                    />
                    <span className="font-medium">{groupName}</span>
                    <span className="text-muted-foreground text-sm">
                      ({groupSessions.length})
                    </span>
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-2 pt-2">
                {groupSessions.map((session) => (
                  <SessionCardItem
                    key={session.id}
                    session={session}
                    userType={userType}
                    userEmail={userEmail}
                    onSessionClick={onSessionClick}
                    onFeedbackClick={onFeedbackClick}
                    showTeamName={groupBy !== "team" && showTeamName}
                    showMentorName={showMentorName}
                    showFeedbackStatus={showFeedbackStatus}
                    restrictInteractionToUserSessions={restrictInteractionToUserSessions}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  }

  // Flat list view
  return (
    <div className={cn("space-y-2", className)}>
      {sessions.map((session) => (
        <SessionCardItem
          key={session.id}
          session={session}
          userType={userType}
          userEmail={userEmail}
          onSessionClick={onSessionClick}
          onFeedbackClick={onFeedbackClick}
          showTeamName={showTeamName}
          showMentorName={showMentorName}
          showFeedbackStatus={showFeedbackStatus}
          restrictInteractionToUserSessions={restrictInteractionToUserSessions}
        />
      ))}
    </div>
  );
}

interface SessionCardItemProps {
  session: Session;
  userType: UserType;
  userEmail: string;
  onSessionClick?: (session: Session) => void;
  onFeedbackClick?: (sessionId: string) => void;
  showTeamName?: boolean;
  showMentorName?: boolean;
  showFeedbackStatus?: boolean;
  restrictInteractionToUserSessions?: boolean;
}

function SessionCardItem({
  session,
  userType,
  userEmail,
  onSessionClick,
  onFeedbackClick,
  showTeamName,
  showMentorName,
  showFeedbackStatus,
  restrictInteractionToUserSessions = false,
}: SessionCardItemProps) {
  const isUserSession = !restrictInteractionToUserSessions || isCurrentUserMentor(session, userEmail);
  const needsFeedback = isUserSession && sessionNeedsFeedback(session, userType);
  const isClickable = onSessionClick && isUserSession;

  return (
    <div
      className={cn(
        "transition-colors",
        isClickable && "cursor-pointer",
        needsFeedback && "ring-1 ring-yellow-300 dark:ring-yellow-800 rounded-lg",
        !isUserSession && "opacity-60"
      )}
      onClick={() => isClickable && onSessionClick?.(session)}
    >
      <SessionCard
        session={session}
        variant="compact"
        userType={userType}
        userEmail={userEmail}
        showTeamName={showTeamName}
        showMentorName={showMentorName}
        showFeedbackStatus={isUserSession ? showFeedbackStatus : false}
        onFeedbackClick={isUserSession ? onFeedbackClick : undefined}
        isInteractive={isUserSession}
      />
    </div>
  );
}

function SessionCardViewSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

function SessionCardViewEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md">
      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">No sessions to display</p>
    </div>
  );
}
