"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { TaskView } from "@/components/tasks";
import { useLocalTaskViewState } from "@/hooks/use-task-view-state";
import type { Task } from "@/types/schema";
import type { TeamTabBaseProps } from "./types";

interface TeamTasksTabProps extends TeamTabBaseProps {
  /** Handler for task updates (with optimistic updates) */
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  /** Handler for creating a new task */
  onCreateTask?: () => void;
}

export function TeamTasksTab({
  team,
  userContext,
  userType,
  onTaskUpdate,
  onCreateTask,
}: TeamTasksTabProps) {
  const router = useRouter();
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

  // Navigation handler
  const handleTaskClick = useCallback((task: Task) => {
    router.push(`/tasks/${task.id}`);
  }, [router]);

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
