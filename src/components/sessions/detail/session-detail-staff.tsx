"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  CheckSquare,
  FileText,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionDetailHeader } from "./session-detail-header";
import {
  SessionOverviewTab,
  SessionPreparationTab,
  SessionFeedbackTab,
  SessionTasksTab,
  SessionNotesTab,
  SessionEmailsTab,
} from "./tabs";
import { TaskDetailSheet } from "@/components/tasks";
import {
  EditSessionDialog,
  AddMeetingNotesDialog,
  ViewMeetingNotesDialog,
  DeleteSessionDialog,
} from "@/components/sessions";
import { useSessionPhase, getDefaultTabForPhase } from "@/hooks/use-session-phase";
import { hasMentorFeedback, isSessionEligibleForFeedback } from "@/components/sessions/session-transformers";
import { useUpdateSession } from "@/hooks/use-update-session";
import { useFeedbackDialog } from "@/contexts/feedback-dialog-context";
import { useMentors } from "@/hooks/use-mentors";
import type { Session, Task, UserContext } from "@/types/schema";
import type { TeamMember } from "@/hooks/use-team-members";

interface SessionDetailStaffProps {
  session: Session;
  userContext: UserContext;
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onCreateUpdate: (input: any) => Promise<void>;
}

export function SessionDetailStaff({
  session,
  userContext,
  tasks,
  teamMembers,
  onTaskUpdate,
  onCreateUpdate,
}: SessionDetailStaffProps) {
  const router = useRouter();
  const { openFeedbackDialog } = useFeedbackDialog();
  const { updateSession } = useUpdateSession();
  const phaseInfo = useSessionPhase(session);

  // Fetch mentors for the session's cohort (for edit dialog)
  const cohortId = session.cohort?.[0]?.id;
  const { mentors: availableMentors } = useMentors(cohortId);

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isViewNotesDialogOpen, setIsViewNotesDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Task sheet state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);

  // Calculate tab state - Staff always start with overview
  const defaultTab = getDefaultTabForPhase(phaseInfo.phase, "staff");
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Pre-meeting submission state
  const preMeetingSubmissions = session.preMeetingSubmissions || [];
  const submissionCount = preMeetingSubmissions.length;

  // Feedback state
  const needsFeedback = isSessionEligibleForFeedback(session) && !hasMentorFeedback(session);

  // Notes state
  const hasNotes = !!(session.summary || session.fullTranscript);

  // Filter tasks for this session
  const sessionTasks = useMemo(() => {
    return tasks.filter(t =>
      session.actionItems?.some((ai: Task) => ai.id === t.id)
    );
  }, [tasks, session.actionItems]);

  // Open task count for badge
  const openTaskCount = sessionTasks.filter(
    t => t.status !== "Completed" && t.status !== "Cancelled"
  ).length;

  // Feedback count for badge
  const feedbackCount = (session.sessionFeedback || session.feedback || []).length;

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SessionDetailHeader
        session={session}
        phase={phaseInfo.phase}
        userType="staff"
        minutesUntilStart={phaseInfo.minutesUntilStart}
        timeUntilStart={phaseInfo.timeUntilStart}
        needsFeedback={needsFeedback}
        canSubmitPrep={false}
        canUpdate={true}
        canDelete={true}
        hasNotes={hasNotes}
        onEdit={() => setIsEditDialogOpen(true)}
        onDelete={() => setIsDeleteDialogOpen(true)}
        onAddNotes={() => setIsNotesDialogOpen(true)}
        onViewNotes={() => setIsViewNotesDialogOpen(true)}
        onAddFeedback={() => openFeedbackDialog(session)}
      />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="preparation" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Prep</span>
            {submissionCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {submissionCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Feedback</span>
            {feedbackCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {feedbackCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
            {openTaskCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {openTaskCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Notes</span>
            {hasNotes && (
              <Badge variant="secondary" className="ml-1 h-2 w-2 p-0 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Emails</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <SessionOverviewTab
            session={session}
            userType="staff"
            onViewNotes={() => setIsViewNotesDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="preparation" className="mt-6">
          <SessionPreparationTab
            session={session}
            userType="staff"
            phase={phaseInfo.phase}
            tasks={sessionTasks}
          />
        </TabsContent>

        <TabsContent value="feedback" className="mt-6">
          <SessionFeedbackTab
            session={session}
            userType="staff"
            phase={phaseInfo.phase}
            userContactId={userContext.contactId}
            onAddFeedback={() => openFeedbackDialog(session)}
            onEditFeedback={(feedback) => openFeedbackDialog(session, feedback)}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <SessionTasksTab
            tasks={sessionTasks}
            sessionId={session.id}
            userType="staff"
            onTaskClick={handleTaskClick}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <SessionNotesTab
            session={session}
            userType="staff"
            onEditNotes={() => setIsNotesDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="emails" className="mt-6">
          <SessionEmailsTab sessionId={session.id} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EditSessionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        session={session}
        availableMentors={availableMentors}
        onSave={async (updates) => {
          await updateSession(session.id, updates);
        }}
      />

      <AddMeetingNotesDialog
        open={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        session={session}
        onSave={async (updates) => {
          await updateSession(session.id, updates);
        }}
      />

      {hasNotes && (
        <ViewMeetingNotesDialog
          open={isViewNotesDialogOpen}
          onOpenChange={setIsViewNotesDialogOpen}
          session={session}
        />
      )}

      <DeleteSessionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        session={session}
        onDeleted={() => router.push("/sessions")}
      />

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        open={isTaskSheetOpen}
        onOpenChange={setIsTaskSheetOpen}
        task={selectedTask}
        userType="staff"
        userEmail={userContext.email}
        userContactId={userContext.contactId}
        onTaskUpdate={onTaskUpdate}
        onCreateUpdate={onCreateUpdate}
        teamId={session.team?.[0]?.id}
        teamMembers={teamMembers}
      />
    </div>
  );
}
