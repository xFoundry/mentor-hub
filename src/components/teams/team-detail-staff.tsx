"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { SessionList } from "@/components/shared/session-list";
import { SessionView } from "@/components/sessions";
import { TaskView, TaskDetailSheet } from "@/components/tasks";
import { useLocalSessionViewState } from "@/hooks/use-session-view-state";
import { TeamDetailHeader } from "./team-detail-header";
import { AttentionNeededCard } from "./attention-needed-card";
import { TeamMembersList } from "./team-members-list";
import { EditTeamDialog } from "./edit-team-dialog";
import { AddMemberDialog } from "./add-member-dialog";
import { RemoveMemberDialog } from "./remove-member-dialog";
import { DeleteTeamDialog } from "./delete-team-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useTeamMutations } from "@/hooks/use-team-mutations";
import { useTasks } from "@/hooks/use-tasks";
import { useLocalTaskViewState } from "@/hooks/use-task-view-state";
import type { TeamMember } from "@/hooks/use-team-members";
import {
  Calendar,
  CheckSquare,
  Users2,
  MessageSquare,
  GraduationCap,
  AlertTriangle,
  Activity,
  Plus,
} from "lucide-react";
import { format, isFuture } from "date-fns";
import {
  parseAsLocalTime,
  getMentorParticipants,
} from "@/components/sessions/session-transformers";
import Link from "next/link";
import type { Contact, Member, Session, SessionFeedback, Task, Team } from "@/types/schema";
import type { UserContext } from "@/types/schema";

interface TeamDetailStaffProps {
  team: {
    id: string;
    teamId?: string;
    teamName: string;
    teamStatus?: string;
    description?: string;
    cohorts?: Array<{ id: string; shortName: string }>;
    members?: Member[];
    mentorshipSessions?: Session[];
    actionItems?: Task[];
  };
  userContext: UserContext;
}

type FeedbackEntry = Omit<SessionFeedback, "session"> & {
  session: {
    id: string;
    sessionType?: string;
    scheduledStart?: string;
  };
};

