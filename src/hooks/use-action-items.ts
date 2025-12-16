"use client";

import { useMemo } from "react";
import { useSessions } from "./use-sessions";
import { useTasks } from "./use-tasks";
import { useUserType } from "./use-user-type";
import { hasUserSubmitted } from "./use-pre-meeting-submission";
import {
  hasMentorFeedback,
  hasMenteeFeedback,
  isSessionEligibleForFeedback,
  parseAsLocalTime,
} from "@/components/sessions/session-transformers";
import {
  type ActionType,
  type ActionItemVariant,
  type ActionsSummary,
  type UseActionItemsOptions,
  type UseActionItemsReturn,
  type SessionAction,
  type TaskAction,
  getActionPriority,
  sortActions,
} from "@/types/actions";
import type { Session, Task } from "@/types/schema";

/**
 * Compute all pending action items for the current user
 *
 * This hook aggregates data from sessions and tasks to build
 * a unified list of pending actions the user needs to take.
 */
export function useActionItems(
  options: UseActionItemsOptions = {}
): UseActionItemsReturn {
  const { includeTypes, maxItems, urgentOnly = false } = options;

  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { sessions, isLoading: isSessionsLoading } = useSessions(
    userContext?.email
  );
  const { tasks, isLoading: isTasksLoading } = useTasks(userContext?.email);

  const isLoading = isUserLoading || isSessionsLoading || isTasksLoading;

  const actions = useMemo(() => {
    if (isLoading || !userContext || !userType) return [];

    const allActions: ActionItemVariant[] = [];
    const now = new Date();

    // Process sessions for actions
    sessions.forEach((session) => {
      // Pre-meeting prep (students only, upcoming sessions)
      if (userType === "student") {
        const preMeetingAction = createPreMeetingAction(
          session,
          userContext.contactId,
          now
        );
        if (preMeetingAction) allActions.push(preMeetingAction);
      }

      // Post-session feedback (all users, completed sessions)
      const feedbackAction = createFeedbackAction(session, userType, now);
      if (feedbackAction) allActions.push(feedbackAction);

      // Meeting starting soon (all users)
      const meetingAction = createMeetingAction(session, now);
      if (meetingAction) allActions.push(meetingAction);
    });

    // Process tasks for actions
    tasks.forEach((task) => {
      // Overdue tasks (assigned to current user)
      const overdueAction = createOverdueTaskAction(
        task,
        userContext.contactId,
        now
      );
      if (overdueAction) allActions.push(overdueAction);

      // High-priority pending tasks (mentors/staff only)
      if (userType === "mentor" || userType === "staff") {
        const pendingAction = createPendingTaskAction(
          task,
          userContext.contactId,
          now
        );
        if (pendingAction) allActions.push(pendingAction);
      }
    });

    // Filter by types if specified
    let filtered = allActions;
    if (includeTypes && includeTypes.length > 0) {
      filtered = filtered.filter((a) => includeTypes.includes(a.type));
    }

    // Filter to urgent only if specified
    if (urgentOnly) {
      filtered = filtered.filter((a) => a.priority === "urgent");
    }

    // Sort by priority and due date
    const sorted = sortActions(filtered);

    // Limit results if specified
    if (maxItems && maxItems > 0) {
      return sorted.slice(0, maxItems);
    }

    return sorted;
  }, [
    sessions,
    tasks,
    userContext,
    userType,
    isLoading,
    includeTypes,
    maxItems,
    urgentOnly,
  ]);

  const summary = useMemo<ActionsSummary>(() => {
    const byType = {} as Record<ActionType, number>;

    // Initialize all types to 0
    const types: ActionType[] = [
      "pre-meeting-prep",
      "post-session-feedback",
      "overdue-task",
      "pending-task",
      "meeting-starting-soon",
    ];
    types.forEach((type) => {
      byType[type] = 0;
    });

    // Count actions by type
    actions.forEach((action) => {
      byType[action.type]++;
    });

    return {
      total: actions.length,
      urgent: actions.filter((a) => a.priority === "urgent").length,
      byType,
    };
  }, [actions]);

  const urgentActions = useMemo(() => {
    return actions.filter((a) => a.priority === "urgent");
  }, [actions]);

  return {
    actions,
    summary,
    urgentActions,
    isLoading,
    hasActions: actions.length > 0,
  };
}

/**
 * Lightweight hook for just the action count (for badge)
 */
export function useActionCount(): { count: number; isLoading: boolean } {
  const { summary, isLoading } = useActionItems();
  return { count: summary.total, isLoading };
}

// ============================================================================
// Action Creators
// ============================================================================

/**
 * Create pre-meeting preparation action for students
 */
function createPreMeetingAction(
  session: Session,
  contactId: string | undefined,
  now: Date
): SessionAction | null {
  if (!contactId) return null;

  // Must be an upcoming scheduled session
  if (session.status !== "Scheduled") return null;
  if (!session.scheduledStart) return null;

  const startTime = parseAsLocalTime(session.scheduledStart);
  if (startTime <= now) return null;

  // Must be within the prep window (7 days before)
  const daysUntilSession =
    (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilSession > 7) return null;

  // User must not have already submitted
  const submissions = session.preMeetingSubmissions || [];
  if (hasUserSubmitted(submissions, contactId)) return null;

  const priority = getActionPriority("pre-meeting-prep", startTime);

  return {
    id: `prep-${session.id}`,
    type: "pre-meeting-prep",
    priority,
    title: "Prepare for Session",
    description: `Submit your prep for ${session.sessionType || "session"} with your mentor`,
    createdAt: now,
    dueAt: startTime,
    href: `/sessions/${session.id}?tab=preparation`,
    actionLabel: "Prepare Now",
    entityType: "session",
    entityId: session.id,
    session,
  };
}

