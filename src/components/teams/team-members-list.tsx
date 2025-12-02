"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { Users2, ExternalLink, UserMinus, UserPlus, MoreHorizontal, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserType } from "@/lib/permissions";

interface Member {
  id: string;
  status?: string;
  type?: string;
  contact?: Array<{
    id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    headshot?: Array<{ url: string }>;
    bio?: string;
    linkedIn?: string;
  }>;
}

interface TeamMembersListProps {
  members: Member[];
  isLoading?: boolean;
  userType: UserType;
  currentUserEmail?: string;
  variant?: "compact" | "detailed" | "grid";
  showActions?: boolean;
  onAddMember?: () => void;
  onRemoveMember?: (memberId: string, memberName: string) => void;
  title?: string;
  description?: string;
  maxItems?: number;
}

export function TeamMembersList({
  members,
  isLoading = false,
  userType,
  currentUserEmail,
  variant = "grid",
  showActions = true,
  onAddMember,
  onRemoveMember,
  title = "Team Members",
  description,
  maxItems,
}: TeamMembersListProps) {
  const displayMembers = maxItems ? members.slice(0, maxItems) : members;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className={variant === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <PermissionGate userType={userType} entity="team" action="update">
            {showActions && onAddMember && (
              <Button onClick={onAddMember} size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            )}
          </PermissionGate>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users2}
            title="No members yet"
            description="Add team members to get started"
          />
        </CardContent>
      </Card>
    );
  }

  // Compact variant - horizontal scroll with avatars
  if (variant === "compact") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users2 className="h-4 w-4" />
            {title}
            <Badge variant="secondary" className="ml-auto">
              {members.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {displayMembers.map((member) => {
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
            {maxItems && members.length > maxItems && (
              <Badge variant="outline">+{members.length - maxItems} more</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed or Grid variant
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <PermissionGate userType={userType} entity="team" action="update">
          {showActions && onAddMember && (
            <Button onClick={onAddMember} size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          )}
        </PermissionGate>
      </CardHeader>
      <CardContent>
        <div className={variant === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {displayMembers.map((member) => {
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
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contact?.headshot?.[0]?.url} alt={contact?.fullName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">
                      {contact?.fullName || "Unknown"}
                    </h3>
                    {isSelf && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                    {member.type && member.type !== "Member" && (
                      <Badge variant="outline" className="text-xs">
                        {member.type}
                      </Badge>
                    )}
                  </div>
                  {contact?.email && (
                    <p className="text-muted-foreground text-sm truncate">
                      {contact.email}
                    </p>
                  )}
                  {contact?.bio && (
                    <p className="text-muted-foreground line-clamp-2 text-xs mt-1">
                      {contact.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {contact?.linkedIn && (
                      <a
                        href={contact.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                      >
                        LinkedIn <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {contact?.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                      >
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    )}
                  </div>
                </div>

                {/* Staff actions */}
                <PermissionGate userType={userType} entity="team" action="update">
                  {showActions && onRemoveMember && !isSelf && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onRemoveMember(member.id, contact?.fullName || "this member")}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove from Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </PermissionGate>
              </div>
            );
          })}
        </div>
        {maxItems && members.length > maxItems && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              View all {members.length} members
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