export function TeamDetailStaff({ team, userContext }: TeamDetailStaffProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  // Extract data from team prop (must be before hooks that use them)
  const members = team.members || [];
  const sessions = team.mentorshipSessions || [];
  const tasks = team.actionItems || [];

  const { updateTeam, deleteTeam, addMember, removeMember } = useTeamMutations(team.id, members);
  const { updateTask: baseUpdateTask, createUpdate: baseCreateUpdate } = useTasks(userContext.email);

  // Task view state (local, not URL-synced)
  const {
    viewState,
    setView,
    setFilter,
    setSort,
    setGroupBy,
  } = useLocalTaskViewState({ view: "kanban", filter: "open" });

  // Session view state (local, not URL-synced)
  const {
    viewState: sessionViewState,
    setView: setSessionView,
    setFilter: setSessionFilter,
    setSort: setSessionSort,
    setGroupBy: setSessionGroupBy,
    setSearch: setSessionSearch,
  } = useLocalSessionViewState({ view: "cards", filter: "all" });

  // Transform team members for TaskDetailSheet (contact is an array in member structure)
  const teamMembersForSheet = useMemo<TeamMember[]>(() => {
    return members.map((member: Member) => ({
      memberId: member.id,
      contact: member.contact?.[0] || ({} as Contact),
      type: member.type || "Member",
      status: member.status || "Active",
    }));
  }, [members]);

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
      (currentData: Team | undefined) => {
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

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("overview");

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
  const cohortId = team.cohorts?.[0]?.id;

  // Get current member contact IDs
  const currentMemberIds = members
    .map((m: Member) => m.contact?.[0]?.id)
  .filter((id): id is string => Boolean(id));

  // Extract unique mentors from sessions (including multi-mentor sessions)
  const mentors = useMemo(() => {
    const mentorMap = new Map<string, {
      id: string;
      fullName: string;
      email?: string;
      sessionCount: number;
      leadCount: number;
    }>();

    sessions.forEach((session: Session) => {
      // Get all mentor participants from this session
      const participants = getMentorParticipants(session);

      participants.forEach((participant) => {
        const mentor = participant.contact;
        if (!mentor?.id) return;

        const existing = mentorMap.get(mentor.id);
        if (existing) {
          mentorMap.set(mentor.id, {
            ...existing,
            sessionCount: existing.sessionCount + 1,
            leadCount: existing.leadCount + (participant.isLead ? 1 : 0),
          });
        } else {
          mentorMap.set(mentor.id, {
            id: mentor.id,
            fullName: mentor.fullName || "Unknown",
            email: mentor.email,
            sessionCount: 1,
            leadCount: participant.isLead ? 1 : 0,
          });
        }
      });
    });

    // Sort by session count descending
    return Array.from(mentorMap.values()).sort((a, b) => b.sessionCount - a.sessionCount);
  }, [sessions]);

  // Calculate stats
  const stats = useMemo(() => {
    const upcomingSessions = sessions.filter(
      (s: Session) => s.scheduledStart && s.status !== "Cancelled" && isFuture(parseAsLocalTime(s.scheduledStart))
    );
    const openTasks = tasks.filter(
      (t: Task) => t.status !== "Completed" && t.status !== "Cancelled"
    );
    const overdueTasks = tasks.filter((t: Task) => {
      if (t.status === "Completed" || !t.due) return false;
      return new Date(t.due) < new Date();
    });

    // All feedback
    const allFeedback = sessions
      .filter((s: Session) => s.feedback && s.feedback.length > 0)
      .flatMap((s: Session) =>
          (s.feedback ?? []).map((fb: SessionFeedback) => ({
          ...fb,
          session: {
            id: s.id,
            sessionType: s.sessionType,
            scheduledStart: s.scheduledStart,
          },
        }))
      );

    return {
      memberCount: members.length,
      mentorCount: mentors.length,
      sessionCount: sessions.length,
      upcomingSessions: upcomingSessions.length,
      taskCount: tasks.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      feedbackCount: allFeedback.length,
    };
  }, [sessions, tasks, members, mentors]);

  // Extract all feedback from sessions
  const allFeedback = useMemo(() => {
    return sessions
      .filter((s: Session) => s.feedback && s.feedback.length > 0)
      .flatMap((s: Session) =>
        (s.feedback ?? []).map((fb: SessionFeedback) => ({
          ...fb,
          session: {
            id: s.id,
            sessionType: s.sessionType,
            scheduledStart: s.scheduledStart,
          },
        }))
      );
  }, [sessions]);

  const statsData = [
    {
      title: "Members",
      value: stats.memberCount,
      subtitle: "Team size",
      icon: Users2,
    },
    {
      title: "Mentors",
      value: stats.mentorCount,
      subtitle: "Assigned",
      icon: GraduationCap,
    },
    {
      title: "Sessions",
      value: stats.sessionCount,
      subtitle: `${stats.upcomingSessions} upcoming`,
      icon: Calendar,
    },
    {
      title: "Tasks",
      value: stats.openTasks,
      subtitle: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : "Open",
      icon: CheckSquare,
    },
  ];

  // Handlers
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

  const handleSessionClick = (session: Session) => {
    router.push(`/sessions/${session.id}`);
  };

  const handleFeedbackClick = (sessionId: string) => {
    router.push(`/feedback?session=${sessionId}`);
  };

  const handleCreateSession = () => {
    router.push(`/sessions/new?team=${team.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with management actions */}
      <TeamDetailHeader
        team={team}
        userType="staff"
        onEditTeam={handleEditTeam}
        onAddMember={handleAddMember}
        onDeleteTeam={handleDeleteTeam}
        onCreateTask={handleCreateTask}
      />

      {/* Stats Grid */}
      <StatsGrid stats={statsData} columns={4} />

      {/* Attention Card */}
      <AttentionNeededCard
        sessions={sessions}
        tasks={tasks}
        userType="staff"
        teamId={team.id}
        onViewTasks={() => setActiveTab("tasks")}
      />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            Sessions
            <Badge variant="default">{stats.sessionCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            Tasks
            <Badge variant="default">{stats.openTasks}</Badge>
            {stats.overdueTasks > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.overdueTasks}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            Members
            <Badge variant="default">{stats.memberCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            Feedback
            <Badge variant="default">{stats.feedbackCount}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common team management tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleAddMember}
                >
                  <Users2 className="mr-2 h-4 w-4" />
                  Add Team Member
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={`/sessions/new?team=${team.id}`}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Session
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={`/tasks/new?team=${team.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleEditTeam}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Edit Team Details
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription>
                  Next scheduled mentorship sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SessionList
                  sessions={sessions.filter(
                    (s: Session) => s.scheduledStart && s.status !== "Cancelled" && isFuture(parseAsLocalTime(s.scheduledStart))
                  ).slice(0, 3)}
                  userType="staff"
                  variant="compact"
                  showMentorName
                  emptyStateMessage="No upcoming sessions"
                />
              </CardContent>
            </Card>
          </div>

          {/* Mentors Section */}
          {mentors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Team Mentors
                </CardTitle>
                <CardDescription>
                  Mentors who have worked with this team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {mentors.map((mentor) => {
                    // Show role distribution: "Lead" if mostly lead, "Supporting" if mostly supporting
                    const roleLabel = mentor.leadCount === mentor.sessionCount
                      ? "Lead"
                      : mentor.leadCount === 0
                        ? "Supporting"
                        : `${mentor.leadCount} lead`;
                    return (
                      <Badge
                        key={mentor.id}
                        variant={mentor.leadCount > 0 ? "default" : "secondary"}
                        className="px-3 py-1"
                      >
                        {mentor.fullName} · {mentor.sessionCount} session{mentor.sessionCount !== 1 ? "s" : ""}
                        {mentor.sessionCount > 1 && mentor.leadCount > 0 && mentor.leadCount < mentor.sessionCount && (
                          <span className="text-xs opacity-75 ml-1">({roleLabel})</span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <SessionView
            sessions={sessions}
            isLoading={false}
            userType="staff"
            userEmail={userContext.email}
            view={sessionViewState.view}
            filter={sessionViewState.filter}
            sort={sessionViewState.sort}
            sortDirection={sessionViewState.sortDirection}
            groupBy={sessionViewState.groupBy}
            search={sessionViewState.search}
            onViewChange={setSessionView}
            onFilterChange={setSessionFilter}
            onSortChange={setSessionSort}
            onGroupByChange={setSessionGroupBy}
            onSearchChange={setSessionSearch}
            onSessionClick={handleSessionClick}
            onFeedbackClick={handleFeedbackClick}
            onCreateSession={handleCreateSession}
            availableViews={["cards", "table"]}
            variant="embedded"
            showHeader={true}
            showStats={false}
            showFeedbackBanner={true}
            showControls={true}
            showSearch={true}
            showViewSwitcher={true}
            showFilter={true}
            showSort={true}
            showGroupBy={true}
            showCreateButton={true}
            showTeamName={false}
            showMentorName={true}
            showFeedbackStatus={true}
            title="All Sessions"
            description="Complete session history for this team"
          />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <TaskView
            tasks={tasks}
            userType="staff"
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
            availableViews={["table", "kanban", "list"]}
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
            title="Action Items"
            description="All tasks for this team"
          />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <TeamMembersList
            members={members}
            userType="staff"
            currentUserEmail={userContext.email}
            variant="grid"
            showActions
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            title="Team Members"
            description="Manage team membership"
          />
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          {allFeedback.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={MessageSquare}
                  title="No feedback yet"
                  description="Feedback will appear here after sessions are completed"
                />
              </CardContent>
            </Card>
          ) : (
            allFeedback.map((feedback: FeedbackEntry) => (
              <Card key={feedback.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {feedback.session.sessionType || "Session"} Feedback
                      </CardTitle>
                      {feedback.session.scheduledStart && (
                        <CardDescription>
                          {format(parseAsLocalTime(feedback.session.scheduledStart), "MMMM d, yyyy")}
                        </CardDescription>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/sessions/${feedback.session.id}`}>
                        View Session
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feedback.whatWentWell && (
                    <div>
                      <h4 className="mb-1 font-medium text-sm">What Went Well</h4>
                      <p className="text-muted-foreground text-sm">{feedback.whatWentWell}</p>
                    </div>
                  )}
                  {feedback.areasForImprovement && (
                    <div>
                      <h4 className="mb-1 font-medium text-sm">Areas for Improvement</h4>
                      <p className="text-muted-foreground text-sm">{feedback.areasForImprovement}</p>
                    </div>
                  )}
                  {feedback.additionalNeeds && (
                    <div>
                      <h4 className="mb-1 font-medium text-sm">Additional Needs</h4>
                      <p className="text-muted-foreground text-sm">{feedback.additionalNeeds}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
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
        taskCount={stats.taskCount}
        onConfirm={handleConfirmDeleteTeam}
      />

      {/* Task Detail Sheet */}
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
