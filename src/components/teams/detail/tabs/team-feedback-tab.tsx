"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import {
  MessageSquare,
  ThumbsUp,
  Lightbulb,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import { parseAsLocalTime } from "@/components/sessions/session-transformers";
import { cn } from "@/lib/utils";
import type { SessionFeedback } from "@/types/schema";
import type { TeamTabBaseProps, FeedbackWithSession } from "./types";

interface TeamFeedbackTabProps extends TeamTabBaseProps {}

export function TeamFeedbackTab({
  team,
  userContext,
  userType,
}: TeamFeedbackTabProps) {
  const sessions = team.mentorshipSessions || [];
  const isStaff = userType === "staff";
  const isMentor = userType === "mentor";

  // Extract all feedback from sessions with session context
  const allFeedback = useMemo<FeedbackWithSession[]>(() => {
    return sessions
      .filter((s) => s.feedback && s.feedback.length > 0)
      .flatMap((s) =>
        (s.feedback || []).map((fb: SessionFeedback) => ({
          id: fb.id,
          role: fb.role,
          whatWentWell: fb.whatWentWell,
          areasForImprovement: fb.areasForImprovement,
          additionalNeeds: fb.additionalNeeds,
          respondant: fb.respondant,
          session: {
            id: s.id,
            sessionType: s.sessionType,
            scheduledStart: s.scheduledStart,
          },
        }))
      );
  }, [sessions]);

  // Apply visibility rules
  const visibleFeedback = useMemo(() => {
    if (isStaff) {
      // Staff sees all feedback
      return allFeedback;
    }

    if (isMentor) {
      // Mentors see:
      // - All mentor feedback
      // - Student feedback ONLY if additionalNeeds is present
      return allFeedback.filter((fb) => {
        if (fb.role === "Mentor") return true;
        if (fb.role === "Mentee" && fb.additionalNeeds) return true;
        return false;
      });
    }

    // Students don't have access to the feedback tab
    return [];
  }, [allFeedback, isStaff, isMentor]);

  // Group feedback by mentor vs student
  const mentorFeedback = visibleFeedback.filter((f) => f.role === "Mentor");
  const studentFeedback = visibleFeedback.filter((f) => f.role === "Mentee");

  if (visibleFeedback.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={MessageSquare}
            title="No feedback yet"
            description="Feedback will appear here after sessions are completed"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mentor Feedback Section */}
      {mentorFeedback.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mentor Feedback
          </h3>
          {mentorFeedback.map((feedback) => (
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
          {studentFeedback.map((feedback) => (
            <FeedbackCard
              key={feedback.id}
              feedback={feedback}
              showPrivateFields={isStaff}
              showAllFields={isStaff}
            />
          ))}
        </div>
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
  showAllFields = true,
}: {
  feedback: FeedbackWithSession;
  showPrivateFields?: boolean;
  showAllFields?: boolean;
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={respondent?.headshot?.[0]?.url}
                alt={respondent?.fullName || "User"}
              />
              <AvatarFallback>{getInitials(respondent?.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {feedback.session.sessionType || "Session"} Feedback
              </CardTitle>
              {feedback.session.scheduledStart && (
                <CardDescription>
                  {format(parseAsLocalTime(feedback.session.scheduledStart), "MMMM d, yyyy")}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isMentorFeedback && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300",
                !isMentorFeedback && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300"
              )}
            >
              {feedback.role}
            </Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/sessions/${feedback.session.id}`}>
                View Session
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* What Went Well */}
        {showAllFields && feedback.whatWentWell && (
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
        {showAllFields && feedback.areasForImprovement && (
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

        {/* Additional Needs (always visible when present) */}
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
      </CardContent>
    </Card>
  );
}
