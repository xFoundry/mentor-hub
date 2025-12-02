"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserType } from "@/hooks/use-user-type";
import { useSessions } from "@/hooks/use-sessions";
import { useTasks } from "@/hooks/use-tasks";
import { TaskDetailSheet } from "@/components/tasks";
import type { TeamMember } from "@/hooks/use-team-members";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  FileText,
  MessageSquare,
  CheckSquare,
  ArrowLeft,
  Mail,
  User,
  Pencil,
  Users2,
  Trash2,
} from "lucide-react";
import { EditSessionDialog, AddMeetingNotesDialog, ViewMeetingNotesDialog, DeleteSessionDialog } from "@/components/sessions";
import { useUpdateSession } from "@/hooks/use-update-session";
import { useSessionPermissions } from "@/hooks/use-session-permissions";
import { format, formatDistanceToNow, isPast } from "date-fns";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Task, SessionFeedback } from "@/types/schema";
import { hasMentorFeedback, hasMenteeFeedback, isSessionEligibleForFeedback, parseAsLocalTime } from "@/components/sessions/session-transformers";
import { useFeedbackDialog } from "@/contexts/feedback-dialog-context";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { openFeedbackDialog } = useFeedbackDialog();
  const sessionId = params.id as string;

  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { sessions, isLoading: isSessionsLoading } = useSessions(userContext?.email);
  const { updateTask, createUpdate } = useTasks(userContext?.email);

  // Task detail sheet state - store ID only, look up from session for fresh data
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Edit session dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // Meeting notes dialog state
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isViewNotesDialogOpen, setIsViewNotesDialogOpen] = useState(false);
  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { updateSession } = useUpdateSession();
  const { canUpdate } = useSessionPermissions(userType ?? undefined, userContext?.email);
  const canDelete = userType === "staff";

  const isLoading = isUserLoading || isSessionsLoading;
  const session = sessions.find((s) => s.id === sessionId);

  // Look up task from session's action items to get fresh data
  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !session?.actionItems) return null;
    return session.actionItems.find((t: Task) => t.id === selectedTaskId) || null;
  }, [selectedTaskId, session?.actionItems]);

  // Get team members from session
  const teamMembers = session?.team?.[0]?.members || [];

  // Transform team members for TaskDetailSheet (must be before early returns)
  const teamMembersForSheet = useMemo<TeamMember[]>(() => {
    return teamMembers.map((member: any) => ({
      memberId: member.id,
      contact: member.contact?.[0] || {},
      type: member.type || "Member",
      status: member.status,
    }));
  }, [teamMembers]);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setIsSheetOpen(true);
  };
  const isMentor = userType === "mentor";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">Session not found</p>
              <p className="text-sm">This session may have been removed or you don't have access</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For students, show mentor info; for mentors, show team info
  const mentor = session.mentor?.[0];
  const mentorInitials = mentor?.fullName
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "M";

  const team = session.team?.[0];

  // Filter feedback based on visibility rules:
  // - Staff: see all feedback
  // - Mentors: see mentor feedback + student feedback ONLY if additionalNeeds is present
  // - Students: see all feedback
  const visibleFeedback = session.sessionFeedback?.filter((feedback: SessionFeedback) => {
    if (userType === "staff") return true;
    if (userType === "student") return true;
    // Mentors see mentor feedback + student feedback only if additionalNeeds is present
    if (userType === "mentor") {
      return feedback.role === "Mentor" || (feedback.role === "Mentee" && feedback.additionalNeeds);
    }
    return false;
  }) || [];

  const hasFeedback = visibleFeedback.length > 0;
  // Check if user needs to provide feedback (based on role and whether session is eligible)
  const needsFeedback = isSessionEligibleForFeedback(session) &&
    (isMentor ? !hasMentorFeedback(session) : !hasMenteeFeedback(session));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {canUpdate && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Session
            </Button>
          )}
          {userType === "staff" && (
            <Button variant="outline" onClick={() => setIsNotesDialogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              {session.summary || session.fullTranscript ? "Edit Meeting Notes" : "Add Meeting Notes"}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          {needsFeedback && (
            <Button onClick={() => openFeedbackDialog(session)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Feedback
            </Button>
          )}
        </div>
      </div>

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{session.sessionType || "Session"}</CardTitle>
                <Badge variant={session.status === "Completed" ? "default" : "outline"}>
                  {session.status}
                </Badge>
                {needsFeedback && (
                  <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950">
                    Needs Feedback
                  </Badge>
                )}
              </div>
              <CardDescription className="text-base">
                Session ID: {session.sessionId || session.id}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Team Info (for mentors) */}
          {isMentor && team && (
            <Link
              href={`/teams/${team.id}`}
              className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users2 className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{team.teamName}</p>
                </div>
                {/* Team member avatars */}
                {teamMembers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {teamMembers.slice(0, 5).map((member: any) => {
                        const contact = member.contact?.[0];
                        if (!contact) return null;
                        const initials = contact.fullName
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "?";
                        return (
                          <Avatar
                            key={member.id}
                            className="h-7 w-7 border-2 border-background"
                            title={contact.fullName}
                          >
                            <AvatarImage src={contact.headshot?.[0]?.url} alt={contact.fullName} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                        );
                      })}
                      {teamMembers.length > 5 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                          +{teamMembers.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Mentor Info (for students) */}
          {!isMentor && mentor && (
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={mentor.headshot?.[0]?.url} alt={mentor.fullName} />
                <AvatarFallback>{mentorInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <p className="font-semibold">{mentor.fullName}</p>
                </div>
                {mentor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground h-3 w-3" />
                    <p className="text-muted-foreground text-sm">{mentor.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date & Time */}
          {session.scheduledStart && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                <span>Schedule</span>
              </div>
              <div className="text-muted-foreground ml-6 space-y-1 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <p>{format(parseAsLocalTime(session.scheduledStart), "EEEE, MMMM d, yyyy")}</p>
                  <Badge variant="outline" className="text-xs">
                    {isPast(parseAsLocalTime(session.scheduledStart))
                      ? formatDistanceToNow(parseAsLocalTime(session.scheduledStart), { addSuffix: true })
                      : `in ${formatDistanceToNow(parseAsLocalTime(session.scheduledStart))}`}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{format(parseAsLocalTime(session.scheduledStart), "h:mm a")}</span>
                  {session.duration && (
                    <span className="text-muted-foreground">({session.duration} min)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Meeting */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Video className="h-4 w-4" />
              <span>Meeting</span>
            </div>
            <div className="ml-6 space-y-2">
              {session.meetingPlatform && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Platform:</span>{" "}
                  {session.meetingPlatform}
                </p>
              )}
              {session.meetingUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Join Meeting
                  </a>
                </Button>
              ) : (
                <p className="text-muted-foreground text-sm">No meeting link set</p>
              )}
            </div>
          </div>

          {/* Agenda */}
          {session.agenda && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                <span>Agenda</span>
              </div>
              <p className="text-muted-foreground ml-6 text-sm whitespace-pre-wrap">
                {session.agenda}
              </p>
            </div>
          )}

          {/* Meeting Notes */}
          {(session.granolaNotesUrl || session.summary || session.fullTranscript) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  <span>Meeting Notes</span>
                </div>
                {(session.summary || session.fullTranscript) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsViewNotesDialogOpen(true)}
                  >
                    View Notes
                  </Button>
                )}
              </div>
              <div className="ml-6 space-y-2">
                {session.granolaNotesUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={session.granolaNotesUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      View in Granola
                    </a>
                  </Button>
                )}
                {(session.summary || session.fullTranscript) && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    {session.summary && (
                      <p>Summary: {session.summary.length.toLocaleString()} characters</p>
                    )}
                    {session.fullTranscript && (
                      <p>Transcript: {session.fullTranscript.length.toLocaleString()} characters</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Feedback */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <CardTitle>Session Feedback</CardTitle>
              </div>
              {needsFeedback && (
                <Button size="sm" onClick={() => openFeedbackDialog(session)}>
                  Add Feedback
                </Button>
              )}
            </div>
            <CardDescription>
              {isMentor ? "Your feedback for this session" : "Mentor feedback and notes"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasFeedback ? (
              <div className="space-y-4">
                {visibleFeedback.map((feedback: SessionFeedback) => {
                  const respondent = feedback.respondant?.[0];
                  const respondentName = respondent?.fullName || (feedback.role === "Mentor" ? "Mentor" : "Student");

                  return (
                    <div key={feedback.id} className="space-y-3 rounded-lg border p-3">
                      {/* Respondent header */}
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={respondent?.headshot?.[0]?.url} alt={respondentName} />
                            <AvatarFallback className="text-xs">
                              {respondentName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{respondentName}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {feedback.role}
                        </Badge>
                      </div>

                      {/* Feedback content */}
                      {feedback.whatWentWell && (
                        <div>
                          <p className="text-sm font-medium">What Went Well</p>
                          <p className="text-muted-foreground text-sm">{feedback.whatWentWell}</p>
                        </div>
                      )}
                      {feedback.areasForImprovement && (
                        <div>
                          <p className="text-sm font-medium">Areas for Improvement</p>
                          <p className="text-muted-foreground text-sm">{feedback.areasForImprovement}</p>
                        </div>
                      )}
                      {feedback.additionalNeeds && (
                        <div>
                          <p className="text-sm font-medium">Additional Needs</p>
                          <p className="text-muted-foreground text-sm">{feedback.additionalNeeds}</p>
                        </div>
                      )}
                      {/* Show mentor-specific fields for staff */}
                      {userType === "staff" && feedback.role === "Mentor" && feedback.suggestedNextSteps && (
                        <div>
                          <p className="text-sm font-medium">Suggested Next Steps</p>
                          <p className="text-muted-foreground text-sm">{feedback.suggestedNextSteps}</p>
                        </div>
                      )}
                      {/* Show student-specific ratings for staff */}
                      {userType === "staff" && feedback.role === "Mentee" && feedback.rating && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">Rating: {feedback.rating}/5</span>
                          {feedback.contentRelevance && (
                            <span className="text-muted-foreground">Content: {feedback.contentRelevance}/5</span>
                          )}
                          {feedback.mentorPreparedness && (
                            <span className="text-muted-foreground">Preparedness: {feedback.mentorPreparedness}/5</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="mb-2 h-8 w-8" />
                <p className="text-sm">
                  {session.status === "Completed"
                    ? isMentor
                      ? "Add feedback for this session"
                      : "No mentor feedback yet"
                    : "Feedback can be added after the session"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                <CardTitle>Action Items</CardTitle>
              </div>
              {!isMentor && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/tasks/new?session=${session.id}`}>
                    Create Task
                  </Link>
                </Button>
              )}
            </div>
            <CardDescription>Tasks from this session</CardDescription>
          </CardHeader>
          <CardContent>
            {session.actionItems && session.actionItems.length > 0 ? (
              <div className="space-y-2">
                {session.actionItems.map((task: Task) => (
                  <button
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className="w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{task.name}</p>
                        {task.description && (
                          <p className="text-muted-foreground line-clamp-1 text-xs">
                            {task.description}
                          </p>
                        )}
                        {task.assignedTo && task.assignedTo.length > 0 && (
                          <p className="text-muted-foreground text-xs">
                            Assigned to {task.assignedTo[0].fullName}
                          </p>
                        )}
                      </div>
                      <Badge variant={task.status === "Completed" ? "default" : "outline"} className="text-xs">
                        {task.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                <CheckSquare className="mb-2 h-8 w-8" />
                <p className="text-sm">No action items yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Sheet */}
      {userType && userContext && (
        <TaskDetailSheet
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          task={selectedTask}
          userType={userType}
          userEmail={userContext.email}
          userContactId={userContext.contactId}
          onTaskUpdate={updateTask}
          onCreateUpdate={createUpdate}
          teamId={team?.id}
          teamMembers={teamMembersForSheet}
        />
      )}

      {/* Edit Session Dialog */}
      {canUpdate && session && (
        <EditSessionDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          session={session}
          onSave={async (updates) => { await updateSession(session.id, updates); }}
        />
      )}

      {/* Add Meeting Notes Dialog - staff only */}
      {userType === "staff" && session && (
        <AddMeetingNotesDialog
          open={isNotesDialogOpen}
          onOpenChange={setIsNotesDialogOpen}
          session={session}
          onSave={async (updates) => { await updateSession(session.id, updates); }}
        />
      )}

      {/* View Meeting Notes Dialog - all users */}
      {session && (session.summary || session.fullTranscript) && (
        <ViewMeetingNotesDialog
          open={isViewNotesDialogOpen}
          onOpenChange={setIsViewNotesDialogOpen}
          session={session}
        />
      )}

      {/* Delete Session Dialog - staff only */}
      {canDelete && session && (
        <DeleteSessionDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          session={session}
          onDeleted={() => router.push("/sessions")}
        />
      )}
    </div>
  );
}
