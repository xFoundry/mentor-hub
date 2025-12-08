"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Calendar, Edit, Users, User } from "lucide-react";
import { format } from "date-fns";
import {
  parseAsLocalTime,
  getMentorParticipants,
  getLeadMentor,
} from "@/components/sessions/session-transformers";
import type { Session, SessionFeedback, Contact, UserType } from "@/types/schema";

interface FeedbackCardProps {
  feedback: SessionFeedback;
  session: Session;
  userType: UserType;
  userContactId?: string;
  showSessionInfo?: boolean;
  onEdit?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function StarRating({ value, label }: { value?: number; label: string }) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground min-w-[100px]">{label}:</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= value ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{value}/5</span>
    </div>
  );
}

export function FeedbackCard({
  feedback,
  session,
  userType,
  userContactId,
  showSessionInfo = false,
  onEdit,
}: FeedbackCardProps) {
  const respondent = feedback.respondant?.[0] as Contact | undefined;
  const respondentName = respondent?.fullName || "Anonymous";
  const isOwnFeedback = userContactId && respondent?.id === userContactId;
  const canEdit = isOwnFeedback || userType === "staff";
  const isStaff = userType === "staff";
  const isMentor = userType === "mentor";
  const isMenteeFeedback = feedback.role === "Mentee";

  // For mentors viewing student feedback: only show if additionalNeeds is present,
  // and only show that field (not other fields like ratings, whatWentWell, etc.)
  const isMentorViewingStudentFeedback = isMentor && isMenteeFeedback;
  const showLimitedView = isMentorViewingStudentFeedback && feedback.additionalNeeds;

  const formattedDate = feedback.submitted
    ? format(parseAsLocalTime(feedback.submitted), "MMM d, yyyy 'at' h:mm a")
    : "";

  const sessionDate = session.scheduledStart
    ? format(parseAsLocalTime(session.scheduledStart), "MMM d, yyyy")
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

  // Check if there's any text content (respecting mentor visibility rules)
  const hasTextContent = showLimitedView
    ? true // We know additionalNeeds exists if showLimitedView is true
    : feedback.whatWentWell ||
      feedback.areasForImprovement ||
      feedback.additionalNeeds ||
      feedback.suggestedNextSteps ||
      (isStaff && feedback.privateNotes);

  // Check if there are any ratings to show (mentors don't see student ratings)
  const hasRatings = showLimitedView
    ? false
    : isMenteeFeedback
    ? feedback.rating || feedback.contentRelevance || feedback.actionabilityOfAdvice || feedback.mentorPreparedness
    : feedback.menteeEngagement;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs">
                {getInitials(respondentName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{respondentName}</span>
                <Badge variant={isMenteeFeedback ? "secondary" : "outline"} className="text-xs">
                  {isMenteeFeedback ? "Student" : "Mentor"}
                </Badge>
                {isOwnFeedback && (
                  <Badge variant="outline" className="text-xs">You</Badge>
                )}
              </div>
              {formattedDate && (
                <p className="text-xs text-muted-foreground">{formattedDate}</p>
              )}
            </div>
          </div>

          {canEdit && onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Session Info (for chronological view) */}
        {showSessionInfo && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground border-t pt-3">
            <Badge variant="outline">{session.sessionType}</Badge>
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
        )}

        {/* For staff: show who the feedback is for */}
        {isStaff && showSessionInfo && (
          <div className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">For:</span>{" "}
            {isMenteeFeedback
              ? `${mentorName || "Unknown Mentor"}`
              : `${teamName || "Unknown Team"}`}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Ratings Section */}
        {hasRatings && (
          <div className="space-y-1.5 rounded-md bg-muted/50 p-3">
            {isMenteeFeedback ? (
              <>
                <StarRating value={feedback.rating} label="Overall" />
                <StarRating value={feedback.contentRelevance} label="Relevance" />
                <StarRating value={feedback.actionabilityOfAdvice} label="Actionability" />
                <StarRating value={feedback.mentorPreparedness} label="Preparedness" />
              </>
            ) : (
              <StarRating value={feedback.menteeEngagement} label="Engagement" />
            )}
          </div>
        )}

        {/* Text Content */}
        {hasTextContent && (
          <div className="space-y-3">
            {/* For mentors viewing student feedback, only show additionalNeeds */}
            {showLimitedView ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Additional Needs</p>
                <p className="text-sm">{feedback.additionalNeeds}</p>
              </div>
            ) : (
              <>
                {feedback.whatWentWell && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">What Went Well</p>
                    <p className="text-sm">{feedback.whatWentWell}</p>
                  </div>
                )}

                {feedback.areasForImprovement && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Areas for Improvement</p>
                    <p className="text-sm">{feedback.areasForImprovement}</p>
                  </div>
                )}

                {feedback.additionalNeeds && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Additional Needs</p>
                    <p className="text-sm">{feedback.additionalNeeds}</p>
                  </div>
                )}

                {feedback.suggestedNextSteps && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Suggested Next Steps</p>
                    <p className="text-sm">{feedback.suggestedNextSteps}</p>
                  </div>
                )}

                {/* Private Notes (Staff only) */}
                {isStaff && feedback.privateNotes && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-muted-foreground">Private Notes</p>
                      <Badge variant="secondary" className="text-xs">Staff Only</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground italic">{feedback.privateNotes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Follow-up Request (not shown to mentors viewing student feedback) */}
        {isMenteeFeedback && feedback.requestFollowUp && !showLimitedView && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              Follow-up Requested
            </Badge>
          </div>
        )}

        {/* Empty state if no content */}
        {!hasTextContent && !hasRatings && (
          <p className="text-sm text-muted-foreground italic">No detailed feedback provided</p>
        )}
      </CardContent>
    </Card>
  );
}
