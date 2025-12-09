"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Lock,
} from "lucide-react";
import { hasMentorFeedback, hasMenteeFeedback, isSessionEligibleForFeedback } from "@/components/sessions/session-transformers";
import { FeedbackCard } from "@/components/feedback/feedback-card";
import type { Session, SessionFeedback } from "@/types/schema";
import type { UserType } from "@/lib/permissions";
import type { SessionPhase } from "@/hooks/use-session-phase";

interface SessionFeedbackTabProps {
  session: Session;
  userType: UserType;
  phase: SessionPhase;
  userContactId?: string;
  /** Callback to open feedback dialog */
  onAddFeedback?: () => void;
  /** Callback to edit existing feedback */
  onEditFeedback?: (feedback: SessionFeedback) => void;
}

export function SessionFeedbackTab({
  session,
  userType,
  phase,
  userContactId,
  onAddFeedback,
  onEditFeedback,
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
              userType={userType}
              userContactId={userContactId}
              onEdit={onEditFeedback ? () => onEditFeedback(feedback) : undefined}
              compact
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
              userType={userType}
              userContactId={userContactId}
              onEdit={onEditFeedback ? () => onEditFeedback(feedback) : undefined}
              compact
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
