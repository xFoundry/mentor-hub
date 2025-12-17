"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSessions } from "@/hooks/use-sessions";
import { useTasks } from "@/hooks/use-tasks";
import { useUserTeam } from "@/hooks/use-team-members";
import { useCohortContext } from "@/contexts/cohort-context";
import { Calendar, CheckSquare, Users, MessageSquare, Plus } from "lucide-react";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { LiveSessionBanner } from "@/components/dashboard/live-session-banner";
import { NextSessionCard, NoUpcomingSessionCard } from "@/components/dashboard/next-session-card";
import { TeamSummary } from "@/components/dashboard/team-summary";
import { SessionList } from "@/components/shared/session-list";
import { TaskList } from "@/components/shared/task-list";
import { useTaskSheet } from "@/contexts/task-sheet-context";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { UserContext, Task, PreMeetingSubmission } from "@/types/schema";
import { hasMenteeFeedback, isSessionEligibleForFeedback, isSessionUpcoming } from "@/components/sessions/session-transformers";
import { getSessionPhase, type SessionPhase } from "@/hooks/use-session-phase";
import { useNow } from "@/hooks/use-now";

interface StudentDashboardProps {
  userContext: UserContext;
}

export function StudentDashboard({ userContext }: StudentDashboardProps) {
  const router = useRouter();
  const { selectedCohortId } = useCohortContext();
  const { sessions, isLoading: isSessionsLoading } = useSessions(userContext.email, selectedCohortId);
  const { tasks, isLoading: isTasksLoading } = useTasks(userContext.email, selectedCohortId);
  const { team, isLoading: isTeamLoading } = useUserTeam(userContext.email);
  const { openTaskSheet } = useTaskSheet();
  // Update time every 30 seconds for phase detection
  const now = useNow(30000);

  const isLoading = isSessionsLoading || isTasksLoading || isTeamLoading;

  const handleTaskClick = (task: Task) => {
    openTaskSheet(task.id);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const upcomingSessions = sessions.filter((s) => isSessionUpcoming(s));
    const completedSessions = sessions.filter((s) => s.status === "Completed");
    const openTasks = tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "Completed" || !t.due) return false;
      return new Date(t.due) < new Date();
    });

    // Sessions awaiting feedback from student
    const needsFeedback = sessions.filter(
      (s) => isSessionEligibleForFeedback(s) && !hasMenteeFeedback(s)
    );

    return {
      totalSessions: sessions.length,
      upcomingSessions: upcomingSessions.length,
      completedSessions: completedSessions.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      needsFeedback: needsFeedback.length,
    };
  }, [sessions, tasks]);

  // Sessions needing feedback
  const sessionsNeedingFeedback = useMemo(() => {
    return sessions.filter(
      (s) => isSessionEligibleForFeedback(s) && !hasMenteeFeedback(s)
    );
  }, [sessions]);

  // Upcoming sessions
  const upcomingSessions = useMemo(() => {
    return sessions
      .filter((s) => isSessionUpcoming(s))
      .sort((a, b) => {
        const dateA = new Date(a.scheduledStart!).getTime();
        const dateB = new Date(b.scheduledStart!).getTime();
        return dateA - dateB;
      });
  }, [sessions]);

  // Find live or starting-soon session for banner
  const { liveSession, startingSoonSession, nextUpcomingSession } = useMemo(() => {
    let liveSession = null;
    let startingSoonSession = null;

    for (const s of sessions) {
      const phase = getSessionPhase(s, now);
      if (phase === "during" && !liveSession) {
        liveSession = s;
      } else if (phase === "starting-soon" && !startingSoonSession) {
        startingSoonSession = s;
      }
    }

    // Next upcoming is first session after any live/starting-soon
    const nextUpcomingSession = upcomingSessions.find(
      (s) => s.id !== liveSession?.id && s.id !== startingSoonSession?.id
    ) || upcomingSessions[0] || null;

    return { liveSession, startingSoonSession, nextUpcomingSession };
  }, [sessions, upcomingSessions, now]);

  // Session to show in banner (live takes priority)
  const bannerSession = liveSession || startingSoonSession;
  const bannerPhase = bannerSession ? getSessionPhase(bannerSession, now) : null;

  // Check if user has submitted pre-meeting prep for the banner session
  const hasSubmittedPrepForBannerSession = useMemo(() => {
    if (!bannerSession || !userContext.contactId) return false;
    const submissions: PreMeetingSubmission[] = bannerSession.preMeetingSubmissions || [];
    return submissions.some(
      (s: PreMeetingSubmission) => s.respondant?.[0]?.id === userContext.contactId
    );
  }, [bannerSession, userContext.contactId]);

  // Open tasks
  const openTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  }, [tasks]);

  const handleFeedbackClick = (sessionId: string) => {
    router.push(`/feedback?session=${sessionId}`);
  };

  const statsData = [
    {
      title: "Upcoming Sessions",
      value: stats.upcomingSessions,
      subtitle: `${stats.totalSessions} total`,
      icon: Calendar,
      href: "/sessions",
    },
    {
      title: "Open Tasks",
      value: stats.openTasks,
      subtitle: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : "Pending completion",
      icon: CheckSquare,
      href: "/tasks",
    },
    {
      title: "Feedback Needed",
      value: stats.needsFeedback,
      subtitle: "Sessions to rate",
      icon: MessageSquare,
      href: "/feedback",
    },
    {
      title: "Completed Sessions",
      value: stats.completedSessions,
      subtitle: "All time",
      icon: Users,
      href: "/sessions",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <WelcomeHeader
        userContext={userContext}
        subtitle={team ? `Team: ${team.teamName}` : "Your mentorship journey"}
      />

      {/* Live/Starting Soon Session Banner */}
      {bannerSession && bannerPhase && (
        <LiveSessionBanner
          session={bannerSession}
          phase={bannerPhase}
          isMentor={false}
          hasSubmittedPrep={hasSubmittedPrepForBannerSession}
        />
      )}

      {/* Next Session Card (only if no banner showing) */}
      {!bannerSession && (
        nextUpcomingSession ? (
          <NextSessionCard session={nextUpcomingSession} isMentor={false} />
        ) : (
          <NoUpcomingSessionCard />
        )
      )}

      {/* Condensed Team Summary (collapsible) */}
      {team && (
        <TeamSummary team={team} defaultCollapsed={true} />
      )}

      {/* Stats Grid */}
      <StatsGrid stats={statsData} isLoading={isLoading} columns={4} />

      {/* Attention Section - Sessions Needing Feedback */}
      {stats.needsFeedback > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              Share Your Feedback
              <Badge variant="outline" className="border-blue-400 bg-blue-100 text-blue-800">
                {stats.needsFeedback}
              </Badge>
            </CardTitle>
            <CardDescription>
              Help your mentors by sharing feedback on completed sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionList
              sessions={sessionsNeedingFeedback}
              isLoading={isLoading}
              userType="student"
              variant="compact"
              showMentorName
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
      <QuickActions userType="student" />

      {/* Sessions and Tasks Side by Side */}
      <div className="grid gap-6 md:grid-cols-2">
        <SessionList
          sessions={upcomingSessions}
          isLoading={isLoading}
          userType="student"
          title="Upcoming Sessions"
          description="Your scheduled mentorship sessions"
          variant="compact"
          showMentorName
          maxItems={5}
          showViewAll
          viewAllHref="/sessions"
          emptyStateMessage="No upcoming sessions"
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  My Tasks
                </CardTitle>
                <CardDescription>
                  Action items assigned to you
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link href="/tasks/new">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Task
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={openTasks}
              isLoading={isLoading}
              userType="student"
              variant="compact"
              showProvenance
              maxItems={5}
              showViewAll
              viewAllHref="/tasks"
              emptyStateMessage="No open tasks - you're all caught up!"
              onTaskClick={handleTaskClick}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
