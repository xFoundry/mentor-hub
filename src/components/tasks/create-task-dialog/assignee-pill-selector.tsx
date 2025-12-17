"use client";

import * as React from "react";
import { Check, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeamMembers } from "@/hooks/use-team-members";

interface AssigneePillSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  teamId: string | undefined;
  disabled?: boolean;
  /** Current assignee info for display when popover is closed */
  currentAssignee?: {
    id: string;
    fullName?: string;
    headshot?: string;
  };
}

export function AssigneePillSelector({
  value,
  onChange,
  teamId,
  disabled = false,
  currentAssignee,
}: AssigneePillSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Only fetch team members when popover is open and we have a teamId
  const { members, isLoading } = useTeamMembers(open && teamId ? teamId : undefined);

  const getInitials = (name?: string): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const selectedMember = members.find((m) => m.contact.id === value);
  const displayName = selectedMember?.contact.fullName || currentAssignee?.fullName;
  // Airtable stores headshots as attachment arrays - extract URL
  const displayHeadshot = selectedMember?.contact.headshot?.[0]?.url || currentAssignee?.headshot;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !teamId}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs font-normal cursor-pointer",
            !value && "text-muted-foreground"
          )}
        >
          {value && displayName ? (
            <>
              <Avatar className="h-4 w-4">
                <AvatarImage src={displayHeadshot} alt={displayName} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[80px] truncate">{displayName}</span>
            </>
          ) : (
            <>
              <User className="h-3.5 w-3.5" />
              <span>Assignee</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No team members
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
            {/* Unassign option */}
            <button
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                !value && "bg-accent"
              )}
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left text-muted-foreground">Unassigned</span>
              {!value && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>

            {members.map((member) => (
              <button
                key={member.contact.id}
                onClick={() => {
                  onChange(member.contact.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                  value === member.contact.id && "bg-accent"
                )}
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={member.contact.headshot?.[0]?.url}
                    alt={member.contact.fullName}
                  />
                  <AvatarFallback className="text-[9px]">
                    {getInitials(member.contact.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-left truncate">{member.contact.fullName}</span>
                {value === member.contact.id && (
                  <Check className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
