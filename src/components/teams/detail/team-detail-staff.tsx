"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TaskDetailSheet } from "@/components/tasks";
import { useTeamMutations } from "@/hooks/use-team-mutations";
import { useTasks } from "@/hooks/use-tasks";
import { isFuture } from "date-fns";
import { parseAsLocalTime, getMentorParticipants } from "@/components/sessions/session-transformers";
import {
  Calendar,
  CheckSquare,
  Users2,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";
import { TeamDetailHeader } from "./team-detail-header";
import { EditTeamDialog } from "../edit-team-dialog";
import { AddMemberDialog } from "../add-member-dialog";
import { RemoveMemberDialog } from "../remove-member-dialog";
import { DeleteTeamDialog } from "../delete-team-dialog";
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

interface TeamDetailStaffProps {
  team: TeamDetail;
  userContext: UserContext;
}

export function TeamDetailStaff({ team, userContext }: TeamDetailStaffProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const members = team.members || [];
  const sessions = team.mentorshipSessions || [];
  const tasks = team.actionItems || [];

  const { updateTeam, deleteTeam, addMember, removeMember } = useTeamMutations(team.id, members);
  const { updateTask: baseUpdateTask, createUpdate: baseCreateUpdate } = useTasks(userContext.email);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Task detail sheet state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  // Transform team members for TaskDetailSheet
  const teamMembersForSheet = useMemo<TeamMember[]>(() => {
    return members.map((member) => ({
      memberId: member.id,
      contact: member.contact?.[0] || { id: "", fullName: "" },
      type: (member.type || "Member") as "Member" | "Lead",
      status: member.status || "",
    }));
  }, [members]);

  const cohortId = team.cohorts?.[0]?.id;

  // Get current member contact IDs for AddMemberDialog
  const currentMemberIds = members
    .map((m) => m.contact?.[0]?.id)
    .filter(Boolean) as string[];

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
      needsFeedback: 0,
    };
  }, [sessions, tasks, members, mentors]);

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

  // Dialog handlers
  const handleEditTeam = () => setEditDialogOpen(true);
  const handleAddMember = () => setAddMemberDialogOpen(true);
  const handleDeleteTeam = () => setDeleteDialogOpen(true);

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
    setRemoveMemberDialogOpen(true);
  };

  const handleSaveTeam = async (updates: {
    teamName?: string;
    description?: string;
    teamStatus?: "Active" | "Inactive" | "Archived";
  }) => {
    await updateTeam(updates);
  };

  const handleConfirmAddMember = async (contactId: string, type?: string) => {
    await addMember(contactId, type);
  };

  const handleConfirmRemoveMember = async (memberId: string) => {
    await removeMember(memberId);
    setMemberToRemove(null);
  };

  const handleConfirmDeleteTeam = async () => {
    await deleteTeam();
    router.push("/teams");
  };

  const handleCreateTask = () => {
    router.push(`/tasks/new?team=${team.id}`);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setIsSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <TeamDetailHeader
        team={team}
        userType="staff"
        onEditTeam={handleEditTeam}
        onAddMember={handleAddMember}
        onDeleteTeam={handleDeleteTeam}
        onCreateTask={handleCreateTask}
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
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
            {stats.feedbackCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {stats.feedbackCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TeamOverviewTab
            team={team}
            userContext={userContext}
            userType="staff"
            stats={stats}
            mentors={mentors}
            onAddMember={handleAddMember}
            onEditTeam={handleEditTeam}
          />
        </TabsContent>

        <TabsContent value="sessions">
          <TeamSessionsTab
            team={team}
            userContext={userContext}
            userType="staff"
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TeamTasksTab
            team={team}
            userContext={userContext}
            userType="staff"
            onTaskUpdate={updateTask}
            onCreateTask={handleCreateTask}
          />
        </TabsContent>

        <TabsContent value="members">
          <TeamMembersTab
            team={team}
            userContext={userContext}
            userType="staff"
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
          />
        </TabsContent>

        <TabsContent value="feedback">
          <TeamFeedbackTab
            team={team}
            userContext={userContext}
            userType="staff"
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EditTeamDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        team={team}
        onSave={handleSaveTeam}
      />

      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        teamId={team.id}
        teamName={team.teamName}
        cohortId={cohortId}
        currentMemberIds={currentMemberIds}
        onAddMember={handleConfirmAddMember}
      />

      {memberToRemove && (
        <RemoveMemberDialog
          open={removeMemberDialogOpen}
          onOpenChange={setRemoveMemberDialogOpen}
          memberId={memberToRemove.id}
          memberName={memberToRemove.name}
          teamName={team.teamName}
          onConfirm={handleConfirmRemoveMember}
        />
      )}

      <DeleteTeamDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        teamName={team.teamName}
        memberCount={stats.memberCount}
        sessionCount={stats.sessionCount}
        taskCount={tasks.length}
        onConfirm={handleConfirmDeleteTeam}
      />

      <TaskDetailSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        task={selectedTask}
        userType="staff"
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
