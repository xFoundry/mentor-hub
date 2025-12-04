/**
 * Action Types for Global Todo/Notification System
 *
 * These types define the structure for pending user actions
 * across the application - sessions to prepare for, feedback to give,
 * tasks to complete, and meetings to join.
 */

import type { Session, Task } from "./schema";

/**
 * Types of actions users may need to take
 */
export type ActionType =
  | "pre-meeting-prep" // Students: submit prep before upcoming sessions
  | "post-session-feedback" // All: provide feedback after completed sessions
  | "overdue-task" // All: tasks past their due date
  | "pending-task" // Mentor/Staff: high-priority tasks not yet started
  | "meeting-starting-soon"; // All: join meeting reminder (within 1 hour)

/**
 * Priority levels for actions (determines sort order and visual emphasis)
 */
export type ActionPriority = "urgent" | "high" | "medium" | "low";

/**
 * Base action item interface
 */
export interface ActionItem {
  /** Unique identifier for this action */
  id: string;
  /** Type of action */
  type: ActionType;
  /** Priority level */
  priority: ActionPriority;
  /** Short title for the action */
  title: string;
  /** Longer description */
  description: string;
  /** When this action was created/detected */
  createdAt: Date;
  /** When this action becomes urgent (e.g., meeting start time) */
  dueAt?: Date;
  /** URL to navigate to when action is clicked */
  href: string;
  /** Primary CTA button text */
  actionLabel: string;
  /** Related entity type */
  entityType: "session" | "task";
  /** Related entity ID */
  entityId: string;
}

/**
 * Session-related action (prep, feedback, meeting)
 */
export interface SessionAction extends ActionItem {
  entityType: "session";
  session: Session;
}

/**
 * Task-related action (overdue, pending)
 */
export interface TaskAction extends ActionItem {
  entityType: "task";
  task: Task;
}

/**
 * Union type for all action variants
 */
export type ActionItemVariant = SessionAction | TaskAction;

/**
 * Summary statistics for actions
 */
export interface ActionsSummary {
  /** Total number of actions */
  total: number;
  /** Number of urgent actions */
  urgent: number;
  /** Breakdown by type */
  byType: Record<ActionType, number>;
}

/**
 * Options for the useActionItems hook
 */
export interface UseActionItemsOptions {
  /** Filter to specific action types */
  includeTypes?: ActionType[];
  /** Maximum number of items to return */
  maxItems?: number;
  /** Include only urgent actions */
  urgentOnly?: boolean;
}

/**
 * Return type for the useActionItems hook
 */
export interface UseActionItemsReturn {
  /** All action items (filtered and sorted) */
  actions: ActionItemVariant[];
  /** Summary statistics */
  summary: ActionsSummary;
  /** Urgent actions subset */
  urgentActions: ActionItemVariant[];
  /** Loading state */
  isLoading: boolean;
  /** Whether there are any actions */
  hasActions: boolean;
}

/**
 * Configuration for action type display
 */
export const ACTION_TYPE_CONFIG: Record<
  ActionType,
  {
    label: string;
    shortLabel: string;
    icon: string; // Lucide icon name
    color: string; // Tailwind color class
    defaultPriority: ActionPriority;
  }
> = {
  "pre-meeting-prep": {
    label: "Pre-Meeting Preparation",
    shortLabel: "Prep",
    icon: "ClipboardList",
    color: "blue",
    defaultPriority: "medium",
  },
  "post-session-feedback": {
    label: "Session Feedback",
    shortLabel: "Feedback",
    icon: "MessageSquare",
    color: "amber",
    defaultPriority: "medium",
  },
  "overdue-task": {
    label: "Overdue Task",
    shortLabel: "Overdue",
    icon: "AlertCircle",
    color: "red",
    defaultPriority: "urgent",
  },
  "pending-task": {
    label: "High Priority Task",
    shortLabel: "Task",
    icon: "CheckSquare",
    color: "orange",
    defaultPriority: "high",
  },
  "meeting-starting-soon": {
    label: "Meeting Starting Soon",
    shortLabel: "Meeting",
    icon: "Video",
    color: "green",
    defaultPriority: "urgent",
  },
};

/**
 * Get action priority based on timing
 */
export function getActionPriority(
  type: ActionType,
  dueAt?: Date | null
): ActionPriority {
  const config = ACTION_TYPE_CONFIG[type];
  if (!dueAt) return config.defaultPriority;

  const now = new Date();
  const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Meetings within 15 minutes are urgent
  if (type === "meeting-starting-soon" && hoursUntilDue <= 0.25) {
    return "urgent";
  }

  // Overdue items are always urgent
  if (hoursUntilDue < 0) {
    return "urgent";
  }

  // Items due within 1 hour are high priority
  if (hoursUntilDue <= 1) {
    return "high";
  }

  // Items due within 24 hours are medium priority
  if (hoursUntilDue <= 24) {
    return "medium";
  }

  return config.defaultPriority;
}

/**
 * Sort actions by priority and due date
 */
export function sortActions(actions: ActionItemVariant[]): ActionItemVariant[] {
  const priorityOrder: Record<ActionPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...actions].sort((a, b) => {
    // First by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date (soonest first)
    if (a.dueAt && b.dueAt) {
      return a.dueAt.getTime() - b.dueAt.getTime();
    }
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;

    // Finally by creation date (newest first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * Group actions by type
 */
export function groupActionsByType(
  actions: ActionItemVariant[]
): Record<ActionType, ActionItemVariant[]> {
  return actions.reduce(
    (acc, action) => {
      if (!acc[action.type]) {
        acc[action.type] = [];
      }
      acc[action.type].push(action);
      return acc;
    },
    {} as Record<ActionType, ActionItemVariant[]>
  );
}
