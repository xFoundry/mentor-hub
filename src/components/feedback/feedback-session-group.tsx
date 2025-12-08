"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Calendar, Users, User, MessageSquarePlus } from "lucide-react";
import {
  getMentorParticipants,
  getLeadMentor,
} from "@/components/sessions/session-transformers";
import { formatAsEastern } from "@/lib/timezone";
import { FeedbackCard } from "./feedback-card";
import { useFeedbackDialog } from "@/contexts/feedback-dialog-context";
import type { Session, SessionFeedback, UserType } from "@/types/schema";

interface FeedbackSessionGroupProps {
  session: Session;
  feedback: SessionFeedback[];
  userType: UserType;
  userContactId?: string;
  canAddFeedback?: boolean;
  defaultOpen?: boolean;
}

export function FeedbackSessionGroup({
  session,
  feedback,
  userType,
  userContactId,
  canAddFeedback = false,
  defaultOpen = true,
}: FeedbackSessionGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { openFeedbackDialog } = useFeedbackDialog();

  const sessionDate = session.scheduledStart
    ? formatAsEastern(session.scheduledStart, "MMM d, yyyy")
    : "";

  const teamName = session.team?.[0]?.teamName;

  // Format mentor name(s) for display
  const mentorParticipants = getMentorParticipants(session);
  const leadMentor = getLeadMentor(session);
  const mentorName = (() => {
    if (mentorParticipants.length === 0) return leadMentor?.fullName;
    const lead = leadMentor?.fullName || mentorParticipants[0]?.contact?.fullName;
    const otherCount = mentorParticipants.length - 1;
    if (!lead) return undefined;
    if (otherCount === 0) return lead;
    if (otherCount === 1) return `${lead} +1`;
    return `${lead} +${otherCount}`;
  })();

  // Find user's own feedback for editing
  const findUserFeedback = (fb: SessionFeedback) => {
    return userContactId && fb.respondant?.[0]?.id === userContactId;
  };

  const handleEditFeedback = (fb: SessionFeedback) => {
    openFeedbackDialog(session, fb);
  };

  const handleAddFeedback = () => {
    openFeedbackDialog(session);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {session.sessionType}
                    <Badge variant="outline" className="text-xs">
                      {feedback.length} feedback{feedback.length !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {sessionDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{sessionDate}</span>
                      </div>
                    )}
                    {teamName && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{teamName}</span>
                      </div>
                    )}
                    {mentorName && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{mentorName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Feedback Button (shown when user hasn't submitted yet) */}
              {canAddFeedback && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddFeedback();
                  }}
                >
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Add Feedback
                </Button>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {feedback.length > 0 ? (
              <div className="space-y-4">
                {feedback.map((fb) => (
                  <FeedbackCard
                    key={fb.id}
                    feedback={fb}
                    session={session}
                    userType={userType}
                    userContactId={userContactId}
                    showSessionInfo={false}
                    onEdit={
                      findUserFeedback(fb) || userType === "staff"
                        ? () => handleEditFeedback(fb)
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No feedback submitted for this session yet
                </p>
                {canAddFeedback && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleAddFeedback}
                  >
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Be the first to add feedback
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
