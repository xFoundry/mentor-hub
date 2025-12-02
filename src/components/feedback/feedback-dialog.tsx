"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { parseAsLocalTime } from "@/components/sessions/session-transformers";
import { useFeedbackDialog } from "@/contexts/feedback-dialog-context";
import { useUserType } from "@/hooks/use-user-type";
import { useFeedback } from "@/hooks/use-feedback";
import { FeedbackForm, type FeedbackFormValues } from "./feedback-form";
import { SessionSelector } from "./session-selector";
import { Calendar, Users, User } from "lucide-react";
import type { Session } from "@/types/schema";

export function FeedbackDialog() {
  const {
    isOpen,
    session,
    existingFeedback,
    mode,
    availableSessions,
    selectSession,
    closeFeedbackDialog,
  } = useFeedbackDialog();
  const { userContext, userType } = useUserType();
  const { submitFeedback, updateFeedback, isSubmitting } = useFeedback();

  // State for staff role selection
  const [staffRole, setStaffRole] = useState<"Mentor" | "Mentee">("Mentor");

  // State for tracking form dirty state and pending session change
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [showChangeWarning, setShowChangeWarning] = useState(false);

  const isStaff = userType === "staff";

  // Handle session selection with dirty form check
  const handleSessionSelect = useCallback(
    (newSession: Session) => {
      if (session && isFormDirty) {
        // Form has changes, show warning
        setPendingSession(newSession);
        setShowChangeWarning(true);
      } else {
        // No changes, select directly
        selectSession(newSession);
        setIsFormDirty(false);
      }
    },
    [session, isFormDirty, selectSession]
  );

  // Confirm session change (clears form)
  const confirmSessionChange = useCallback(() => {
    if (pendingSession) {
      selectSession(pendingSession);
      setIsFormDirty(false);
    }
    setPendingSession(null);
    setShowChangeWarning(false);
  }, [pendingSession, selectSession]);

  // Cancel session change
  const cancelSessionChange = useCallback(() => {
    setPendingSession(null);
    setShowChangeWarning(false);
  }, []);

  // Track form dirty state
  const handleFormDirtyChange = useCallback((dirty: boolean) => {
    setIsFormDirty(dirty);
  }, []);

  // Reset state when dialog closes
  const handleDialogClose = useCallback(
    (open: boolean) => {
      if (!open) {
        closeFeedbackDialog();
        setIsFormDirty(false);
        setPendingSession(null);
        setShowChangeWarning(false);
        setStaffRole("Mentor");
      }
    },
    [closeFeedbackDialog]
  );

  const formattedDate = session?.scheduledStart
    ? format(parseAsLocalTime(session.scheduledStart), "MMMM d, yyyy 'at' h:mm a")
    : "";

  const teamName = session?.team?.[0]?.teamName;
  const mentorName = session?.mentor?.[0]?.fullName;

  const handleSubmit = async (data: FeedbackFormValues) => {
    if (!session || !userContext) return;

    let result;

    // Update existing feedback or create new
    if (existingFeedback?.id) {
      result = await updateFeedback(existingFeedback.id, {
        whatWentWell: data.whatWentWell || undefined,
        areasForImprovement: data.areasForImprovement || undefined,
        additionalNeeds: data.additionalNeeds || undefined,
        // Student fields
        ...(data.role === "Mentee" && {
          rating: data.rating,
          contentRelevance: data.contentRelevance,
          actionabilityOfAdvice: data.actionabilityOfAdvice,
          mentorPreparedness: data.mentorPreparedness,
          requestFollowUp: data.requestFollowUp,
        }),
        // Mentor fields
        ...(data.role === "Mentor" && {
          menteeEngagement: data.menteeEngagement,
          suggestedNextSteps: data.suggestedNextSteps || undefined,
          privateNotes: data.privateNotes || undefined,
        }),
      });
    } else {
      result = await submitFeedback({
        sessionId: session.id,
        respondantId: userContext.contactId,
        role: data.role,
        whatWentWell: data.whatWentWell || undefined,
        areasForImprovement: data.areasForImprovement || undefined,
        additionalNeeds: data.additionalNeeds || undefined,
        // Student fields
        ...(data.role === "Mentee" && {
          rating: data.rating,
          contentRelevance: data.contentRelevance,
          actionabilityOfAdvice: data.actionabilityOfAdvice,
          mentorPreparedness: data.mentorPreparedness,
          requestFollowUp: data.requestFollowUp,
        }),
        // Mentor fields
        ...(data.role === "Mentor" && {
          menteeEngagement: data.menteeEngagement,
          suggestedNextSteps: data.suggestedNextSteps || undefined,
          privateNotes: data.privateNotes || undefined,
        }),
      });
    }

    if (result) {
      handleDialogClose(false);
    }
  };

  // Determine dialog description based on mode and state
  const getDialogDescription = () => {
    if (mode === "select-session" && !session) {
      return "Select a session to provide feedback for";
    }
    if (userType === "student") {
      return "Share your feedback about this mentorship session";
    }
    return "Provide feedback for this session";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {existingFeedback ? "Edit Feedback" : "Add Feedback"}
            </DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>

          {/* Session Selector - only in select-session mode */}
          {mode === "select-session" && userType && (
            <SessionSelector
              sessions={availableSessions}
              selectedSession={session}
              onSelect={handleSessionSelect}
              userType={userType}
              userContactId={userContext?.contactId}
              isStaff={isStaff}
            />
          )}

          {/* Staff Role Selector - only for staff when session is selected */}
          {isStaff && session && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <Label className="text-sm font-medium">Submitting feedback as:</Label>
              <RadioGroup
                value={staffRole}
                onValueChange={(value) => setStaffRole(value as "Mentor" | "Mentee")}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Mentor" id="role-mentor" />
                  <Label htmlFor="role-mentor" className="font-normal cursor-pointer">
                    Mentor perspective
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Mentee" id="role-mentee" />
                  <Label htmlFor="role-mentee" className="font-normal cursor-pointer">
                    Student perspective
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Session Context Header - when session is selected */}
          {session && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{session.sessionType}</Badge>
                  {session.status && (
                    <Badge
                      variant={session.status === "Completed" ? "default" : "secondary"}
                    >
                      {session.status}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {formattedDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{formattedDate}</span>
                  </div>
                )}
                {teamName && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{teamName}</span>
                  </div>
                )}
                {mentorName && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{mentorName}</span>
                  </div>
                )}
              </div>

              {session.agenda && (
                <p className="text-sm">
                  <span className="font-medium">Agenda:</span> {session.agenda}
                </p>
              )}
            </div>
          )}

          {/* Feedback Form - when session is selected */}
          {session && userType && (
            <FeedbackForm
              userRole={isStaff ? (staffRole === "Mentee" ? "student" : "staff") : userType}
              existingFeedback={existingFeedback}
              onSubmit={handleSubmit}
              onCancel={() => handleDialogClose(false)}
              isSubmitting={isSubmitting}
              onDirtyChange={handleFormDirtyChange}
              overrideRole={isStaff ? staffRole : undefined}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Session Change Warning Dialog */}
      <AlertDialog open={showChangeWarning} onOpenChange={setShowChangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Session?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved feedback. Changing the session will clear your entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSessionChange}>
              Keep Current Session
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSessionChange}>
              Change and Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
