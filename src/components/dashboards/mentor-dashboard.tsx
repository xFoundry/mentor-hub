"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSessions } from "@/hooks/use-sessions";
import { useTasks } from "@/hooks/use-tasks";
import { useMentorTeams } from "@/hooks/use-mentor-teams";
import { useCohortContext } from "@/contexts/cohort-context";
import { Calendar, CheckSquare, MessageSquare, Users, AlertCircle } from "lucide-react";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SessionList } from "@/components/shared/session-list";
import { TaskList } from "@/components/shared/task-list";
import { TaskDetailSheet } from "@/components/tasks";
import { TeamCard } from "@/components/shared/team-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserContext, Task } from "@/types/schema";
import { hasMentorFeedback, isSessionEligibleForFeedback, isSessionUpcoming } from "@/components/sessions/session-transformers";

interface MentorDashboardProps {
  userContext: UserContext;
}

export function MentorDashboard({ userContext }: MentorDashboardProps) {
  const router = useRouter();
  const { selectedCohortId } = useCohortContext();
  const { sessions, isLoading: isSessionsLoading } = useSessions(userContext.email, selectedCohortId);
  const { tasks, isLoading: isTasksLoading, updateTask, createUpdate } = useTasks(userContext.email, selectedCohortId);
  const { teams, isLoading: isTeamsLoading } = useMentorTeams();

  // Task detail sheet state - store ID only, look up from array for fresh data
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const isLoading = isSessionsLoading || isTasksLoading || isTeamsLoading;

  // Look up task from array to get optimistically updated data
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setIsSheetOpen(true);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const needsFeedback = sessions.filter(
      (s) => isSessionEligibleForFeedback(s) && !hasMentorFeedback(s)
    );
    const upcomingSessions = sessions.filter((s) => isSessionUpcoming(s));
    const openTasks = tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");

    return {
      totalSessions: sessions.length,
      needsFeedback: needsFeedback.length,
      upcomingSessions: upcomingSessions.length,
      openTasks: openTasks.length,
      teamCount: teams.length,
    };
  }, [sessions, tasks, teams]);

  // Filter sessions needing feedback
  const sessionsNeedingFeedback = useMemo(() => {
    return sessions.filter(
      (s) => isSessionEligibleForFeedback(s) && !hasMentorFeedback(s)
    );
  }, [sessions]);

  // Filter upcoming sessions
  const upcomingSessions = useMemo(() => {
    return sessions
      .filter((s) => isSessionUpcoming(s))
      .sort((a, b) => {
        const dateA = new Date(a.scheduledStart!).getTime();
        const dateB = new Date(b.scheduledStart!).getTime();
        return dateA - dateB;
      });
  }, [sessions]);

  // Open tasks
  const openTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  }, [tasks]);

  const handleFeedbackClick = (sessionId: string) => {
    router.push(`/feedback?session=${sessionId}`);
  };

  const statsData = [
    {
      title: "My Teams",
      value: stats.teamCount,
      subtitle: "Active mentorships",
      icon: Users,
    },
    {
      title: "Total Sessions",
      value: stats.totalSessions,
      subtitle: `${stats.upcomingSessions} upcoming`,
      icon: Calendar,
      href: "/sessions",
    },
    {
      title: "Needs Feedback",
      value: stats.needsFeedback,
      subtitle: "Completed sessions",
      icon: MessageSquare,
      href: "/feedback",
    },
    {
      title: "Active Tasks",
      value: stats.openTasks,
      subtitle: "Tasks assigned",
      icon: CheckSquare,
      href: "/tasks",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <WelcomeHeader
        userContext={userContext}
        subtitle={`You mentor ${stats.teamCount} team${stats.teamCount !== 1 ? "s" : ""}`}
      />

      {/* My Teams - Prominent Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Teams
          </CardTitle>
          <CardDescription>Teams you are currently mentoring</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No teams assigned yet"
              description="Your mentee teams will appear here"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  variant="compact"
                  showStats
                  showMembers
                  href={`/teams/${team.id}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <StatsGrid stats={statsData} isLoading={isLoading} columns={4} />

      {/* Attention Section - Sessions Needing Feedback */}
      {stats.needsFeedback > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Needs Your Attention
              <Badge variant="outline" className="border-yellow-400 bg-yellow-100 text-yellow-800">
                {stats.needsFeedback}
              </Badge>
            </CardTitle>
            <CardDescription>
              Completed sessions awaiting your feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionList
              sessions={sessionsNeedingFeedback}
              isLoading={isLoading}
              userType="mentor"
              variant="compact"
              showTeamName
              showFeedbackStatus
              maxItems={3}
              showViewAll={stats.needsFeedback > 3}
              viewAllHref="/sessions"
              onFeedbackClick={handleFeedbackClick}
              emptyStateMessage="No feedback pending"
            />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <QuickActions userType="mentor" />

      {/* Sessions and Tasks Side by Side */}
      <div className="grid gap-6 md:grid-cols-2">
        <SessionList
          sessions={upcomingSessions}
          isLoading={isLoading}
          userType="mentor"
          title="Upcoming Sessions"
          description="Your scheduled mentorship sessions"
          variant="compact"
          showTeamName
          maxItems={5}
          showViewAll
          viewAllHref="/sessions"
          emptyStateMessage="No upcoming sessions"
        />

        <TaskList
          tasks={openTasks}
          isLoading={isLoading}
          userType="mentor"
          title="Active Tasks"
          description="Tasks assigned to your mentees"
          variant="compact"
          showAssignee
          maxItems={5}
          showViewAll
          viewAllHref="/tasks"
          emptyStateMessage="No active tasks"
          onTaskClick={handleTaskClick}
        />
      </div>

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
      />
    </div>
  );
}
