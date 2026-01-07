"use client";

import { useMemo, useCallback } from "react";
import { useSWRConfig } from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/hooks/use-tasks";
import { isFuture } from "date-fns";
import {
  hasMentorFeedback,
  isSessionEligibleForFeedback,
  isCurrentUserMentor,
  parseAsLocalTime,
  getMentorParticipants,
} from "@/components/sessions/session-transformers";
import {
  Calendar,
  CheckSquare,
  Users2,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";
import { TeamDetailHeader } from "./team-detail-header";
import {
  TeamOverviewTab,
  TeamSessionsTab,
  TeamTasksTab,
  TeamMembersTab,
  TeamFeedbackTab,
} from "./tabs";
import type { TeamDetail, TeamStats, TeamMentor } from "./tabs";
import type { TeamMember } from "@/hooks/use-team-members";
import type { Task } from "@/types/schema";
import type { UserContext } from "@/types/schema";

interface TeamDetailMentorProps {
  team: TeamDetail;
  userContext: UserContext;
}

export function TeamDetailMentor({ team, userContext }: TeamDetailMentorProps) {
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

  // Extract unique mentors from sessions (using sessionParticipants)
  const mentors = useMemo<TeamMentor[]>(() => {
    const mentorMap = new Map<string, TeamMentor>();
    sessions.forEach((session) => {
      const mentorParticipants = getMentorParticipants(session);
      mentorParticipants.forEach((mp) => {
        const mentor = mp.contact;
        if (mentor?.id) {
          const existing = mentorMap.get(mentor.id);
          if (existing) {
            existing.sessionCount++;
          } else {
            mentorMap.set(mentor.id, {
              id: mentor.id,
              fullName: mentor.fullName,
              email: mentor.email,
              headshot: mentor.headshot,
              sessionCount: 1,
            });
          }
        }
      });
    });
    return Array.from(mentorMap.values());
  }, [sessions]);

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
    const needsFeedback = sessions.filter(
      (s) => isCurrentUserMentor(s, userContext.email) && isSessionEligibleForFeedback(s) && !hasMentorFeedback(s)
    );
    const allFeedback = sessions
      .filter((s) => s.feedback && s.feedback.length > 0)
      .flatMap((s) => s.feedback || []);

    return {
      memberCount: members.length,
      mentorCount: mentors.length,
      sessionCount: sessions.length,
      upcomingSessions: upcomingSessions.length,
      completedSessions: completedSessions.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      feedbackCount: allFeedback.length,
      needsFeedback: needsFeedback.length,
    };
  }, [sessions, tasks, members, mentors, userContext.email]);

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

  return (
    <div className="space-y-6">
      <TeamDetailHeader
        team={team}
        userType="mentor"
        subtitle="Your mentee team"
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
            {stats.needsFeedback > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {stats.needsFeedback}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
            {stats.openTasks > 0 && (
              <Badge variant="outline" className="ml-1 text-xs bg-background/80">
                {stats.openTasks}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            Members
            <Badge variant="outline" className="ml-1 text-xs bg-background/80">
              {stats.memberCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
            {stats.feedbackCount > 0 && (
              <Badge variant="outline" className="ml-1 text-xs bg-background/80">
                {stats.feedbackCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TeamOverviewTab
            team={team}
            userContext={userContext}
            userType="mentor"
            stats={stats}
            mentors={mentors}
          />
        </TabsContent>

        <TabsContent value="sessions">
          <TeamSessionsTab
            team={team}
            userContext={userContext}
            userType="mentor"
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TeamTasksTab
            team={team}
            userContext={userContext}
            userType="mentor"
            onTaskUpdate={updateTask}
            onCreateUpdate={createUpdate}
            teamMembers={teamMembersForSheet}
          />
        </TabsContent>

        <TabsContent value="members">
          <TeamMembersTab
            team={team}
            userContext={userContext}
            userType="mentor"
          />
        </TabsContent>

        <TabsContent value="feedback">
          <TeamFeedbackTab
            team={team}
            userContext={userContext}
            userType="mentor"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
