"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users2,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { MentorTeam, MentorSessionSummary } from "@/hooks/use-mentor-teams";
import { parseAsLocalTime } from "@/components/sessions/session-transformers";

interface MentorTeamCardProps {
  team: MentorTeam;
  href?: string;
}

export function MentorTeamCard({ team, href }: MentorTeamCardProps) {
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);

  const members = team.members || [];
  const memberCount = team.memberCount ?? members.length;
  const sessionCount = team.mentorSessions?.length ?? 0;
  const taskCount = team.openTaskCount ?? 0;
  const cohorts = team.cohorts || [];
  const cohortName = cohorts[0]?.shortName || "N/A";

  // Check if mentor has submitted feedback for a session
  const hasMentorFeedback = (session: MentorSessionSummary): boolean => {
    return session.feedback?.some((f) => f.role === "Mentor") ?? false;
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
            <Users2 className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {href ? (
                  <Link href={href} className="hover:underline">
                    {team.teamName}
                  </Link>
                ) : (
                  team.teamName
                )}
              </CardTitle>
              {href && (
                <Link href={href}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {cohortName}
              </Badge>
              {team.teamStatus && (
                <Badge
                  variant={team.teamStatus === "Active" ? "default" : "outline"}
                  className="text-xs"
                >
                  {team.teamStatus}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Team Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border p-2">
            <div className="text-muted-foreground mb-1">
              <Users2 className="mx-auto h-4 w-4" />
            </div>
            <div className="text-lg font-semibold">{memberCount}</div>
            <div className="text-muted-foreground text-xs">Members</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-muted-foreground mb-1">
              <Calendar className="mx-auto h-4 w-4" />
            </div>
            <div className="text-lg font-semibold">{sessionCount}</div>
            <div className="text-muted-foreground text-xs">Sessions</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-muted-foreground mb-1">
              <CheckSquare className="mx-auto h-4 w-4" />
            </div>
            <div className="text-lg font-semibold">{taskCount}</div>
            <div className="text-muted-foreground text-xs">Tasks</div>
          </div>
        </div>

        {/* Team Members Preview */}
        {members.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">
              Team Members
            </p>
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member: any) => {
                const contact = member.contact?.[0];
                const initials =
                  contact?.fullName
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?";

                return (
                  <Avatar
                    key={member.id}
                    className="h-8 w-8 border-2 border-background"
                    title={contact?.fullName}
                  >
                    <AvatarImage
                      src={contact?.headshot?.[0]?.url}
                      alt={contact?.fullName}
                    />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                );
              })}
              {members.length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sessions Collapsible */}
        {sessionCount > 0 && (
          <Collapsible open={isSessionsOpen} onOpenChange={setIsSessionsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 h-auto border"
              >
                <span className="flex items-center gap-2">
                  {isSessionsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Sessions</span>
                  <span className="text-muted-foreground text-sm">
                    ({sessionCount})
                  </span>
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {team.mentorSessions.map((session) => {
                const sessionDate = session.scheduledStart
                  ? parseAsLocalTime(session.scheduledStart)
                  : null;
                const feedbackSubmitted = hasMentorFeedback(session);

                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {sessionDate && (
                            <span className="font-medium">
                              {format(sessionDate, "MMM d")}
                            </span>
                          )}
                          {session.sessionType && (
                            <Badge variant="outline" className="text-xs">
                              {session.sessionType}
                            </Badge>
                          )}
                        </div>
                        {sessionDate && (
                          <div className="text-muted-foreground text-xs">
                            {format(sessionDate, "h:mm a")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {feedbackSubmitted ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs">
                          <CheckCircle2 className="h-4 w-4" />
                          Feedback
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600 text-xs">
                          <AlertCircle className="h-4 w-4" />
                          Pending
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
