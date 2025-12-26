"use client";

import { Suspense, useState, useMemo } from "react";
import { useTaskSheet } from "@/contexts/task-sheet-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserType } from "@/hooks/use-user-type";
import { useTasks } from "@/hooks/use-tasks";
import { useTeams } from "@/hooks/use-teams";
import { useCohortContext } from "@/contexts/cohort-context";
import { useTaskViewState } from "@/hooks/use-task-view-state";
import { TaskView } from "@/components/tasks";
import { hasPermission } from "@/lib/permissions";
import { useCreateTaskDialog } from "@/contexts/create-task-dialog-context";
import { PageTourWrapper } from "@/components/onboarding";
import type { Task } from "@/types/schema";

function TasksPageContent() {
  const { openDialog } = useCreateTaskDialog();
  const { openTaskSheet } = useTaskSheet();
  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { selectedCohortId } = useCohortContext();
  const { tasks, isLoading: isTasksLoading, updateTask } = useTasks(
    userContext?.email,
    selectedCohortId
  );

  // Teams for filtering (staff and mentors)
  const { teams: staffTeams, isLoading: isTeamsLoading } = useTeams(
    userType === "staff" ? selectedCohortId || "all" : undefined
  );

  // Extract unique teams from tasks for mentors
  const mentorTeams = useMemo(() => {
    if (userType !== "mentor") return [];
    const teamMap = new Map<string, { id: string; teamName: string }>();
    tasks.forEach(task => {
      const team = task.team?.[0];
      if (team && !teamMap.has(team.id)) {
        teamMap.set(team.id, { id: team.id, teamName: team.teamName || "Unknown Team" });
      }
    });
    return Array.from(teamMap.values()).sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [tasks, userType]);

  // Use staff teams or mentor teams depending on user type
  const teams = userType === "staff" ? staffTeams : mentorTeams;

  // Team filter state (staff and mentors)
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  // URL-synced view state
  const {
    viewState,
    setView,
    setFilter,
    setSort,
    setGroupBy,
  } = useTaskViewState();

  const isLoading = isUserLoading || isTasksLoading || (userType === "staff" && isTeamsLoading);

  // Filter tasks by team (staff and mentors)
  const filteredTasks = useMemo(() => {
    if ((userType !== "staff" && userType !== "mentor") || selectedTeamId === "all") {
      return tasks;
    }
    return tasks.filter(task => task.team?.[0]?.id === selectedTeamId);
  }, [tasks, selectedTeamId, userType]);

  // Determine if user can create tasks
  const canCreate = userType ? hasPermission(userType, "task", "create") : false;

  // Open create task dialog
  const handleCreateTask = () => {
    openDialog();
  };

  // Handle task click - open detail sheet
  const handleTaskClick = (task: Task) => {
    openTaskSheet(task.id);
  };

  // Get description based on user type
  const getDescription = () => {
    switch (userType) {
      case "mentor":
        return "Tasks from teams you mentor";
      case "staff":
        return "All tasks across teams";
      default:
        return "Track and manage your tasks";
    }
  };

  if (!userType || !userContext?.email) {
    return <TasksPageSkeleton />;
  }

  const content = (
    <div className="space-y-6">
      {/* Team filter for staff and mentors */}
      {(userType === "staff" || userType === "mentor") && teams && teams.length > 0 && (
        <div className="mb-4">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.teamName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Task View with tour attributes */}
      <div data-tour="tasks-header">
        <div data-tour="tasks-view-controls">
          <div data-tour="tasks-stats">
            <div data-tour="tasks-create-button">
              <TaskView
                tasks={filteredTasks}
                isLoading={isLoading}
                userType={userType}
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
                variant="full"
                showHeader={true}
                showStats={true}
                showControls={true}
                showViewSwitcher={true}
                showFilter={true}
                showSort={true}
                showGroupBy={true}
                showCreateButton={canCreate}
                showAssignee={true}
                showTeam={userType === "staff" || userType === "mentor"}
                showActions={true}
                // Callbacks
                onTaskUpdate={updateTask}
                onTaskClick={handleTaskClick}
                onEditClick={handleTaskClick}
                onPostUpdateClick={handleTaskClick}
                onCreateTask={handleCreateTask}
                // Text
                title="Action Items"
                description={getDescription()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap with tour for students
  if (userType === "student") {
    return (
      <PageTourWrapper userType="student" userName={userContext?.firstName}>
        {content}
      </PageTourWrapper>
    );
  }

  return content;
}

function TasksPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>

      {/* Controls skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksPageSkeleton />}>
      <TasksPageContent />
    </Suspense>
  );
}
