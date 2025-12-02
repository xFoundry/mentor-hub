"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { TaskView, TaskDetailSheet } from "@/components/tasks";
import { TeamDetailHeader } from "./team-detail-header";
import { UpcomingSessionsCard } from "./upcoming-sessions-card";
import { AttentionNeededCard } from "./attention-needed-card";
import { useTasks } from "@/hooks/use-tasks";
import { useLocalTaskViewState } from "@/hooks/use-task-view-state";
import type { TeamMember } from "@/hooks/use-team-members";
import { Calendar, CheckSquare, Users2 } from "lucide-react";
import type { Session, Task } from "@/types/schema";
import type { UserContext } from "@/types/schema";
import { hasMenteeFeedback, isSessionEligibleForFeedback, parseAsLocalTime } from "@/components/sessions/session-transformers";
import { isFuture } from "date-fns";

interface TeamDetailStudentProps {
  team: {
    id: string;
    teamId?: string;
    teamName: string;
    teamStatus?: string;
    description?: string;
    cohorts?: Array<{ id: string; shortName: string }>;
    members?: any[];
    mentorshipSessions?: Session[];
    actionItems?: Task[];
  };
  userContext: UserContext;
}

export function TeamDetailStudent({ team, userContext }: TeamDetailStudentProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { updateTask: baseUpdateTask, createUpdate: baseCreateUpdate } = useTasks(userContext.email);

  // Task view state (local, not URL-synced)
  const {
    viewState,
    setView,
    setFilter,
    setSort,
    setGroupBy,
  } = useLocalTaskViewState({ view: "kanban", filter: "open" });

  // Extract data from team prop
  const members = team.members || [];
  const sessions = team.mentorshipSessions || [];
  const tasks = team.actionItems || [];

  // Transform team members for TaskDetailSheet (contact is an array in member structure)
  const teamMembersForSheet = useMemo<TeamMember[]>(() => {
    return members.map((member: any) => ({
      memberId: member.id,
      contact: member.contact?.[0] || {},
      type: member.type || "Member",
      status: member.status,
    }));
  }, [members]);

  // Task detail sheet state - store ID only, look up from array for fresh data
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Look up task from array to get optimistically updated data
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setIsSheetOpen(true);
  };

  const handleCreateTask = () => {
    router.push(`/tasks/new?team=${team.id}`);
  };

  // Wrap updateTask with optimistic update on team detail cache
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    // Prepare optimistic updates - resolve assignedTo IDs to full contact objects
    let optimisticUpdates = { ...updates };

    // If assignedTo is being updated with IDs, resolve to full contact objects
    if (updates.assignedTo && Array.isArray(updates.assignedTo)) {
      const assignedToIds = updates.assignedTo as unknown as string[];
      const resolvedAssignees = assignedToIds
        .map(id => {
          // Find contact in transformed team members (contact is a direct object)
          const member = teamMembersForSheet.find((m) => m.contact?.id === id);
          return member?.contact || { id };
        })
        .filter(Boolean);
      optimisticUpdates = {
        ...optimisticUpdates,
        assignedTo: resolvedAssignees.length > 0 ? resolvedAssignees : undefined,
      };
    }

    // Optimistically update the team detail cache
    mutate(
      [`/teams/${team.id}`],
      (currentData: any) => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          actionItems: currentData.actionItems?.map((task: Task) =>
            task.id === taskId ? { ...task, ...optimisticUpdates } : task
          ),
        };
      },
      { revalidate: false }
    );

    try {
      await baseUpdateTask(taskId, updates);
      // Revalidate to ensure consistency with server
      mutate([`/teams/${team.id}`]);
    } catch (error) {
      // Revalidate on error to rollback optimistic update
      mutate([`/teams/${team.id}`]);
      throw error;
    }
  }, [baseUpdateTask, mutate, team.id, teamMembersForSheet]);

  // Wrap createUpdate to also revalidate team detail cache
  const createUpdate = useCallback(async (input: {
    taskId: string;
    authorId: string;
    health: string;
    message: string;
  }) => {
    await baseCreateUpdate(input);
    // Revalidate team detail to update actionItems
    mutate([`/teams/${team.id}`]);
  }, [baseCreateUpdate, mutate, team.id]);

  // Calculate stats
  const stats = useMemo(() => {
    const upcomingSessions = sessions.filter(
      (s: any) => s.scheduledStart && s.status !== "Cancelled" && isFuture(parseAsLocalTime(s.scheduledStart))
    );
    const completedSessions = sessions.filter((s: any) => s.status === "Completed");

    // Count all open tasks for the team
    const openTasks = tasks.filter(
      (t: any) => t.status !== "Completed" && t.status !== "Cancelled"
    );

    // Sessions needing feedback from student
    const needsFeedback = sessions.filter(
      (s: any) => isSessionEligibleForFeedback(s) && !hasMenteeFeedback(s)
    );

    return {
      upcomingSessions: upcomingSessions.length,
      completedSessions: completedSessions.length,
      openTasks: openTasks.length,
      teammates: members.length,
      needsFeedback: needsFeedback.length,
    };
  }, [sessions, tasks, members]);

  // Get all team tasks (show all, not just assigned to current user)
  const teamTasks = useMemo(() => {
    return tasks;
  }, [tasks]);

  const statsData = [
    {
      title: "Upcoming Sessions",
      value: stats.upcomingSessions,
      subtitle: `${stats.completedSessions} completed`,
      icon: Calendar,
      href: "/sessions",
    },
    {
      title: "Team Tasks",
      value: stats.openTasks,
      subtitle: "Open items",
      icon: CheckSquare,
      href: "/tasks",
    },
    {
      title: "Teammates",
      value: stats.teammates,
      subtitle: "In your team",
      icon: Users2,
    },
  ];

  const handleFeedbackClick = (sessionId: string) => {
    router.push(`/feedback?session=${sessionId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <TeamDetailHeader
        team={team}
        userType="student"
        subtitle="Your team"
        members={members}
        currentUserEmail={userContext.email}
      />

      {/* Hero Card - Next Session */}
      <UpcomingSessionsCard
        sessions={sessions}
        teamId={team.id}
      />

      {/* Attention Card - Feedback needed */}
      <AttentionNeededCard
        sessions={sessions}
        tasks={teamTasks}
        userType="student"
        userEmail={userContext.email}
        teamId={team.id}
        onFeedbackClick={handleFeedbackClick}
      />

      {/* Stats Grid */}
      <StatsGrid stats={statsData} columns={3} />

      {/* Team Tasks - Full View */}
      <TaskView
        tasks={teamTasks}
        userType="student"
        userEmail={userContext.email}
        // View state
        view={viewState.view}
        filter={viewState.filter}
        sort={viewState.sort}
        sortDirection={viewState.sortDirection}
        groupBy={viewState.groupBy}
        // View state handlers
        onViewChange={setView}
        onFilterChange={setFilter}
        onSortChange={setSort}
        onGroupByChange={setGroupBy}
        // Configuration
        availableViews={["kanban", "list", "table"]}
        variant="embedded"
        showHeader={true}
        showControls={true}
        showViewSwitcher={true}
        showFilter={true}
        showSort={true}
        showGroupBy={true}
        showCreateButton={true}
        showAssignee={true}
        showProvenance={true}
        showActions={true}
        // Callbacks
        onTaskUpdate={updateTask}
        onTaskClick={handleTaskClick}
        onEditClick={handleTaskClick}
        onPostUpdateClick={handleTaskClick}
        onCreateTask={handleCreateTask}
        // Text
        title="Team Tasks"
        description="Action items for your team"
      />

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        task={selectedTask}
        userType="student"
        userEmail={userContext.email}
        userContactId={userContext.contactId}
        onTaskUpdate={updateTask}
        onCreateUpdate={createUpdate}
        teamId={team.id}
        teamMembers={teamMembersForSheet}
      />
    </div>
  );
}
