"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Team } from "@/types/schema";

interface TeamsSummaryProps {
  teams: Team[];
  /** Start collapsed */
  defaultCollapsed?: boolean;
  className?: string;
}

/**
 * Condensed, collapsible display of multiple teams for mentor dashboard
 * Shows team count with badges, expandable to see all teams
 */
export function TeamsSummary({
  teams,
  defaultCollapsed = true,
  className,
}: TeamsSummaryProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  const teamCount = teams.length;

  if (teamCount === 0) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">My Teams</p>
              <p className="text-xs text-muted-foreground">No teams assigned yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("overflow-hidden", className)}>
        <CollapsibleTrigger asChild>
          <CardContent className="py-3 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              {/* Teams icon */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>

              {/* Teams info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  My Teams ({teamCount})
                </p>
                {/* Team name badges in collapsed state */}
                {!isOpen && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {teams.slice(0, 3).map((team) => (
                      <Badge
                        key={team.id}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {team.teamName}
                      </Badge>
                    ))}
                    {teamCount > 3 && (
                      <Badge variant="outline" className="text-xs font-normal">
                        +{teamCount - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Collapse indicator */}
              <div className="flex items-center text-muted-foreground">
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
          <div className="border-t px-4 py-3 space-y-2">
            {/* List of teams */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="flex items-center gap-2 rounded-lg border p-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{team.teamName}</p>
                    {team.cohorts?.[0]?.shortName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {team.cohorts[0].shortName}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
              ))}
            </div>

            {/* View all teams link */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              asChild
            >
              <Link href="/teams">
                View All Teams
                <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
