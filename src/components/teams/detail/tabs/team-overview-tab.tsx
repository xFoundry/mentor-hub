"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { UpcomingSessionsCard } from "../../upcoming-sessions-card";
import { AttentionNeededCard } from "../../attention-needed-card";
import {
  Activity,
  Calendar,
  CheckSquare,
  GraduationCap,
  Plus,
  Users2,
} from "lucide-react";
import type { TeamTabBaseProps, TeamStats, TeamMentor } from "./types";

interface TeamOverviewTabProps extends TeamTabBaseProps {
  stats: TeamStats;
  mentors: TeamMentor[];
  onAddMember?: () => void;
  onEditTeam?: () => void;
  onViewTasks?: () => void;
}

export function TeamOverviewTab({
  team,
  userContext,
  userType,
  stats,
  mentors,
  onAddMember,
  onEditTeam,
  onViewTasks,
}: TeamOverviewTabProps) {
  const sessions = team.mentorshipSessions || [];
  const tasks = team.actionItems || [];
  const isStaff = userType === "staff";
  const isStudent = userType === "student";

  // Stats data differs by role
  const statsData = useMemo(() => {
    if (isStudent) {
      // Students see: upcoming sessions, open tasks, teammates
      return [
        {
          title: "Upcoming",
          value: stats.upcomingSessions,
          subtitle: "Sessions",
          icon: Calendar,
        },
        {
          title: "Open Tasks",
          value: stats.openTasks,
          subtitle: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : "Action items",
          icon: CheckSquare,
        },
        {
          title: "Teammates",
          value: stats.memberCount,
          subtitle: "Team size",
          icon: Users2,
        },
      ];
    }

    // Mentor and Staff see: members, mentors, sessions, tasks
    return [
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
  }, [stats, isStudent]);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <StatsGrid stats={statsData} columns={isStudent ? 3 : 4} />

      {/* Attention Card */}
      <AttentionNeededCard
        sessions={sessions}
        tasks={tasks}
        userType={userType}
        teamId={team.id}
        onViewTasks={onViewTasks}
      />

      {/* Two column layout for cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions (Staff only) */}
        {isStaff && (
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
                onClick={onAddMember}
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
                onClick={onEditTeam}
              >
                <Activity className="mr-2 h-4 w-4" />
                Edit Team Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Sessions */}
        <UpcomingSessionsCard
          sessions={sessions}
          teamId={team.id}
          maxItems={1}
          showViewAll={true}
        />

        {/* If not staff, the upcoming sessions card takes full width in its column */}
        {!isStaff && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Recent Tasks
              </CardTitle>
              <CardDescription>
                Latest action items for your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No tasks assigned yet
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks
                    .filter(t => t.status !== "Completed" && t.status !== "Cancelled")
                    .slice(0, 3)
                    .map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="block p-2 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <p className="font-medium text-sm truncate">{task.name}</p>
                        {task.due && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(task.due).toLocaleDateString()}
                          </p>
                        )}
                      </Link>
                    ))}
                  {tasks.filter(t => t.status !== "Completed" && t.status !== "Cancelled").length > 3 && (
                    <Button variant="ghost" size="sm" className="w-full" onClick={onViewTasks}>
                      View all tasks
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mentors Section (Staff only) */}
      {isStaff && mentors.length > 0 && (
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
              {mentors.map((mentor) => (
                <Badge key={mentor.id} variant="secondary" className="px-3 py-1">
                  {mentor.fullName} ({mentor.sessionCount} session{mentor.sessionCount !== 1 ? "s" : ""})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