/**
 * Create post-session feedback action
 */
function createFeedbackAction(
  session: Session,
  userType: "student" | "mentor" | "staff",
  now: Date
): SessionAction | null {
  // Must be eligible for feedback
  if (!isSessionEligibleForFeedback(session)) return null;

  // Check if user has already provided feedback
  const hasFeedback =
    userType === "mentor" || userType === "staff"
      ? hasMentorFeedback(session)
      : hasMenteeFeedback(session);

  if (hasFeedback) return null;

  // Calculate when feedback should be due (48 hours after session)
  const sessionEnd = session.scheduledStart
    ? new Date(
        parseAsLocalTime(session.scheduledStart).getTime() +
          (session.duration || 60) * 60 * 1000
      )
    : now;

  const feedbackDue = new Date(sessionEnd.getTime() + 48 * 60 * 60 * 1000);
  const priority = getActionPriority("post-session-feedback", feedbackDue);

  return {
    id: `feedback-${session.id}`,
    type: "post-session-feedback",
    priority,
    title: "Submit Feedback",
    description: `Provide feedback for your ${session.sessionType || "session"}`,
    createdAt: sessionEnd,
    dueAt: feedbackDue,
    href: `/sessions/${session.id}?tab=feedback`,
    actionLabel: "Add Feedback",
    entityType: "session",
    entityId: session.id,
    session,
  };
}

/**
 * Create meeting starting soon action
 */
function createMeetingAction(
  session: Session,
  now: Date
): SessionAction | null {
  // Must be a scheduled session with a start time
  if (session.status !== "Scheduled") return null;
  if (!session.scheduledStart) return null;

  const startTime = parseAsLocalTime(session.scheduledStart);
  const minutesUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60);

  // Only show within 60 minutes of start
  if (minutesUntilStart > 60 || minutesUntilStart < -15) return null;

  // Must have a meeting URL
  if (!session.meetingUrl && session.meetingPlatform !== "In-Person")
    return null;

  const priority = getActionPriority("meeting-starting-soon", startTime);

  const timeDescription =
    minutesUntilStart <= 0
      ? "Meeting has started"
      : minutesUntilStart <= 5
        ? "Meeting starting now"
        : minutesUntilStart <= 15
          ? `Starts in ${Math.round(minutesUntilStart)} minutes`
          : `Starts in ${Math.round(minutesUntilStart)} minutes`;

  return {
    id: `meeting-${session.id}`,
    type: "meeting-starting-soon",
    priority,
    title: timeDescription,
    description: `${session.sessionType || "Session"} - ${session.meetingPlatform || "Virtual"}`,
    createdAt: now,
    dueAt: startTime,
    href: session.meetingUrl || `/sessions/${session.id}`,
    actionLabel: session.meetingUrl ? "Join Meeting" : "View Session",
    entityType: "session",
    entityId: session.id,
    session,
  };
}

/**
 * Create overdue task action
 */
function createOverdueTaskAction(
  task: Task,
  contactId: string | undefined,
  now: Date
): TaskAction | null {
  if (!contactId) return null;

  // Must be assigned to current user
  const isAssigned = task.assignedTo?.some((c) => c.id === contactId);
  if (!isAssigned) return null;

  // Must be not completed/cancelled
  if (task.status === "Completed" || task.status === "Cancelled") return null;

  // Must have a due date in the past
  if (!task.due) return null;
  const dueDate = new Date(task.due);
  if (dueDate > now) return null;

  const priority = getActionPriority("overdue-task", dueDate);

  return {
    id: `overdue-${task.id}`,
    type: "overdue-task",
    priority,
    title: task.name || "Overdue Task",
    description: task.description || "This task is past its due date",
    createdAt: dueDate,
    dueAt: dueDate,
    href: `/tasks?taskId=${task.id}`,
    actionLabel: "View Task",
    entityType: "task",
    entityId: task.id,
    task,
  };
}

/**
 * Create high-priority pending task action (mentors/staff)
 */
function createPendingTaskAction(
  task: Task,
  contactId: string | undefined,
  now: Date
): TaskAction | null {
  if (!contactId) return null;

  // Must be assigned to current user
  const isAssigned = task.assignedTo?.some((c) => c.id === contactId);
  if (!isAssigned) return null;

  // Must be not started
  if (task.status !== "Not Started") return null;

  // Must be high priority or urgent
  if (task.priority !== "High" && task.priority !== "Urgent") return null;

  // Must have a due date within the next week
  if (!task.due) return null;
  const dueDate = new Date(task.due);
  const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilDue > 7 || daysUntilDue < 0) return null;

  const priority = getActionPriority("pending-task", dueDate);

  return {
    id: `pending-${task.id}`,
    type: "pending-task",
    priority,
    title: task.name || "High Priority Task",
    description: `${task.priority} priority - due soon`,
    createdAt: now,
    dueAt: dueDate,
    href: `/tasks?taskId=${task.id}`,
    actionLabel: "Start Task",
    entityType: "task",
    entityId: task.id,
    task,
  };
}
