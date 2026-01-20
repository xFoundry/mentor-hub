"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users2, Calendar, CheckSquare } from "lucide-react";
import type { Member, Session, Task, Team } from "@/types/schema";

interface TeamCardProps {
  team: Team & {
    memberCount?: number;
    openTaskCount?: number;
    sessionCount?: number;
    mentorshipSessions?: Session[];
    actionItems?: Task[];
  };
  variant?: "compact" | "detailed";
  showStats?: boolean;
  showMembers?: boolean;
  showDescription?: boolean;
  href?: string;
}

export function TeamCard({
  team,
  variant = "compact",
  showStats = true,
  showMembers = false,
  showDescription = true,
  href,
}: TeamCardProps) {
  const members = team.members || [];
  const memberCount = team.memberCount ?? members.length;
  const sessionCount = team.sessionCount ?? team.mentorshipSessions?.length ?? 0;
  const taskCount = team.openTaskCount ?? team.actionItems?.length ?? 0;
  const cohorts = team.cohorts || [];
  const cohortName = cohorts[0]?.shortName || "N/A";

  // Compact variant (used in dashboards, sidebars)
  if (variant === "compact") {
    const content = (
      <Card className={href ? "transition-colors hover:bg-muted/50" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{team.teamName}</CardTitle>
            {cohorts.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {cohortName}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {showStats && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users2 className="h-3 w-3" />
                {memberCount} member{memberCount !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {taskCount} task{taskCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {showMembers && members.length > 0 && (
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((member: Member, i: number) => {
                const contact = member.contact?.[0];
                if (!contact) return null;
                return (
                  <Avatar key={i} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={contact.headshot?.[0]?.url} alt={contact.fullName} />
                    <AvatarFallback className="text-xs">
                      {contact.fullName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {members.length > 4 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                  +{members.length - 4}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );

    if (href) {
      return <Link href={href}>{content}</Link>;
    }
    return content;
  }

  // Detailed variant (used in team list page)
  const content = (
    <Card className={`flex flex-col ${href ? "hover:bg-muted/50 transition-colors" : ""}`}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
            <Users2 className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">{team.teamName}</CardTitle>
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
        {showDescription && team.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {team.description}
          </p>
        )}

        {/* Team Stats */}
        {showStats && (
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
        )}

        {/* Team Members Preview */}
        {showMembers && members.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">Team Members</p>
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member: Member) => {
                const contact = member.contact?.[0];
                const initials = contact?.fullName
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
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
