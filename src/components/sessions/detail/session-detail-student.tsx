"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  CheckSquare,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionDetailHeader } from "./session-detail-header";
import {
  SessionOverviewTab,
  SessionPreparationTab,
  SessionFeedbackTab,
  SessionTasksTab,
  SessionNotesTab,
} from "./tabs";
import { TaskDetailSheet } from "@/components/tasks";
import {
  EditSessionDialog,
  ViewMeetingNotesDialog,
  PreMeetingWizard,
} from "@/components/sessions";
import { useSessionPhase, getDefaultTabForPhase } from "@/hooks/use-session-phase";
import { hasMenteeFeedback, isSessionEligibleForFeedback } from "@/components/sessions/session-transformers";
import { hasUserSubmitted } from "@/hooks/use-pre-meeting-submission";
import { useFeedbackDialog } from "@/contexts/feedback-dialog-context";
import type { Session, Task, UserContext } from "@/types/schema";
import type { TeamMember } from "@/hooks/use-team-members";

interface SessionDetailStudentProps {
  session: Session;
  userContext: UserContext;
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onCreateUpdate: (input: any) => Promise<void>;
}

export function SessionDetailStudent({
  session,
  userContext,
  tasks,
  teamMembers,
  onTaskUpdate,
  onCreateUpdate,
}: SessionDetailStudentProps) {
  const { openFeedbackDialog } = useFeedbackDialog();
  const phaseInfo = useSessionPhase(session);

  // Dialog states
  const [isViewNotesDialogOpen, setIsViewNotesDialogOpen] = useState(false);
  const [isPreMeetingWizardOpen, setIsPreMeetingWizardOpen] = useState(false);

  // Task sheet state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);

  // Calculate tab state
  const defaultTab = getDefaultTabForPhase(phaseInfo.phase, "student");
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Pre-meeting submission state
  const preMeetingSubmissions = session.preMeetingSubmissions || [];
  const userSubmission = hasUserSubmitted(preMeetingSubmissions, userContext.contactId);
  const userHasSubmitted = !!userSubmission;
  const canSubmitPrep = phaseInfo.isEligibleForPrep && !userHasSubmitted;

  // Feedback state
  const needsFeedback = isSessionEligibleForFeedback(session) && !hasMenteeFeedback(session);

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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskSheetOpen(true);
  };

  const handleTasksUpdate = async (updates: { taskId: string; newStatus: string }[]) => {
    for (const update of updates) {
      await onTaskUpdate(update.taskId, { status: update.newStatus as Task["status"] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SessionDetailHeader
        session={session}
        phase={phaseInfo.phase}
        userType="student"
        minutesUntilStart={phaseInfo.minutesUntilStart}
        timeUntilStart={phaseInfo.timeUntilStart}
        needsFeedback={needsFeedback}
        canSubmitPrep={canSubmitPrep}
        canUpdate={false}
        canDelete={false}
        hasNotes={hasNotes}
        onViewNotes={() => setIsViewNotesDialogOpen(true)}
        onAddFeedback={() => openFeedbackDialog(session)}
        onPrepare={() => setIsPreMeetingWizardOpen(true)}
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
            {canSubmitPrep && (
              <Badge variant="default" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
                !
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Feedback</span>
            {needsFeedback && (
              <Badge variant="default" className="ml-1 h-5 w-5 p-0 justify-center text-xs bg-amber-500">
                !
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
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <SessionOverviewTab
            session={session}
            userType="student"
            onViewNotes={() => setIsViewNotesDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="preparation" className="mt-6">
          <SessionPreparationTab
            session={session}
            userType="student"
            phase={phaseInfo.phase}
            tasks={sessionTasks}
            userContactId={userContext.contactId}
            hasUserSubmitted={userHasSubmitted}
            onOpenPrepWizard={() => setIsPreMeetingWizardOpen(true)}
          />
        </TabsContent>

        <TabsContent value="feedback" className="mt-6">
          <SessionFeedbackTab
            session={session}
            userType="student"
            phase={phaseInfo.phase}
            userEmail={userContext.email}
            onAddFeedback={() => openFeedbackDialog(session)}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <SessionTasksTab
            tasks={sessionTasks}
            sessionId={session.id}
            userType="student"
            onTaskClick={handleTaskClick}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <SessionNotesTab
            session={session}
            userType="student"
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {hasNotes && (
        <ViewMeetingNotesDialog
          open={isViewNotesDialogOpen}
          onOpenChange={setIsViewNotesDialogOpen}
          session={session}
        />
      )}

      <PreMeetingWizard
        open={isPreMeetingWizardOpen}
        onOpenChange={setIsPreMeetingWizardOpen}
        session={session}
        tasks={sessionTasks}
        contactId={userContext.contactId}
        onTasksUpdate={handleTasksUpdate}
        onCreateUpdate={onCreateUpdate}
      />

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        open={isTaskSheetOpen}
        onOpenChange={setIsTaskSheetOpen}
        task={selectedTask}
        userType="student"
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
