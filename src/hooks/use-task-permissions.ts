"use client";

import { useMemo, useCallback } from "react";
import type { Task, UserType } from "@/types/schema";
import { hasPermission, canUpdateField } from "@/lib/permissions";
import { isCurrentUserMentor } from "@/components/sessions/session-transformers";

/**
 * Task field names that can be updated
 */
export type TaskField = "status" | "priority" | "due" | "levelOfEffort" | "name" | "description" | "assignedTo";

/**
 * Permissions for task operations
 */
export interface TaskPermissions {
  /** Can create new tasks */
  canCreate: boolean;
  /** Can delete tasks (staff only) */
  canDelete: boolean;
  /** Can drag tasks to change status (role-dependent) */
  canDragStatus: boolean;
  /** Can drag tasks to reassign (staff only) */
  canDragReassign: boolean;
  /** Check if a specific field can be edited */
  canEditField: (field: TaskField) => boolean;
  /** Check if a specific task can be edited (ownership check for mentors) */
  canEditTask: (task: Task) => boolean;
  /** Check if a specific task can be dragged (ownership check) */
  canDragTask: (task: Task) => boolean;
  /** Available grouping options for this user type */
  allowedGroupings: string[];
  /** Visible table columns for this user type */
  visibleColumns: string[];
}

/**
 * Default grouping options by role
 */
const GROUPINGS_BY_ROLE: Record<UserType, string[]> = {
  student: ["none", "status", "priority"],
  mentor: ["none", "status", "priority", "team"],
  staff: ["none", "status", "priority", "team", "assignee"],
};

/**
 * Default visible columns by role
 */
const COLUMNS_BY_ROLE: Record<UserType, string[]> = {
  student: ["name", "status", "priority", "due", "levelOfEffort", "session"],
  mentor: ["name", "assignee", "team", "status", "priority", "due"],
  staff: ["name", "assignee", "team", "status", "priority", "due", "levelOfEffort", "created"],
};

/**
 * Fields that students can edit on their own tasks
 */
const STUDENT_EDITABLE_FIELDS: TaskField[] = ["status", "priority", "due", "levelOfEffort", "name", "description", "assignedTo"];

/**
 * Fields that mentors can edit on tasks they created
 */
const MENTOR_EDITABLE_FIELDS: TaskField[] = ["status", "priority", "due", "levelOfEffort", "name", "description"];

/**
 * All fields (for staff)
 */
const ALL_FIELDS: TaskField[] = ["status", "priority", "due", "levelOfEffort", "name", "description", "assignedTo"];

/**
 * Hook for task-specific permissions
 *
 * @param userType - The current user's type
 * @param userEmail - The current user's email
 * @returns Permission helper functions and flags
 */
export function useTaskPermissions(
  userType: UserType | undefined,
  userEmail: string | undefined
): TaskPermissions {
  /**
   * Check if user can create tasks
   */
  const canCreate = useMemo(() => {
    if (!userType) return false;
    return hasPermission(userType, "task", "create");
  }, [userType]);

  /**
   * Check if user can delete tasks (staff only)
   */
  const canDelete = useMemo(() => {
    if (!userType) return false;
    return hasPermission(userType, "task", "delete");
  }, [userType]);

  /**
   * Check if user can drag tasks to change status
   * - Students: Yes (their own tasks)
   * - Mentors: Only tasks they created
   * - Staff: Yes (all tasks)
   */
  const canDragStatus = useMemo(() => {
    if (!userType) return false;
    // All roles can potentially drag, but ownership is checked per-task
    return hasPermission(userType, "task", "update");
  }, [userType]);

  /**
   * Check if user can drag tasks to reassign (staff only)
   */
  const canDragReassign = useMemo(() => {
    if (!userType) return false;
    // Only staff can reassign tasks
    return userType === "staff";
  }, [userType]);

  /**
   * Check if a specific field can be edited based on user type
   */
  const canEditField = useCallback((field: TaskField): boolean => {
    if (!userType) return false;
    return canUpdateField(userType, "task", field);
  }, [userType]);

  /**
   * Check if a specific task can be edited by this user
   * - Students: Can edit any task on their team
   * - Mentors: Can only edit tasks from their sessions
   * - Staff: Can edit all tasks
   */
  const canEditTask = useCallback((task: Task): boolean => {
    if (!userType || !userEmail) return false;

    // Staff can edit any task
    if (userType === "staff") return true;

    // Students can edit any task on their team (they only see team tasks)
    if (userType === "student") {
      return true;
    }

    // Mentors can only edit tasks from sessions they mentored
    if (userType === "mentor") {
      return task.session?.some(session =>
        isCurrentUserMentor(session, userEmail)
      ) ?? false;
    }

    return false;
  }, [userType, userEmail]);

  /**
   * Check if a specific task can be dragged (for status change)
   * Same logic as canEditTask, but separated for clarity
   */
  const canDragTask = useCallback((task: Task): boolean => {
    if (!userType || !userEmail) return false;

    // Staff can drag any task
    if (userType === "staff") return true;

    // Students can drag any task on their team (they only see team tasks)
    if (userType === "student") {
      return true;
    }

    // Mentors can only drag tasks from their sessions
    if (userType === "mentor") {
      return task.session?.some(session =>
        isCurrentUserMentor(session, userEmail)
      ) ?? false;
    }

    return false;
  }, [userType, userEmail]);

  /**
   * Allowed grouping options for this user type
   */
  const allowedGroupings = useMemo(() => {
    if (!userType) return ["none"];
    return GROUPINGS_BY_ROLE[userType] || ["none"];
  }, [userType]);

  /**
   * Visible table columns for this user type
   */
  const visibleColumns = useMemo(() => {
    if (!userType) return ["name", "status"];
    return COLUMNS_BY_ROLE[userType] || ["name", "status"];
  }, [userType]);

  return {
    canCreate,
    canDelete,
    canDragStatus,
    canDragReassign,
    canEditField,
    canEditTask,
    canDragTask,
    allowedGroupings,
    visibleColumns,
  };
}

/**
 * Get editable fields for a user type on a specific task
 */
export function getEditableFields(
  userType: UserType | undefined,
  task: Task,
  userEmail: string | undefined
): TaskField[] {
  if (!userType || !userEmail) return [];

  // Staff can edit all fields
  if (userType === "staff") return ALL_FIELDS;

  // Students can edit limited fields on any team task (they only see their team's tasks)
  if (userType === "student") {
    return STUDENT_EDITABLE_FIELDS;
  }

  // Mentors can edit tasks from their sessions
  if (userType === "mentor") {
    const isFromSession = task.session?.some(s =>
      isCurrentUserMentor(s, userEmail)
    );
    return isFromSession ? MENTOR_EDITABLE_FIELDS : [];
  }

  return [];
}
