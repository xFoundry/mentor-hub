"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Users2, Plus, MoreHorizontal, Pencil, UserPlus, Trash2 } from "lucide-react";
import type { UserType } from "@/lib/permissions";
import Link from "next/link";

interface TeamMember {
  id: string;
  status?: string;
  type?: string;
  contact?: Array<{
    id: string;
    fullName?: string;
    email?: string;
    headshot?: Array<{ url: string }>;
  }>;
}

interface TeamDetailHeaderProps {
  team: {
    id: string;
    teamId?: string;
    teamName: string;
    teamStatus?: string;
    description?: string;
    cohorts?: Array<{ id: string; shortName: string }>;
  };
  userType: UserType;
  subtitle?: string;
  members?: TeamMember[];
  currentUserEmail?: string;
  onEditTeam?: () => void;
  onAddMember?: () => void;
  onDeleteTeam?: () => void;
  onCreateTask?: () => void;
}

export function TeamDetailHeader({
  team,
  userType,
  subtitle,
  members,
  currentUserEmail,
  onEditTeam,
  onAddMember,
  onDeleteTeam,
  onCreateTask,
}: TeamDetailHeaderProps) {
  const cohortName = team.cohorts?.[0]?.shortName || "N/A";

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-lg">
          <Users2 className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{team.teamName}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{cohortName}</Badge>
            {team.teamStatus && (
              <Badge
                variant={team.teamStatus === "Active" ? "default" : "outline"}
              >
                {team.teamStatus}
              </Badge>
            )}
            {team.teamId && (
              <span className="text-muted-foreground text-sm">{team.teamId}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          )}
          {team.description && (
            <p className="text-muted-foreground mt-2 max-w-3xl">{team.description}</p>
          )}
          {/* Team member pills */}
          {members && members.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2">
              {members.map((member) => {
                const contact = member.contact?.[0];
                const initials = contact?.fullName
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?";
                const isSelf = contact?.email === currentUserEmail;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={contact?.headshot?.[0]?.url} alt={contact?.fullName} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {contact?.fullName || "Unknown"}
                      {isSelf && " (you)"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - varies by role */}
      <div className="flex items-center gap-2">
        {/* Create Task button for mentors and staff */}
        <PermissionGate userType={userType} entity="task" action="create">
          {onCreateTask ? (
            <Button onClick={onCreateTask}>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/tasks/new?team=${team.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Link>
            </Button>
          )}
        </PermissionGate>

        {/* Staff management actions */}
        <PermissionGate userType={userType} entity="team" action="update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Team actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditTeam}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Team
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddMember}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </DropdownMenuItem>
              <PermissionGate userType={userType} entity="team" action="delete">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDeleteTeam}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Team
                </DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        </PermissionGate>
      </div>
    </div>
  );
}
