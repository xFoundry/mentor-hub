"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { UpcomingSessionsCard } from "../../upcoming-sessions-card";
import { AttentionNeededCard } from "../../attention-needed-card";
import {
  Calendar,
  CheckSquare,
  GraduationCap,
  Users2,
} from "lucide-react";
import type { TeamTabBaseProps, TeamStats, TeamMentor } from "./types";

interface TeamOverviewTabProps extends TeamTabBaseProps {
  stats: TeamStats;
  mentors: TeamMentor[];
  onViewTasks?: () => void;
}

export function TeamOverviewTab({
  team,
  userContext,
  userType,
  stats,
  mentors,
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

      {/* Two column layout: Attention + Next Session */}
      <div className="grid gap-6 md:grid-cols-2">
        <AttentionNeededCard
          sessions={sessions}
          tasks={tasks}
          userType={userType}
          teamId={team.id}
          onViewTasks={onViewTasks}
        />

        <UpcomingSessionsCard
          sessions={sessions}
          teamId={team.id}
          showViewAll={true}
          currentUserEmail={userContext.email}
          userType={userType}
        />
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
