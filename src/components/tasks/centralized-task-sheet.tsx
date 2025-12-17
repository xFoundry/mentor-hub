"use client";

import { useMemo } from "react";
import { TaskDetailSheet } from "./task-detail-sheet";
import { useTaskSheet } from "@/contexts/task-sheet-context";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { useTasks } from "@/hooks/use-tasks";
import { useCohortContext } from "@/contexts/cohort-context";

/**
 * Centralized TaskSheet component
 *
 * This component is rendered once at the layout level and subscribes to
 * TaskSheetContext for open/close state. It provides default callbacks
 * from useTasks() which can be overridden via options.
 */
export function CentralizedTaskSheet() {
  const { isOpen, taskId, options, closeTaskSheet } = useTaskSheet();
  const { userType, userContext } = useEffectiveUser();
  const { selectedCohortId } = useCohortContext();

  // Get tasks and default callbacks from useTasks
  const { tasks, updateTask, createUpdate } = useTasks(
    userContext?.email,
    selectedCohortId
  );

  // Look up task from array for fresh data (matches existing pattern)
  const task = useMemo(() => {
    if (!taskId) return null;
    return tasks.find((t) => t.id === taskId) || null;
  }, [taskId, tasks]);

  // Early return if no user context
  if (!userType || !userContext) {
    return null;
  }

  return (
    <TaskDetailSheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeTaskSheet();
      }}
      task={task}
      userType={userType}
      userEmail={userContext.email}
      userContactId={userContext.contactId}
      // Use override callbacks if provided, otherwise use defaults from useTasks
      onTaskUpdate={options.onTaskUpdate || updateTask}
      onCreateUpdate={options.onCreateUpdate || createUpdate}
      onTaskDelete={options.onTaskDelete}
      // Optional props from options
      teamId={options.teamId}
      teamMembers={options.teamMembers}
    />
  );
}
