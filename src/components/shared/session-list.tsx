"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SessionCard } from "./session-card";
import { EmptyState } from "./empty-state";
import { Calendar, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import type { Session } from "@/types/schema";
import type { UserType } from "@/lib/permissions";

interface SessionListProps {
  sessions: Session[];
  isLoading?: boolean;
  userType: UserType;
  title?: string;
  description?: string;
  // Grouping
  groupBy?: "none" | "team" | "mentor";
  // Display
  variant?: "compact" | "detailed";
  showTeamName?: boolean;
  showMentorName?: boolean;
  showFeedbackStatus?: boolean;
  emptyStateMessage?: string;
  maxItems?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
  onFeedbackClick?: (sessionId: string) => void;
}

export function SessionList({
  sessions,
  isLoading = false,
  userType,
  title,
  description,
  groupBy = "none",
  variant = "compact",
  showTeamName = false,
  showMentorName = false,
  showFeedbackStatus = false,
  emptyStateMessage = "No sessions found",
  maxItems,
  showViewAll = false,
  viewAllHref = "/sessions",
  onFeedbackClick,
}: SessionListProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

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

  // Group sessions if needed
  const groupedSessions = useMemo(() => {
    if (groupBy === "none") return null;

    const groups = new Map<string, { name: string; sessions: Session[] }>();

    sessions.forEach((session: any) => {
      let groupId: string;
      let groupName: string;

      if (groupBy === "team") {
        const team = session.team?.[0];
        groupId = team?.id || "unassigned";
        groupName = team?.teamName || "Unassigned";
      } else if (groupBy === "mentor") {
        const mentor = session.mentor?.[0];
        groupId = mentor?.id || "unassigned";
        groupName = mentor?.fullName || "Unassigned";
      } else {
        groupId = "all";
        groupName = "All Sessions";
      }

      const existing = groups.get(groupId);
      if (existing) {
        existing.sessions.push(session);
      } else {
        groups.set(groupId, { name: groupName, sessions: [session] });
      }
    });

    return Array.from(groups.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      sessions: data.sessions,
    }));
  }, [sessions, groupBy]);

  // Apply max items limit
  const displaySessions = maxItems ? sessions.slice(0, maxItems) : sessions;

  if (isLoading) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <EmptyState icon={Calendar} title={emptyStateMessage} />
        </CardContent>
      </Card>
    );
  }

  // Grouped view
  if (groupBy !== "none" && groupedSessions) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="space-y-2">
          {groupedSessions.map((group) => (
            <Collapsible
              key={group.id}
              open={openGroups.has(group.id)}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 py-2 h-auto"
                >
                  <span className="flex items-center gap-2">
                    {openGroups.has(group.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{group.name}</span>
                    <span className="text-muted-foreground text-sm">
                      ({group.sessions.length})
                    </span>
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-2 pt-2">
                {group.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    variant={variant}
                    userType={userType}
                    showTeamName={groupBy !== "team" && showTeamName}
                    showMentorName={groupBy !== "mentor" && showMentorName}
                    showFeedbackStatus={showFeedbackStatus}
                    onFeedbackClick={onFeedbackClick}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Flat list view
  return (
    <Card>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showViewAll && sessions.length > (maxItems || 0) && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={viewAllHref}>
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-2">
        {displaySessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            variant={variant}
            userType={userType}
            showTeamName={showTeamName}
            showMentorName={showMentorName}
            showFeedbackStatus={showFeedbackStatus}
            onFeedbackClick={onFeedbackClick}
          />
        ))}
        {showViewAll && sessions.length > (maxItems || 0) && !title && (
          <Button variant="outline" className="w-full" asChild>
            <Link href={viewAllHref}>
              View all {sessions.length} sessions
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
