"use client";

import { useMemo } from "react";
import { FeedbackCard } from "./feedback-card";
import { FeedbackSessionGroup } from "./feedback-session-group";
import { useFeedbackDialog } from "@/contexts/feedback-dialog-context";
import { parseAsLocalTime, isSessionEligibleForFeedback } from "@/components/sessions/session-transformers";
import type { Session, SessionFeedback, UserType } from "@/types/schema";
import type { FeedbackGroupBy } from "./feedback-view-toggle";

interface FeedbackWithSession {
  feedback: SessionFeedback;
  session: Session;
}

interface FeedbackFeedProps {
  sessions: Session[];
  groupBy: FeedbackGroupBy;
  userType: UserType;
  userContactId?: string;
}

/**
 * Get visible feedback based on user type and session
 * - Staff sees all feedback including privateNotes
 * - Students see all feedback but without privateNotes
 * - Mentors see mentor feedback + student feedback only if additionalNeeds is present
 */
function getVisibleFeedback(
  session: Session,
  userType: UserType
): SessionFeedback[] {
  const feedback = session.feedback || [];

  if (userType === "staff") {
    return feedback;
  }

  if (userType === "mentor") {
    // Mentors see:
    // 1. All mentor feedback (their own and others')
    // 2. Student feedback ONLY if additionalNeeds is not empty
    return feedback
      .filter((f) => f.role === "Mentor" || (f.role === "Mentee" && f.additionalNeeds))
      .map((f) => ({ ...f, privateNotes: undefined }));
  }

  // Students see all feedback but strip privateNotes
  return feedback.map((f) => ({ ...f, privateNotes: undefined }));
}

/**
 * Check if user can add feedback to a session
 */
function canUserAddFeedback(
  session: Session,
  userType: UserType,
  userContactId?: string
): boolean {
  // Session must be eligible (completed or past scheduled time)
  if (!isSessionEligibleForFeedback(session)) return false;

  const feedback = session.feedback || [];

  if (userType === "student") {
    // Students can add feedback if they haven't submitted mentee feedback
    return !feedback.some(
      (f) => f.role === "Mentee" && f.respondant?.[0]?.id === userContactId
    );
  }

  if (userType === "mentor" || userType === "staff") {
    // Mentors/staff can add feedback if they haven't submitted mentor feedback
    return !feedback.some(
      (f) => f.role === "Mentor" && f.respondant?.[0]?.id === userContactId
    );
  }

  return false;
}

export function FeedbackFeed({
  sessions,
  groupBy,
  userType,
  userContactId,
}: FeedbackFeedProps) {
  const { openFeedbackDialog } = useFeedbackDialog();

  // Extract all feedback with their sessions
  const allFeedbackWithSessions = useMemo((): FeedbackWithSession[] => {
    const result: FeedbackWithSession[] = [];

    for (const session of sessions) {
      const visibleFeedback = getVisibleFeedback(session, userType);
      for (const feedback of visibleFeedback) {
        result.push({ feedback, session });
      }
    }

    // Sort by submitted date, most recent first
    result.sort((a, b) => {
      const dateA = a.feedback.submitted
        ? parseAsLocalTime(a.feedback.submitted).getTime()
        : 0;
      const dateB = b.feedback.submitted
        ? parseAsLocalTime(b.feedback.submitted).getTime()
        : 0;
      return dateB - dateA;
    });

    return result;
  }, [sessions, userType]);

  // Get sessions that have feedback or are eligible for feedback
  const sessionsWithFeedback = useMemo(() => {
    return sessions
      .filter((s) => {
        const hasFeedback = (s.feedback || []).length > 0;
        const canAdd = canUserAddFeedback(s, userType, userContactId);
        return hasFeedback || canAdd;
      })
      .sort((a, b) => {
        // Sort by scheduled start, most recent first
        const dateA = a.scheduledStart
          ? parseAsLocalTime(a.scheduledStart).getTime()
          : 0;
        const dateB = b.scheduledStart
          ? parseAsLocalTime(b.scheduledStart).getTime()
          : 0;
        return dateB - dateA;
      });
  }, [sessions, userType, userContactId]);

  // Empty state
  if (allFeedbackWithSessions.length === 0 && sessionsWithFeedback.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">No feedback yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Feedback will appear here once sessions are completed
        </p>
      </div>
    );
  }

  // Chronological view - flat list of feedback
  if (groupBy === "chronological") {
    if (allFeedbackWithSessions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">No feedback submitted yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Complete a session and submit your feedback to see it here
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {allFeedbackWithSessions.map(({ feedback, session }) => (
          <FeedbackCard
            key={feedback.id}
            feedback={feedback}
            session={session}
            userType={userType}
            userContactId={userContactId}
            showSessionInfo={true}
            onEdit={
              (userContactId && feedback.respondant?.[0]?.id === userContactId) ||
              userType === "staff"
                ? () => openFeedbackDialog(session, feedback)
                : undefined
            }
          />
        ))}
      </div>
    );
  }

  // By-session view - grouped by session
  return (
    <div className="space-y-4">
      {sessionsWithFeedback.map((session) => {
        const visibleFeedback = getVisibleFeedback(session, userType);
        const canAdd = canUserAddFeedback(session, userType, userContactId);

        return (
          <FeedbackSessionGroup
            key={session.id}
            session={session}
            feedback={visibleFeedback}
            userType={userType}
            userContactId={userContactId}
            canAddFeedback={canAdd}
            defaultOpen={visibleFeedback.length > 0}
          />
        );
      })}
    </div>
  );
}
