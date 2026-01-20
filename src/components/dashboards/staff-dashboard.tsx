"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSessions } from "@/hooks/use-sessions";
import { useTasks } from "@/hooks/use-tasks";
import { useTeams } from "@/hooks/use-teams";
import { useCohortContext } from "@/contexts/cohort-context";
import { Calendar, CheckSquare, Users, TrendingUp, AlertCircle, MessageSquare } from "lucide-react";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SessionList } from "@/components/shared/session-list";
import { TaskList } from "@/components/shared/task-list";
import { useTaskSheet } from "@/contexts/task-sheet-context";
import { DataViewControls } from "@/components/staff/data-view-controls";
import type { UserContext, Task, Team, Session } from "@/types/schema";
import { hasMentorFeedback, isSessionEligibleForFeedback, isSessionUpcoming } from "@/components/sessions/session-transformers";

interface StaffDashboardProps {
  userContext: UserContext;
}

type GroupByOption = "none" | "team" | "mentor";

export function StaffDashboard({ userContext }: StaffDashboardProps) {
  const router = useRouter();
  const { selectedCohortId, setSelectedCohortId } = useCohortContext();
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");

  const { sessions, isLoading: isSessionsLoading } = useSessions(userContext.email, selectedCohortId);
  const { tasks, isLoading: isTasksLoading } = useTasks(userContext.email, selectedCohortId);
  const { teams, isLoading: isTeamsLoading } = useTeams(selectedCohortId);
  const { openTaskSheet } = useTaskSheet();

  const isLoading = isSessionsLoading || isTasksLoading || isTeamsLoading;

  const handleTaskClick = (task: Task) => {
    openTaskSheet(task.id);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const upcomingSessions = sessions.filter((s) => isSessionUpcoming(s));
    const completedSessions = sessions.filter((s) => s.status === "Completed");
    const activeTasks = tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
    const completedTasks = tasks.filter((t) => t.status === "Completed");
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "Completed" || !t.due) return false;
      return new Date(t.due) < new Date();
    });

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      upcomingSessions: upcomingSessions.length,
      totalTeams: teams.length,
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
    };
  }, [sessions, tasks, teams]);

  // Calculate attention items
  const attentionItems = useMemo(() => {
    const items: { type: string; count: number; message: string }[] = [];

    // Sessions needing feedback
    const sessionsNeedingFeedback = sessions.filter(
      (s) => isSessionEligibleForFeedback(s) && !hasMentorFeedback(s)
    );
    if (sessionsNeedingFeedback.length > 0) {
      items.push({
        type: "feedback",
        count: sessionsNeedingFeedback.length,
        message: `${sessionsNeedingFeedback.length} session${sessionsNeedingFeedback.length > 1 ? "s" : ""} need feedback`,
      });
    }

    // Overdue tasks
    if (stats.overdueTasks > 0) {
      items.push({
        type: "overdue",
        count: stats.overdueTasks,
        message: `${stats.overdueTasks} task${stats.overdueTasks > 1 ? "s" : ""} overdue`,
      });
    }

    // Teams without recent sessions
    const teamsWithoutSessions = teams.filter((team: Team) => {
      const teamSessions = sessions.filter(
        (s: Session) => s.team?.[0]?.id === team.id
      );
      return teamSessions.length === 0;
    });
    if (teamsWithoutSessions.length > 0) {
      items.push({
        type: "teams",
        count: teamsWithoutSessions.length,
        message: `${teamsWithoutSessions.length} team${teamsWithoutSessions.length > 1 ? "s" : ""} without sessions`,
      });
    }

    return items;
  }, [sessions, tasks, teams, stats.overdueTasks]);

  // Filter sessions and tasks
  const upcomingSessions = useMemo(() => {
    return sessions
      .filter((s) => isSessionUpcoming(s))
      .sort((a, b) => {
        const dateA = new Date(a.scheduledStart!).getTime();
        const dateB = new Date(b.scheduledStart!).getTime();
        return dateA - dateB;
      });
  }, [sessions]);

  const openTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  }, [tasks]);

  const handleFeedbackClick = (sessionId: string) => {
    router.push(`/feedback?session=${sessionId}`);
  };

  const statsData = [
    {
      title: "Sessions This Week",
      value: stats.upcomingSessions,
      subtitle: `${stats.totalSessions} total`,
      icon: Calendar,
      href: "/sessions",
    },
    {
      title: "Active Teams",
      value: stats.totalTeams,
      subtitle: "In cohort",
      icon: Users,
      href: "/teams",
    },
    {
      title: "Tasks Overdue",
      value: stats.overdueTasks,
      subtitle: `${stats.activeTasks} active`,
      icon: CheckSquare,
      href: "/tasks",
    },
    {
      title: "Pending Feedback",
      value: sessions.filter((s) => isSessionEligibleForFeedback(s) && !hasMentorFeedback(s)).length,
      subtitle: "Sessions awaiting",
      icon: MessageSquare,
      href: "/feedback",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <WelcomeHeader
        userContext={userContext}
        subtitle={`Program overview${selectedCohortId !== "all" ? "" : " across all cohorts"}`}
      />

      {/* Data View Controls */}
      <DataViewControls
        selectedCohortId={selectedCohortId}
        onCohortChange={setSelectedCohortId}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

      {/* Stats Grid */}
      <StatsGrid stats={statsData} isLoading={isLoading} columns={4} />

      {/* Attention Items + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Attention Needed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Attention Needed
            </CardTitle>
            <CardDescription>Items requiring your action</CardDescription>
          </CardHeader>
          <CardContent>
            {attentionItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">All caught up!</p>
            ) : (
              <div className="space-y-2">
                {attentionItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm">{item.message}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <QuickActions userType="staff" />
      </div>

      {/* Sessions and Tasks - Side by Side or Grouped */}
      <div className="grid gap-6 md:grid-cols-2">
        <SessionList
          sessions={upcomingSessions}
          isLoading={isLoading}
          userType="staff"
          title="Upcoming Sessions"
          description="Scheduled sessions"
          groupBy={groupBy}
          variant="compact"
          showTeamName
          showMentorName
          showFeedbackStatus
          maxItems={groupBy === "none" ? 5 : undefined}
          showViewAll={groupBy === "none"}
          viewAllHref="/sessions"
          onFeedbackClick={handleFeedbackClick}
          emptyStateMessage="No upcoming sessions"
        />

        <TaskList
          tasks={openTasks}
          isLoading={isLoading}
          userType="staff"
          title="Open Tasks"
          description="Pending action items"
          groupBy={groupBy === "mentor" ? "none" : groupBy}
          variant="compact"
          showAssignee
          maxItems={groupBy === "none" ? 5 : undefined}
          showViewAll={groupBy === "none"}
          viewAllHref="/tasks"
          emptyStateMessage="No open tasks"
          onTaskClick={handleTaskClick}
        />
      </div>
    </div>
  );
}
