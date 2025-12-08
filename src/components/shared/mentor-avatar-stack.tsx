"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Session, EnrichedMentorParticipant } from "@/types/schema";
import { getMentorParticipants, getLeadMentor } from "@/components/sessions/session-transformers";
import { cn } from "@/lib/utils";

interface MentorAvatarStackProps {
  session: Session;
  /** Maximum number of avatars to show before overflow badge */
  maxDisplay?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Current user's email for "You" badge */
  currentUserEmail?: string;
  /** Show names next to avatars (compact mode shows just avatars) */
  showNames?: boolean;
  /** Show role badges (Lead, Supporting, etc.) */
  showRoles?: boolean;
  /** Custom class for the container */
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

const overlapClasses = {
  sm: "-ml-2",
  md: "-ml-3",
  lg: "-ml-4",
};

export function MentorAvatarStack({
  session,
  maxDisplay = 3,
  size = "md",
  currentUserEmail,
  showNames = false,
  showRoles = false,
  className,
}: MentorAvatarStackProps) {
  const mentors = getMentorParticipants(session);

  if (mentors.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">No mentor assigned</span>
    );
  }

  const displayedMentors = mentors.slice(0, maxDisplay);
  const overflowCount = mentors.length - maxDisplay;

  // For single mentor, show simple display
  if (mentors.length === 1 && showNames) {
    const mentor = mentors[0];
    const isCurrentUser = currentUserEmail && mentor.contact?.email === currentUserEmail;

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Avatar className={cn(sizeClasses[size], mentor.isLead && "ring-2 ring-primary ring-offset-2")}>
          <AvatarImage
            src={mentor.contact?.headshot?.[0]?.url}
            alt={mentor.contact?.fullName}
          />
          <AvatarFallback>
            {mentor.contact?.fullName?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm flex items-center gap-1">
          {mentor.contact?.fullName}
          {showRoles && mentor.isLead && (
            <Badge variant="outline" className="text-xs py-0 px-1">Lead</Badge>
          )}
          {isCurrentUser && (
            <Badge variant="secondary" className="text-xs py-0 px-1.5">You</Badge>
          )}
        </span>
      </div>
    );
  }

  // For multiple mentors or no-names mode
  return (
    <div className={cn("flex items-center", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            {displayedMentors.map((mentor, index) => {
              const isCurrentUser = currentUserEmail && mentor.contact?.email === currentUserEmail;

              return (
                <div
                  key={mentor.id}
                  className={cn(
                    "relative",
                    index > 0 && overlapClasses[size]
                  )}
                  style={{ zIndex: displayedMentors.length - index }}
                >
                  <Avatar
                    className={cn(
                      sizeClasses[size],
                      "border-2 border-background",
                      mentor.isLead && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    <AvatarImage
                      src={mentor.contact?.headshot?.[0]?.url}
                      alt={mentor.contact?.fullName}
                    />
                    <AvatarFallback>
                      {mentor.contact?.fullName?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {isCurrentUser && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-primary border border-background" />
                  )}
                </div>
              );
            })}

            {overflowCount > 0 && (
              <div
                className={cn(
                  overlapClasses[size],
                  sizeClasses[size],
                  "flex items-center justify-center rounded-full bg-muted border-2 border-background font-medium"
                )}
                style={{ zIndex: 0 }}
              >
                +{overflowCount}
              </div>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">Mentors ({mentors.length})</p>
            <ul className="space-y-0.5">
              {mentors.map((mentor) => {
                const isCurrentUser = currentUserEmail && mentor.contact?.email === currentUserEmail;
                return (
                  <li key={mentor.id} className="flex items-center gap-1 text-xs">
                    <span>{mentor.contact?.fullName}</span>
                    {mentor.isLead && (
                      <span className="text-primary">(Lead)</span>
                    )}
                    {mentor.role === "Supporting Mentor" && (
                      <span className="opacity-70">(Supporting)</span>
                    )}
                    {mentor.role === "Observer" && (
                      <span className="opacity-70">(Observer)</span>
                    )}
                    {isCurrentUser && (
                      <span className="text-primary">(You)</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>

      {showNames && (
        <span className="ml-2 text-sm">
          {mentors.length === 1
            ? mentors[0].contact?.fullName
            : `${mentors.length} mentors`}
        </span>
      )}
    </div>
  );
}

/**
 * Simple text display for mentors (for compact areas)
 */
export function MentorTextDisplay({
  session,
  currentUserEmail,
  prefix = "with",
}: {
  session: Session;
  currentUserEmail?: string;
  prefix?: string;
}) {
  const mentors = getMentorParticipants(session);
  const leadMentor = getLeadMentor(session);

  if (mentors.length === 0) {
    return null;
  }

  const isCurrentUserMentor = currentUserEmail &&
    mentors.some(m => m.contact?.email === currentUserEmail);

  if (mentors.length === 1) {
    return (
      <span className="flex items-center gap-1">
        {prefix} {leadMentor?.fullName}
        {isCurrentUserMentor && (
          <Badge variant="secondary" className="text-xs py-0 px-1.5">You</Badge>
        )}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      {prefix} {leadMentor?.fullName}
      <span className="text-muted-foreground">+{mentors.length - 1}</span>
      {isCurrentUserMentor && (
        <Badge variant="secondary" className="text-xs py-0 px-1.5">You</Badge>
      )}
    </span>
  );
}
