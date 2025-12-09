"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useUserType } from "@/hooks/use-user-type";
import { useSessions } from "@/hooks/use-sessions";
import { useTasks } from "@/hooks/use-tasks";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { AlertCircle, ArrowLeft } from "lucide-react";
import {
  SessionDetailStudent,
  SessionDetailMentor,
  SessionDetailStaff,
} from "@/components/sessions";
import { EmailJobStatusCard } from "@/components/notifications";
import { useSessionJobProgress } from "@/contexts/job-status-context";
import type { TeamMember } from "@/hooks/use-team-members";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { sessions, isLoading: isSessionsLoading } = useSessions(userContext?.email);
  const { tasks: allTasks, updateTask, createUpdate } = useTasks(userContext?.email);
  const { setOverride, clearOverride } = useBreadcrumb();
  const { progress: jobProgress } = useSessionJobProgress(sessionId);

  const isLoading = isUserLoading || isSessionsLoading;
  const session = sessions.find((s) => s.id === sessionId);

  // Update breadcrumb when session loads
  useEffect(() => {
    if (session?.sessionType) {
      setOverride(`/sessions/${sessionId}`, session.sessionType);
    }

    return () => {
      clearOverride(`/sessions/${sessionId}`);
    };
  }, [session?.sessionType, sessionId, setOverride, clearOverride]);

  // Transform team members for role-specific components
  const teamMembers = useMemo<TeamMember[]>(() => {
    const members = session?.team?.[0]?.members || [];
    return members.map((member: any) => ({
      memberId: member.id,
      contact: member.contact?.[0] || {},
      type: member.type || "Member",
      status: member.status,
    }));
  }, [session?.team]);

  // Filter tasks to those assigned to team members
  const tasks = useMemo(() => {
    if (!allTasks || !session?.team?.[0]?.members) return [];
    const teamMemberContactIds = session.team[0].members
      .map((member: any) => member.contact?.[0]?.id)
      .filter(Boolean) as string[];

    return allTasks.filter((task) => {
      const assignedToIds = task.assignedTo?.map((c) => c.id) || [];
      return assignedToIds.some((id) => teamMemberContactIds.includes(id));
    });
  }, [allTasks, session?.team]);

  // Handler for task updates
  const handleTaskUpdate = async (taskId: string, updates: any) => {
    await updateTask(taskId, updates);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <Skeleton className="h-96 w-full" />
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
            <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">Session not found</p>
              <p className="text-sm">This session may have been removed or you don't have access</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userContext) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">Unable to load user context</p>
            <p className="text-sm">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if there are active jobs to show status card
  const hasActiveJobs = jobProgress &&
    jobProgress.status !== "completed" &&
    jobProgress.status !== "failed";

  // Wrapper to include job status card when there are active jobs
  const renderWithStatusCard = (content: React.ReactNode) => (
    <>
      {hasActiveJobs && jobProgress && (
        <EmailJobStatusCard
          batchId={jobProgress.batchId}
        />
      )}
      {content}
    </>
  );

  // Render role-specific view
  switch (userType) {
    case "student":
      return renderWithStatusCard(
        <SessionDetailStudent
          session={session}
          userContext={userContext}
          tasks={tasks}
          teamMembers={teamMembers}
          onTaskUpdate={handleTaskUpdate}
          onCreateUpdate={createUpdate}
        />
      );
    case "mentor":
      return renderWithStatusCard(
        <SessionDetailMentor
          session={session}
          userContext={userContext}
          tasks={tasks}
          teamMembers={teamMembers}
          onTaskUpdate={handleTaskUpdate}
          onCreateUpdate={createUpdate}
        />
      );
    case "staff":
      return renderWithStatusCard(
        <SessionDetailStaff
          session={session}
          userContext={userContext}
          tasks={tasks}
          teamMembers={teamMembers}
          onTaskUpdate={handleTaskUpdate}
          onCreateUpdate={createUpdate}
        />
      );
    default:
      // Fallback to student view if role is unknown
      return renderWithStatusCard(
        <SessionDetailStudent
          session={session}
          userContext={userContext}
          tasks={tasks}
          teamMembers={teamMembers}
          onTaskUpdate={handleTaskUpdate}
          onCreateUpdate={createUpdate}
        />
      );
  }
}
