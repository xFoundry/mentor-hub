"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { SessionList } from "@/components/shared/session-list";
import { SessionView } from "@/components/sessions";
import { TaskView, TaskDetailSheet } from "@/components/tasks";
import { useLocalSessionViewState } from "@/hooks/use-session-view-state";
import { TeamDetailHeader } from "./team-detail-header";
import { AttentionNeededCard } from "./attention-needed-card";
import { TeamMembersList } from "./team-members-list";
import { EmptyState } from "@/components/shared/empty-state";
import { useTasks } from "@/hooks/use-tasks";
import { useLocalTaskViewState } from "@/hooks/use-task-view-state";
import type { TeamMember } from "@/hooks/use-team-members";
import { Calendar, CheckSquare, Users2, MessageSquare, GraduationCap } from "lucide-react";
import { format, isFuture } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Session, Task } from "@/types/schema";
import type { UserContext } from "@/types/schema";
import { hasMentorFeedback, isSessionEligibleForFeedback, isCurrentUserMentor, parseAsLocalTime } from "@/components/sessions/session-transformers";

interface TeamDetailMentorProps {
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

export function TeamDetailMentor({ team, userContext }: TeamDetailMentorProps) {
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

  // Session view state (local, not URL-synced)
  const {
    viewState: sessionViewState,
    setView: setSessionView,
    setFilter: setSessionFilter,
    setSort: setSessionSort,
    setGroupBy: setSessionGroupBy,
    setSearch: setSessionSearch,
  } = useLocalSessionViewState({ view: "cards", filter: "all" });

  // Tab state
  const [activeTab, setActiveTab] = useState("sessions");

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

  // Calculate stats and attention items
  const stats = useMemo(() => {
    const upcomingSessions = sessions.filter(
      (s: any) => s.scheduledStart && s.status !== "Cancelled" && isFuture(parseAsLocalTime(s.scheduledStart))
    );
    const completedSessions = sessions.filter((s: any) => s.status === "Completed");
    const openTasks = tasks.filter(
      (t: any) => t.status !== "Completed" && t.status !== "Cancelled"
    );
    const overdueTasks = tasks.filter((t: any) => {
      if (t.status === "Completed" || !t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    });

    // Sessions needing feedback from mentor - only count sessions where current user was the mentor
    const needsFeedback = sessions.filter(
      (s: any) => isCurrentUserMentor(s, userContext.email) && isSessionEligibleForFeedback(s) && !hasMentorFeedback(s)
    );

    // Count of sessions where current user is the mentor
    const mySessions = sessions.filter((s: any) => isCurrentUserMentor(s, userContext.email));

    // All feedback given
    const allFeedback = sessions
      .filter((s: any) => s.feedback && s.feedback.length > 0)
      .flatMap((s: any) =>
        s.feedback.map((fb: any) => ({
          ...fb,
          session: {
            id: s.id,
            sessionType: s.sessionType,
            scheduledStart: s.scheduledStart,
          },
        }))
      );

    return {
      totalSessions: sessions.length,
      mySessions: mySessions.length,
      upcomingSessions: upcomingSessions.length,
      completedSessions: completedSessions.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      needsFeedback: needsFeedback.length,
      memberCount: members.length,
      feedbackCount: allFeedback.length,
    };
  }, [sessions, tasks, members, userContext.email]);

  // Extract all feedback from sessions
  const allFeedback = useMemo(() => {
    return sessions
      .filter((s: any) => s.feedback && s.feedback.length > 0)
      .flatMap((s: any) =>
        s.feedback.map((fb: any) => ({
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
      title: "Sessions",
      value: stats.totalSessions,
      subtitle: `${stats.upcomingSessions} upcoming`,
      icon: Calendar,
    },
    {
      title: "Tasks",
      value: stats.openTasks,
      subtitle: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : "Open items",
      icon: CheckSquare,
    },
    {
      title: "Members",
      value: stats.memberCount,
      subtitle: "Team size",
      icon: Users2,
    },
    {
      title: "Feedback Given",
      value: stats.feedbackCount,
      subtitle: "Total entries",
      icon: MessageSquare,
    },
  ];

  const handleSessionClick = (session: Session) => {
    // Only allow clicking on sessions where current user is the mentor
    if (isCurrentUserMentor(session, userContext.email)) {
      router.push(`/sessions/${session.id}`);
    }
  };

  const handleFeedbackClick = (sessionId: string) => {
    // Find the session and only allow feedback for sessions where current user is the mentor
    const session = sessions.find(s => s.id === sessionId);
    if (session && isCurrentUserMentor(session, userContext.email)) {
      router.push(`/feedback?session=${sessionId}`);
    }
  };

  const handleCreateSession = () => {
    router.push(`/sessions/new?team=${team.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <TeamDetailHeader
        team={team}
        userType="mentor"
        subtitle="Your mentee team"
      />

      {/* Attention Card - only pass sessions where current user is the mentor */}
      <AttentionNeededCard
        sessions={sessions.filter(s => isCurrentUserMentor(s, userContext.email))}
        tasks={tasks}
        userType="mentor"
        userEmail={userContext.email}
        teamId={team.id}
        onFeedbackClick={handleFeedbackClick}
        onViewTasks={() => setActiveTab("tasks")}
      />

      {/* Stats Grid */}
      <StatsGrid stats={statsData} columns={4} />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            Sessions
            {stats.needsFeedback > 0 && (
              <Badge variant="default" className="ml-1">
                {stats.needsFeedback}
              </Badge>
            )}
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

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <SessionView
            sessions={sessions}
            isLoading={false}
            userType="mentor"
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
            restrictInteractionToUserSessions={true}
            title="Team Sessions"
            description={`${stats.mySessions} of ${stats.totalSessions} sessions are yours`}
          />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <TaskView
            tasks={tasks}
            userType="mentor"
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
            showCreateButton={false}
            showAssignee={true}
            showActions={true}
            disableDrag={true}
            // Callbacks
            onTaskUpdate={updateTask}
            onTaskClick={handleTaskClick}
            onEditClick={handleTaskClick}
            onPostUpdateClick={handleTaskClick}
            // Text
            title="Action Items"
            description="Tasks assigned to team members"
          />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <TeamMembersList
            members={members}
            userType="mentor"
            currentUserEmail={userContext.email}
            variant="grid"
            showActions={false}
            title="Team Members"
            description="Students in this team"
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
            allFeedback.map((feedback: any) => (
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

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        task={selectedTask}
        userType="mentor"
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
