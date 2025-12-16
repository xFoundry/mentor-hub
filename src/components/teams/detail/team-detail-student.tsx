"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TaskDetailSheet } from "@/components/tasks";
import { useTasks } from "@/hooks/use-tasks";
import { isFuture } from "date-fns";
import { parseAsLocalTime } from "@/components/sessions/session-transformers";
import { Calendar, CheckSquare, Users2, LayoutDashboard } from "lucide-react";
import { TeamDetailHeader } from "./team-detail-header";
import {
  TeamOverviewTab,
  TeamSessionsTab,
  TeamTasksTab,
  TeamMembersTab,
} from "./tabs";
import type { TeamDetail, TeamStats } from "./tabs";
import type { TeamMember } from "@/hooks/use-team-members";
import type { Task } from "@/types/schema";
import type { UserContext } from "@/types/schema";

interface TeamDetailStudentProps {
  team: TeamDetail;
  userContext: UserContext;
}

export function TeamDetailStudent({ team, userContext }: TeamDetailStudentProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { updateTask: baseUpdateTask, createUpdate: baseCreateUpdate } = useTasks(userContext.email);

  const members = team.members || [];
  const sessions = team.mentorshipSessions || [];
  const tasks = team.actionItems || [];

  // Transform team members for TaskDetailSheet
  const teamMembersForSheet = useMemo<TeamMember[]>(() => {
    return members.map((member) => ({
      memberId: member.id,
      contact: member.contact?.[0] || { id: "", fullName: "" },
      type: (member.type || "Member") as "Member" | "Lead",
      status: member.status || "",
    }));
  }, [members]);

  // Task detail sheet state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  // Calculate stats
  const stats = useMemo<TeamStats>(() => {
    const upcomingSessions = sessions.filter(
      (s) => s.scheduledStart && s.status !== "Cancelled" && isFuture(parseAsLocalTime(s.scheduledStart))
    );
    const completedSessions = sessions.filter((s) => s.status === "Completed");
    const openTasks = tasks.filter(
      (t) => t.status !== "Completed" && t.status !== "Cancelled"
    );
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "Completed" || !t.due) return false;
      return new Date(t.due) < new Date();
    });

    return {
      memberCount: members.length,
      mentorCount: 0,
      sessionCount: sessions.length,
      upcomingSessions: upcomingSessions.length,
      completedSessions: completedSessions.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      feedbackCount: 0,
      needsFeedback: 0,
    };
  }, [sessions, tasks, members]);

  // Wrap updateTask with optimistic update
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    let optimisticUpdates = { ...updates };

    if (updates.assignedTo && Array.isArray(updates.assignedTo)) {
      const assignedToIds = updates.assignedTo as unknown as string[];
      const resolvedAssignees = assignedToIds
        .map(id => {
          const member = teamMembersForSheet.find((m) => m.contact?.id === id);
          return member?.contact || { id };
        })
        .filter(Boolean);
      optimisticUpdates = {
        ...optimisticUpdates,
        assignedTo: resolvedAssignees.length > 0 ? resolvedAssignees : undefined,
      };
    }

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
      mutate([`/teams/${team.id}`]);
    } catch (error) {
      mutate([`/teams/${team.id}`]);
      throw error;
    }
  }, [baseUpdateTask, mutate, team.id, teamMembersForSheet]);

  const createUpdate = useCallback(async (input: {
    taskId: string;
    authorId: string;
    health: string;
    message: string;
  }) => {
    await baseCreateUpdate(input);
    mutate([`/teams/${team.id}`]);
  }, [baseCreateUpdate, mutate, team.id]);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setIsSheetOpen(true);
  };

  const handleCreateTask = () => {
    router.push(`/tasks/new?team=${team.id}`);
  };

  const handleViewTasks = () => {
    // Navigate to tasks tab
    const tabElement = document.querySelector('[data-state="active"][role="tab"]');
    if (tabElement) {
      const tasksTab = document.querySelector('[value="tasks"][role="tab"]') as HTMLElement;
      tasksTab?.click();
    }
  };

  return (
    <div className="space-y-6">
      <TeamDetailHeader
        team={team}
        userType="student"
        subtitle="Your team"
        members={members}
        currentUserEmail={userContext.email}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sessions
            {stats.upcomingSessions > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {stats.upcomingSessions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
            {stats.openTasks > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {stats.openTasks}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            Members
            <Badge variant="secondary" className="ml-1 text-xs">
              {stats.memberCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TeamOverviewTab
            team={team}
            userContext={userContext}
            userType="student"
            stats={stats}
            mentors={[]}
            onViewTasks={handleViewTasks}
          />
        </TabsContent>

        <TabsContent value="sessions">
          <TeamSessionsTab
            team={team}
            userContext={userContext}
            userType="student"
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TeamTasksTab
            team={team}
            userContext={userContext}
            userType="student"
            onTaskUpdate={updateTask}
            onCreateTask={handleCreateTask}
          />
        </TabsContent>

        <TabsContent value="members">
          <TeamMembersTab
            team={team}
            userContext={userContext}
            userType="student"
          />
        </TabsContent>
      </Tabs>

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
