"use client";

import useSWR from "swr";
import { getUserTasks, getAllTasks, getStudentTeamTasks, updateTask as updateTaskApi, createUpdate as createUpdateApi } from "@/lib/baseql";
import type { Task } from "@/types/schema";
import { toast } from "sonner";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { useCallback, useMemo } from "react";

/**
 * Hook to fetch tasks for a user
 * Uses effective user context to support impersonation
 * @param email - User email
 * @param cohortId - Optional cohort ID to filter tasks (use "all" to show all cohorts)
 */
export function useTasks(email?: string, cohortId?: string) {
  const { userType } = useEffectiveUser();

  // Create a stable cache key
  const cacheKey = useMemo(
    () => (email ? [`/tasks`, email, cohortId ?? "all", userType ?? "unknown"] : null),
    [email, cohortId, userType]
  );

  const { data, error, isLoading, mutate: boundMutate } = useSWR<Task[]>(
    cacheKey,
    async () => {
      if (!email) return [];

      // Fetch tasks based on user type
      let result;
      if (userType === "staff") {
        // Staff sees all tasks
        result = await getAllTasks();
      } else if (userType === "student") {
        // Students see all tasks from their team
        result = await getStudentTeamTasks(email);
      } else {
        // Mentors see tasks assigned to them or from their sessions
        result = await getUserTasks(email);
      }

      let tasks = result.tasks || [];

      // Filter by cohort if specified (and not "all")
      if (cohortId && cohortId !== "all") {
        tasks = tasks.filter((task: Task) => {
          // Check if task's team cohorts include the selected cohort
          const teamCohorts = task.team?.[0]?.cohorts || [];
          return teamCohorts.some((cohort: { id: string }) => cohort.id === cohortId);
        });
      }

      return tasks;
    }
  );

  /**
   * Update a task with optimistic updates
   * Uses SWR's bound mutate for correct cache key handling
   */
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!email) return;

    const currentData = data || [];

    // Create optimistic data
    const optimisticData = currentData.map((task) =>
      task.id === taskId ? { ...task, ...updates } : task
    );

    try {
      // Optimistic update with bound mutate (uses correct cache key automatically)
      await boundMutate(
        async (currentTasks) => {
          // Make API call
          await updateTaskApi(taskId, updates);

          // Return updated data
          return (currentTasks || []).map((task: Task) =>
            task.id === taskId ? { ...task, ...updates } : task
          );
        },
        {
          optimisticData,
          rollbackOnError: true,
          revalidate: false, // Don't revalidate immediately, use the returned data
          populateCache: true,
        }
      );

      toast.success("Task updated");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
      throw error;
    }
  }, [email, data, boundMutate]);

  /**
   * Create a progress update on a task
   */
  const createUpdate = useCallback(async (input: {
    taskId: string;
    authorId: string;
    health: string;
    message: string;
  }) => {
    if (!email) return;

    try {
      await createUpdateApi(input);

      // Revalidate to get the latest data with the new update
      await boundMutate();

      toast.success("Update added successfully");
    } catch (error) {
      console.error("Error creating update:", error);
      toast.error("Failed to add update");
      throw error;
    }
  }, [email, boundMutate]);

  /**
   * Force revalidation of tasks
   */
  const revalidate = useCallback(() => {
    return boundMutate();
  }, [boundMutate]);

  return {
    tasks: data || [],
    isLoading,
    error,
    updateTask,
    createUpdate,
    revalidate,
    mutate: boundMutate,
  };
}

/**
 * Create a tasks cache key for external mutation
 */
export function getTasksCacheKey(email: string, cohortId?: string, userType?: string) {
  return [`/tasks`, email, cohortId ?? "all", userType ?? "unknown"];
}
