"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, CheckSquare, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Team, Contact, Member } from "@/types/schema";

interface TeamSummaryProps {
  team: {
    id: string;
    teamId?: string;
    teamName: string;
    members?: Member[];
    actionItems?: any[];
  };
  /** Start collapsed */
  defaultCollapsed?: boolean;
  className?: string;
}

/**
 * Condensed, collapsible team display for student dashboard
 * Shows team name with stats, expandable to see members
 */
export function TeamSummary({
  team,
  defaultCollapsed = true,
  className,
}: TeamSummaryProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  // Extract members from the team
  const members = team.members || [];
  const memberCount = members.length;

  // Count open tasks
  const tasks = team.actionItems || [];
  const openTaskCount = tasks.filter(
    (t: any) => t.status !== "Completed" && t.status !== "Cancelled"
  ).length;

  // Get member contacts for avatars
  const memberContacts = members
    .filter((m) => m.contact?.[0])
    .map((m) => m.contact![0])
    .slice(0, 4);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("overflow-hidden", className)}>
        <CollapsibleTrigger asChild>
          <CardContent className="py-3 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              {/* Team icon */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>

              {/* Team name and stats */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{team.teamName}</p>
                <p className="text-xs text-muted-foreground">
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                  {openTaskCount > 0 && (
                    <> &middot; {openTaskCount} task{openTaskCount !== 1 ? "s" : ""}</>
                  )}
                </p>
              </div>

              {/* Collapse indicator */}
              <div className="flex items-center gap-2 text-muted-foreground">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-3">
            {/* Member avatars */}
            {memberContacts.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {memberContacts.map((contact, i) => (
                    <Avatar
                      key={contact.id}
                      className="h-8 w-8 border-2 border-background"
                    >
                      <AvatarImage
                        src={contact.headshot?.[0]?.url}
                        alt={contact.fullName}
                      />
                      <AvatarFallback className="text-xs">
                        {contact.fullName
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {memberCount > 4 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                      +{memberCount - 4}
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {memberContacts.map((c) => c.fullName?.split(" ")[0]).join(", ")}
                  {memberCount > 4 && ` +${memberCount - 4} more`}
                </span>
              </div>
            )}

            {/* View team button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              asChild
            >
              <Link href={`/teams/${team.id}`}>
                View Team Details
                <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
