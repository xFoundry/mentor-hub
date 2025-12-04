"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  CheckCircle2,
  Star,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  AlertTriangle,
  Clock,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMentorFeedback, hasMenteeFeedback, isSessionEligibleForFeedback } from "@/components/sessions/session-transformers";
import type { Session, SessionFeedback } from "@/types/schema";
import type { UserType } from "@/lib/permissions";
import type { SessionPhase } from "@/hooks/use-session-phase";

interface SessionFeedbackTabProps {
  session: Session;
  userType: UserType;
  phase: SessionPhase;
  userEmail?: string;
  /** Callback to open feedback dialog */
  onAddFeedback?: () => void;
}

export function SessionFeedbackTab({
  session,
  userType,
  phase,
  userEmail,
  onAddFeedback,
}: SessionFeedbackTabProps) {
  const isEligible = isSessionEligibleForFeedback(session);
  const isMentor = userType === "mentor";
  const isStudent = userType === "student";
  const isStaff = userType === "staff";

  // Filter feedback based on visibility rules
  const visibleFeedback = useMemo(() => {
    const allFeedback = session.sessionFeedback || session.feedback || [];
    return allFeedback.filter((feedback: SessionFeedback) => {
      if (isStaff) return true;
      if (isStudent) return true;
      // Mentors see mentor feedback + student feedback ONLY if additionalNeeds is present
      if (isMentor) {
        return feedback.role === "Mentor" || (feedback.role === "Mentee" && feedback.additionalNeeds);
      }
      return false;
    });
  }, [session, isStaff, isStudent, isMentor]);

  // Check if user needs to provide feedback
  const needsFeedback = isEligible && (
    (isMentor && !hasMentorFeedback(session)) ||
    ((isStudent || isStaff) && !hasMenteeFeedback(session) && isStudent)
  );

  const mentorFeedback = visibleFeedback.filter((f: SessionFeedback) => f.role === "Mentor");
  const studentFeedback = visibleFeedback.filter((f: SessionFeedback) => f.role === "Mentee");

  return (
    <div className="space-y-6">
      {/* Not eligible notice */}
      {!isEligible && phase !== "completed" && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Feedback available after the session</AlertTitle>
          <AlertDescription>
            You'll be able to submit feedback once this session is completed.
          </AlertDescription>
        </Alert>
      )}

      {/* Feedback prompt */}
      {needsFeedback && (
        <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
          <MessageSquare className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Your feedback is needed
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <p>
              {isMentor
                ? "Share your observations and suggestions to help the team grow."
                : "Let us know how the session went and if you need any additional support."}
            </p>
            <Button
              onClick={onAddFeedback}
              className="mt-3"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Feedback
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Already submitted notice */}
      {isEligible && !needsFeedback && (
        (isMentor && hasMentorFeedback(session)) ||
        (isStudent && hasMenteeFeedback(session))
      ) && (
        <Alert className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Thank you for your feedback
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Your feedback helps improve the mentorship experience.
          </AlertDescription>
        </Alert>
      )}

      {/* Mentor Feedback Section */}
      {mentorFeedback.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mentor Feedback
          </h3>
          {mentorFeedback.map((feedback: SessionFeedback) => (
            <FeedbackCard
              key={feedback.id}
              feedback={feedback}
              showPrivateFields={isStaff}
            />
          ))}
        </div>
      )}

      {/* Student Feedback Section */}
      {studentFeedback.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Student Feedback
            {isMentor && (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Partial View
              </Badge>
            )}
          </h3>
          {studentFeedback.map((feedback: SessionFeedback) => (
            <FeedbackCard
              key={feedback.id}
              feedback={feedback}
              showPrivateFields={isStaff}
              showRatings={isStaff || isStudent}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {visibleFeedback.length === 0 && isEligible && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">No feedback yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isMentor
                ? "Be the first to share feedback for this session"
                : "Feedback from your mentor will appear here"}
            </p>
            {needsFeedback && (
              <Button onClick={onAddFeedback} className="mt-4">
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Feedback
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Individual feedback card
 */
function FeedbackCard({
  feedback,
  showPrivateFields = false,
  showRatings = false,
}: {
  feedback: SessionFeedback;
  showPrivateFields?: boolean;
  showRatings?: boolean;
}) {
  const respondent = feedback.respondant?.[0];
  const isMentorFeedback = feedback.role === "Mentor";

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={respondent?.headshot?.[0]?.url}
                alt={respondent?.fullName || "User"}
              />
              <AvatarFallback>{getInitials(respondent?.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm font-medium">
                {respondent?.fullName || (isMentorFeedback ? "Mentor" : "Student")}
              </CardTitle>
              <CardDescription className="text-xs">
                {isMentorFeedback ? "Mentor Feedback" : "Student Feedback"}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn(
            "text-xs",
            isMentorFeedback && "bg-blue-50 text-blue-700 border-blue-200",
            !isMentorFeedback && "bg-purple-50 text-purple-700 border-purple-200"
          )}>
            {feedback.role}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ratings (student feedback, visible to staff and students) */}
        {showRatings && !isMentorFeedback && (feedback.rating || feedback.contentRelevance || feedback.mentorPreparedness) && (
          <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-muted/50">
            {feedback.rating && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium">{feedback.rating}/5</span>
                <span className="text-xs text-muted-foreground">Overall</span>
              </div>
            )}
            {feedback.contentRelevance && (
              <div className="text-sm">
                <span className="text-muted-foreground">Content: </span>
                <span className="font-medium">{feedback.contentRelevance}/5</span>
              </div>
            )}
            {feedback.mentorPreparedness && (
              <div className="text-sm">
                <span className="text-muted-foreground">Preparedness: </span>
                <span className="font-medium">{feedback.mentorPreparedness}/5</span>
              </div>
            )}
          </div>
        )}

        {/* What Went Well */}
        {feedback.whatWentWell && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
              <ThumbsUp className="h-4 w-4" />
              What Went Well
            </div>
            <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
              {feedback.whatWentWell}
            </p>
          </div>
        )}

        {/* Areas for Improvement */}
        {feedback.areasForImprovement && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <Lightbulb className="h-4 w-4" />
              Areas for Improvement
            </div>
            <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
              {feedback.areasForImprovement}
            </p>
          </div>
        )}

        {/* Additional Needs (visible when present) */}
        {feedback.additionalNeeds && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
              <AlertTriangle className="h-4 w-4" />
              Additional Needs
            </div>
            <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
              {feedback.additionalNeeds}
            </p>
          </div>
        )}

        {/* Suggested Next Steps (mentor feedback, staff only) */}
        {showPrivateFields && isMentorFeedback && feedback.suggestedNextSteps && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Suggested Next Steps
              <Badge variant="outline" className="text-xs">Staff Only</Badge>
            </div>
            <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
              {feedback.suggestedNextSteps}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
