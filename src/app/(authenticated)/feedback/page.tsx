"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserType } from "@/hooks/use-user-type";
import { useSessions } from "@/hooks/use-sessions";
import { useCohortContext } from "@/contexts/cohort-context";
import { useFeedbackDialog } from "@/contexts/feedback-dialog-context";
import { hasPermission } from "@/lib/permissions";
import { isSessionEligibleForFeedback } from "@/components/sessions/session-transformers";
import {
  FeedbackFeed,
  FeedbackViewToggle,
  type FeedbackGroupBy,
} from "@/components/feedback";
import { MessageSquare, MessageSquarePlus } from "lucide-react";

export default function FeedbackPage() {
  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { selectedCohortId } = useCohortContext();
  const { sessions, isLoading: isSessionsLoading } = useSessions(
    userContext?.email,
    selectedCohortId
  );
  const { openFeedbackDialogForSelection } = useFeedbackDialog();

  const [groupBy, setGroupBy] = useState<FeedbackGroupBy>("chronological");

  const isLoading = isUserLoading || isSessionsLoading;
  const isStudent = userType === "student";
  const isStaff = userType === "staff";

  // Check if user can provide feedback
  const canProvideFeedback =
    userType && hasPermission(userType, "sessionFeedback", "create");

  // Calculate eligible sessions for feedback
  const eligibleSessions = useMemo(() => {
    if (!sessions.length || !userContext) return [];

    return sessions.filter((session) => {
      // Staff can add to any session
      if (isStaff) return true;

      // Must be eligible (completed or past)
      if (!isSessionEligibleForFeedback(session)) return false;

      // User hasn't already submitted their role's feedback
      const feedback = session.feedback || [];
      const hasUserFeedback = feedback.some(
        (f: { respondant?: Array<{ id?: string }>; role?: string }) =>
          f.respondant?.[0]?.id === userContext.contactId &&
          (isStudent ? f.role === "Mentee" : f.role === "Mentor")
      );
      return !hasUserFeedback;
    });
  }, [sessions, userContext, isStudent, isStaff]);

  // Determine if button should be disabled and why
  const getDisabledReason = (): string | null => {
    if (isSessionsLoading) return "Loading sessions...";
    if (sessions.length === 0) return "No mentorship sessions found";
    if (eligibleSessions.length === 0) {
      // Check if there are future sessions
      const hasFutureSessions = sessions.some(
        (s) => !isSessionEligibleForFeedback(s) && s.status !== "Cancelled" && s.status !== "No-Show"
      );
      if (hasFutureSessions) {
        return "Your sessions haven't occurred yet";
      }
      return "You've already submitted feedback for all your sessions";
    }
    return null;
  };

  const disabledReason = getDisabledReason();

  // Handle opening the feedback dialog with session selection
  const handleAddFeedback = () => {
    openFeedbackDialogForSelection(sessions);
  };

  // Show access denied for users who can't view feedback
  if (!isLoading && !canProvideFeedback && !isStaff) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground mt-2">
            View and submit session feedback
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="text-muted-foreground mb-4 h-12 w-12" />
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">Access Restricted</p>
              <p className="text-sm">
                You do not have permission to view session feedback
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground mt-2">
            {isStudent
              ? "View and submit feedback for your mentorship sessions"
              : isStaff
              ? "Review all session feedback across the program"
              : "View and submit feedback for your sessions"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FeedbackViewToggle value={groupBy} onChange={setGroupBy} />
          {canProvideFeedback && (
            disabledReason && !isStaff ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button disabled>
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      Add Feedback
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{disabledReason}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={handleAddFeedback}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Add Feedback
              </Button>
            )
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !userType ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="text-muted-foreground mb-4 h-12 w-12" />
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">Unable to load feedback</p>
              <p className="text-sm">Please try refreshing the page</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <FeedbackFeed
          sessions={sessions}
          groupBy={groupBy}
          userType={userType}
          userContactId={userContext?.contactId}
        />
      )}
    </div>
  );
}
