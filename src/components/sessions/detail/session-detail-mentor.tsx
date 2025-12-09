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
import { ViewMeetingNotesDialog } from "@/components/sessions";
import { useSessionPhase, getDefaultTabForPhase } from "@/hooks/use-session-phase";
import { hasMentorFeedback, isSessionEligibleForFeedback } from "@/components/sessions/session-transformers";
import { useFeedbackDialog } from "@/contexts/feedback-dialog-context";
import type { Session, Task, UserContext } from "@/types/schema";
import type { TeamMember } from "@/hooks/use-team-members";

interface SessionDetailMentorProps {
  session: Session;
  userContext: UserContext;
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onCreateUpdate: (input: any) => Promise<void>;
}

export function SessionDetailMentor({
  session,
  userContext,
  tasks,
  teamMembers,
  onTaskUpdate,
  onCreateUpdate,
}: SessionDetailMentorProps) {
  const { openFeedbackDialog } = useFeedbackDialog();
  const phaseInfo = useSessionPhase(session);

  // Dialog states
  const [isViewNotesDialogOpen, setIsViewNotesDialogOpen] = useState(false);

  // Task sheet state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);

  // Calculate tab state
  const defaultTab = getDefaultTabForPhase(phaseInfo.phase, "mentor");
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Pre-meeting submission state
  const preMeetingSubmissions = session.preMeetingSubmissions || [];
  const submissionCount = preMeetingSubmissions.length;

  // Auto-expand prep submissions when starting soon
  const autoExpandPrep = phaseInfo.phase === "starting-soon";

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
        userType="mentor"
        minutesUntilStart={phaseInfo.minutesUntilStart}
        timeUntilStart={phaseInfo.timeUntilStart}
        needsFeedback={needsFeedback}
        canSubmitPrep={false}
        canUpdate={false}
        canDelete={false}
        hasNotes={hasNotes}
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
              <Badge
                variant={autoExpandPrep ? "default" : "secondary"}
                className={cn("ml-1", autoExpandPrep && "animate-pulse")}
              >
                {submissionCount}
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
            {!needsFeedback && feedbackCount > 0 && (
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
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <SessionOverviewTab
            session={session}
            userType="mentor"
            onViewNotes={() => setIsViewNotesDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="preparation" className="mt-6">
          <SessionPreparationTab
            session={session}
            userType="mentor"
            phase={phaseInfo.phase}
            tasks={sessionTasks}
            autoExpand={autoExpandPrep}
          />
        </TabsContent>

        <TabsContent value="feedback" className="mt-6">
          <SessionFeedbackTab
            session={session}
            userType="mentor"
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
            userType="mentor"
            onTaskClick={handleTaskClick}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <SessionNotesTab
            session={session}
            userType="mentor"
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

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        open={isTaskSheetOpen}
        onOpenChange={setIsTaskSheetOpen}
        task={selectedTask}
        userType="mentor"
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
