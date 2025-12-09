"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  Calendar,
  Edit,
  Users,
  User,
  ThumbsUp,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  Lock,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  parseAsLocalTime,
  getMentorParticipants,
  getLeadMentor,
} from "@/components/sessions/session-transformers";
import { EditorViewer } from "@/components/editor/editor-viewer";
import type { Session, SessionFeedback, Contact, UserType } from "@/types/schema";

interface FeedbackCardProps {
  feedback: SessionFeedback;
  /** Session is optional - only needed when showSessionInfo is true */
  session?: Session;
  userType: UserType;
  userContactId?: string;
  /** Show session details (type, date, team, mentor) - useful for chronological view */
  showSessionInfo?: boolean;
  /** Callback when edit button is clicked */
  onEdit?: () => void;
  /** Compact mode for embedding in other views */
  compact?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Segmented star rating - shows 5 stars with filled/unfilled state
 * Designed for vertical stacking with consistent alignment
 */
function SegmentedStarRating({ value, label }: { value?: number; label: string }) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-3.5 w-3.5",
              star <= value
                ? "text-amber-500 fill-amber-500"
                : "text-muted-foreground/25"
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium tabular-nums w-7">{value}/5</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Section component for text feedback fields
 */
function FeedbackSection({
  icon: Icon,
  iconClassName,
  title,
  content,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  content: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className={cn("h-4 w-4", iconClassName)} />
        {title}
        {badge}
      </div>
      <div className="text-sm text-muted-foreground pl-6">
        <EditorViewer content={content} />
      </div>
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
  compact = false,
}: FeedbackCardProps) {
  const respondent = feedback.respondant?.[0] as Contact | undefined;
  const respondentName = respondent?.fullName || "Anonymous";
  const isOwnFeedback = userContactId && respondent?.id === userContactId;
  const canEdit = (isOwnFeedback || userType === "staff") && onEdit;
  const isStaff = userType === "staff";
  const isMentor = userType === "mentor";
  const isStudent = userType === "student";
  const isMenteeFeedback = feedback.role === "Mentee";
  const isMentorFeedback = feedback.role === "Mentor";

  // Visibility rules:
  // 1. Mentors viewing student feedback: only show additionalNeeds
  // 2. Students viewing mentor feedback: hide ratings and privateNotes
  // 3. Staff sees everything
  const isMentorViewingStudentFeedback = isMentor && isMenteeFeedback;
  const showLimitedView = isMentorViewingStudentFeedback && feedback.additionalNeeds;
  const isStudentViewingMentorFeedback = isStudent && isMentorFeedback;
  const hideRatingsFromStudent = isStudentViewingMentorFeedback;

  const formattedDate = feedback.submitted
    ? format(parseAsLocalTime(feedback.submitted), "MMM d, yyyy 'at' h:mm a")
    : "";

  // Session info (only computed if showSessionInfo is true and session is provided)
  const sessionDate = session?.scheduledStart
    ? format(parseAsLocalTime(session.scheduledStart), "MMM d, yyyy")
    : "";
  const teamName = session?.team?.[0]?.teamName;
  const mentorParticipants = session ? getMentorParticipants(session) : [];
  const leadMentor = session ? getLeadMentor(session) : undefined;
  const mentorName = (() => {
    if (!session) return undefined;
    if (mentorParticipants.length === 0) return leadMentor?.fullName;
    const lead = leadMentor?.fullName || mentorParticipants[0]?.contact?.fullName;
    const otherCount = mentorParticipants.length - 1;
    if (!lead) return undefined;
    if (otherCount === 0) return lead;
    if (otherCount === 1) return `${lead} +1`;
    return `${lead} +${otherCount}`;
  })();

  // Determine what content to show
  const hasTextContent = showLimitedView
    ? true
    : feedback.whatWentWell ||
      feedback.areasForImprovement ||
      feedback.additionalNeeds ||
      feedback.suggestedNextSteps ||
      (isStaff && feedback.privateNotes);

  // Ratings visibility:
  // - Limited view (mentor viewing student): no ratings
  // - Student viewing mentor feedback: no ratings (menteeEngagement hidden)
  // - Otherwise: show ratings if they exist
  const showRatings = !showLimitedView && !hideRatingsFromStudent;
  const hasRatings = showRatings && (
    isMenteeFeedback
      ? (feedback.rating || feedback.contentRelevance || feedback.actionabilityOfAdvice || feedback.mentorPreparedness)
      : feedback.menteeEngagement
  );

  // Staff can see mentor's menteeEngagement rating even though students can't
  const staffCanSeeHiddenMentorRatings = isStaff && isMentorFeedback && feedback.menteeEngagement;

  return (
    <Card>
      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className={cn("h-10 w-10", compact && "h-9 w-9")}>
              <AvatarImage
                src={respondent?.headshot?.[0]?.url}
                alt={respondentName}
              />
              <AvatarFallback className="text-xs">
                {getInitials(respondentName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-medium">{respondentName}</CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    isMentorFeedback && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
                    isMenteeFeedback && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
                  )}
                >
                  {isMenteeFeedback ? "Student" : "Mentor"}
                </Badge>
                {isOwnFeedback && (
                  <Badge variant="secondary" className="text-xs">You</Badge>
                )}
              </div>
              {formattedDate && (
                <CardDescription className="text-xs mt-0.5">{formattedDate}</CardDescription>
              )}
            </div>
          </div>

          {canEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit feedback</span>
            </Button>
          )}
        </div>

        {/* Session Info (for chronological view) */}
        {showSessionInfo && session && (
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

        {/* Indicator for mentors that they're seeing partial view */}
        {isMentorViewingStudentFeedback && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Partial View
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className={cn("space-y-4", compact && "space-y-3")}>
        {/* Ratings Section - Student feedback ratings (visible to staff and students) */}
        {hasRatings && isMenteeFeedback && (
          <div className="space-y-1.5 p-3 rounded-lg bg-muted/50">
            <SegmentedStarRating value={feedback.rating} label="Overall" />
            <SegmentedStarRating value={feedback.contentRelevance} label="Relevance" />
            <SegmentedStarRating value={feedback.actionabilityOfAdvice} label="Actionability" />
            <SegmentedStarRating value={feedback.mentorPreparedness} label="Preparedness" />
          </div>
        )}

        {/* Mentor feedback ratings (staff only - hidden from students) */}
        {staffCanSeeHiddenMentorRatings && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Hidden from students</span>
            </div>
            <SegmentedStarRating value={feedback.menteeEngagement} label="Student Engagement" />
          </div>
        )}

        {/* Non-staff mentor feedback ratings */}
        {hasRatings && isMentorFeedback && !isStaff && (
          <div className="space-y-1.5 p-3 rounded-lg bg-muted/50">
            <SegmentedStarRating value={feedback.menteeEngagement} label="Student Engagement" />
          </div>
        )}

        {/* Text Content */}
        {hasTextContent && (
          <div className="space-y-4">
            {/* For mentors viewing student feedback, only show additionalNeeds */}
            {showLimitedView ? (
              <FeedbackSection
                icon={AlertTriangle}
                iconClassName="text-blue-600 dark:text-blue-400"
                title="Additional Needs"
                content={feedback.additionalNeeds!}
              />
            ) : (
              <>
                {feedback.whatWentWell && (
                  <FeedbackSection
                    icon={ThumbsUp}
                    iconClassName="text-green-600 dark:text-green-400"
                    title="What Went Well"
                    content={feedback.whatWentWell}
                  />
                )}

                {feedback.areasForImprovement && (
                  <FeedbackSection
                    icon={Lightbulb}
                    iconClassName="text-amber-600 dark:text-amber-400"
                    title="Areas for Improvement"
                    content={feedback.areasForImprovement}
                  />
                )}

                {feedback.additionalNeeds && (
                  <FeedbackSection
                    icon={AlertTriangle}
                    iconClassName="text-blue-600 dark:text-blue-400"
                    title="Additional Needs"
                    content={feedback.additionalNeeds}
                  />
                )}

                {feedback.suggestedNextSteps && (
                  <FeedbackSection
                    icon={ArrowRight}
                    iconClassName="text-indigo-600 dark:text-indigo-400"
                    title="Suggested Next Steps"
                    content={feedback.suggestedNextSteps}
                  />
                )}

                {/* Private Notes (Staff only) */}
                {isStaff && feedback.privateNotes && (
                  <div className="border-t pt-4 mt-4">
                    <FeedbackSection
                      icon={Lock}
                      iconClassName="text-muted-foreground"
                      title="Private Notes"
                      content={feedback.privateNotes}
                      badge={
                        <Badge variant="secondary" className="text-xs ml-1">
                          Staff Only
                        </Badge>
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Follow-up Request */}
        {isMenteeFeedback && feedback.requestFollowUp && !showLimitedView && (
          <Badge
            variant="outline"
            className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
          >
            Follow-up Requested
          </Badge>
        )}

        {/* Empty state if no content */}
        {!hasTextContent && !hasRatings && !staffCanSeeHiddenMentorRatings && (
          <p className="text-sm text-muted-foreground italic">No detailed feedback provided</p>
        )}
      </CardContent>
    </Card>
  );
}
