"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { TaskView } from "@/components/tasks";
import { useLocalTaskViewState } from "@/hooks/use-task-view-state";
import { useTaskSheet } from "@/contexts/task-sheet-context";
import type { Task } from "@/types/schema";
import type { TeamTabBaseProps } from "./types";
import type { TeamMember } from "@/hooks/use-team-members";

interface TeamTasksTabProps extends TeamTabBaseProps {
  /** Handler for task updates (with optimistic updates) */
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  /** Handler for creating progress updates */
  onCreateUpdate?: (input: {
    taskId: string;
    authorId: string;
    health: string;
    message: string;
  }) => Promise<void>;
  /** Handler for creating a new task */
  onCreateTask?: () => void;
  /** Pre-loaded team members for the sheet */
  teamMembers?: TeamMember[];
}

export function TeamTasksTab({
  team,
  userContext,
  userType,
  onTaskUpdate,
  onCreateUpdate,
  onCreateTask,
  teamMembers,
}: TeamTasksTabProps) {
  const router = useRouter();
  const { openTaskSheet } = useTaskSheet();
  const tasks = team.actionItems || [];

  const isStaff = userType === "staff";

  // Local view state for embedded task view
  const {
    viewState,
    setView,
    setFilter,
    setSort,
    setGroupBy,
  } = useLocalTaskViewState({ view: "kanban", filter: "open" });

  // Open task sheet handler (passing custom callbacks and team context)
  const handleTaskClick = useCallback((task: Task) => {
    openTaskSheet(task.id, {
      teamId: team.id,
      teamMembers,
      onTaskUpdate,
      onCreateUpdate,
    });
  }, [openTaskSheet, team.id, teamMembers, onTaskUpdate, onCreateUpdate]);

  // Default create handler if not provided
  const handleCreateTask = useCallback(() => {
    if (onCreateTask) {
      onCreateTask();
    } else {
      router.push(`/tasks/new?team=${team.id}`);
    }
  }, [onCreateTask, router, team.id]);

  return (
    <TaskView
      tasks={tasks}
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
      variant="embedded"
      showHeader={true}
      showControls={true}
      showViewSwitcher={true}
      showFilter={true}
      showSort={true}
      showGroupBy={true}
      showCreateButton={isStaff}
      showAssignee={true}
      showProvenance={true}
      showTeam={false}
      showActions={true}
      // Callbacks
      onTaskUpdate={onTaskUpdate}
      onTaskClick={handleTaskClick}
      onEditClick={handleTaskClick}
      onPostUpdateClick={handleTaskClick}
      onCreateTask={handleCreateTask}
      // Text
      title="Action Items"
      description="Tasks for this team"
    />
  );
}
