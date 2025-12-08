import { useMemo } from "react";
import { differenceInHours, differenceInMinutes, addMinutes, isPast, formatDistanceToNow } from "date-fns";
import { parseAsLocalTime } from "@/components/sessions/session-transformers";
import { useNow } from "@/hooks/use-now";
import type { Session } from "@/types/schema";

/**
 * Session phases represent the lifecycle state of a session
 */
export type SessionPhase =
  | "upcoming"      // >24h away, status = Scheduled
  | "starting-soon" // <24h away, status = Scheduled
  | "during"        // Currently happening (based on start time + duration)
  | "completed"     // Finished (status = Completed or past end time)
  | "cancelled"     // status = Cancelled
  | "no-show";      // status = No-Show

/**
 * Phase configuration for UI display
 */
export const SESSION_PHASE_CONFIG: Record<SessionPhase, {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  "upcoming": {
    label: "Upcoming",
    shortLabel: "Upcoming",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  "starting-soon": {
    label: "Starting Soon",
    shortLabel: "Soon",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  "during": {
    label: "In Progress",
    shortLabel: "Live",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  "completed": {
    label: "Completed",
    shortLabel: "Done",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/30",
    borderColor: "border-slate-200 dark:border-slate-700",
  },
  "cancelled": {
    label: "Cancelled",
    shortLabel: "Cancelled",
    color: "text-slate-500 dark:text-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-900/50",
    borderColor: "border-slate-300 dark:border-slate-700",
  },
  "no-show": {
    label: "No-Show",
    shortLabel: "No-Show",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};

/**
 * Calculate the current phase of a session
 * @param session - The session to check
 * @param now - Optional current time (defaults to new Date())
 */
export function getSessionPhase(session: Session | null, now?: Date): SessionPhase {
  if (!session) return "upcoming";

  // Handle terminal statuses first
  if (session.status === "Cancelled") return "cancelled";
  if (session.status === "No-Show") return "no-show";
  if (session.status === "Completed") return "completed";

  // No scheduled start time - treat as upcoming
  if (!session.scheduledStart) return "upcoming";

  try {
    const currentTime = now ?? new Date();
    const startTime = parseAsLocalTime(session.scheduledStart);
    const duration = session.duration || 60; // Default 60 minutes
    const endTime = addMinutes(startTime, duration);

    // Check if we're during the meeting
    if (currentTime >= startTime && currentTime <= endTime) {
      return "during";
    }

    // Check if past end time (but not marked completed)
    if (currentTime >= endTime) {
      return "completed";
    }

    // Check how soon the meeting starts
    const hoursUntilStart = differenceInHours(startTime, currentTime);
    if (hoursUntilStart <= 24 && hoursUntilStart >= 0) {
      return "starting-soon";
    }

    return "upcoming";
  } catch {
    return "upcoming";
  }
}

/**
 * Get time-related information about a session
 * @param session - The session to check
 * @param now - Optional current time (defaults to new Date())
 */
export function getSessionTimeInfo(session: Session | null, now?: Date): {
  timeUntilStart: string | null;
  timeSinceEnd: string | null;
  minutesUntilStart: number | null;
  minutesSinceEnd: number | null;
  isStartingSoon: boolean;
  isOverdue: boolean; // Past scheduled time but not marked completed
} {
  if (!session?.scheduledStart) {
    return {
      timeUntilStart: null,
      timeSinceEnd: null,
      minutesUntilStart: null,
      minutesSinceEnd: null,
      isStartingSoon: false,
      isOverdue: false,
    };
  }

  try {
    const currentTime = now ?? new Date();
    const startTime = parseAsLocalTime(session.scheduledStart);
    const duration = session.duration || 60;
    const endTime = addMinutes(startTime, duration);

    const minutesUntilStart = differenceInMinutes(startTime, currentTime);
    const minutesSinceEnd = differenceInMinutes(currentTime, endTime);

    return {
      timeUntilStart: minutesUntilStart > 0
        ? formatDistanceToNow(startTime, { addSuffix: false })
        : null,
      timeSinceEnd: minutesSinceEnd > 0
        ? formatDistanceToNow(endTime, { addSuffix: true })
        : null,
      minutesUntilStart: minutesUntilStart > 0 ? minutesUntilStart : null,
      minutesSinceEnd: minutesSinceEnd > 0 ? minutesSinceEnd : null,
      isStartingSoon: minutesUntilStart > 0 && minutesUntilStart <= 60,
      isOverdue: minutesSinceEnd > 0 && session.status !== "Completed",
    };
  } catch {
    return {
      timeUntilStart: null,
      timeSinceEnd: null,
      minutesUntilStart: null,
      minutesSinceEnd: null,
      isStartingSoon: false,
      isOverdue: false,
    };
  }
}

export interface UseSessionPhaseReturn {
  /** Current session phase */
  phase: SessionPhase;
  /** Phase configuration for UI */
  phaseConfig: typeof SESSION_PHASE_CONFIG[SessionPhase];
  /** Human-readable label */
  phaseLabel: string;
  /** Short label for badges */
  phaseShortLabel: string;
  /** Time until session starts (if upcoming) */
  timeUntilStart: string | null;
  /** Time since session ended (if past) */
  timeSinceEnd: string | null;
  /** Minutes until start (for logic) */
  minutesUntilStart: number | null;
  /** Whether meeting is starting within 1 hour */
  isStartingSoon: boolean;
  /** Whether session is past but not marked completed */
  isOverdue: boolean;
  /** Whether user can submit pre-meeting prep */
  isEligibleForPrep: boolean;
  /** Whether session is eligible for feedback */
  isEligibleForFeedback: boolean;
}

/**
 * Hook to get session phase and related state
 * Automatically updates every 30 seconds to keep time displays accurate
 */
export function useSessionPhase(session: Session | null): UseSessionPhaseReturn {
  // Update every 30 seconds to keep time displays current
  const now = useNow(30000);

  return useMemo(() => {
    const phase = getSessionPhase(session, now);
    const phaseConfig = SESSION_PHASE_CONFIG[phase];
    const timeInfo = getSessionTimeInfo(session, now);

    // Prep is eligible for upcoming/starting-soon sessions that aren't cancelled
    const isEligibleForPrep =
      (phase === "upcoming" || phase === "starting-soon") &&
      session?.status !== "Cancelled";

    // Feedback is eligible for completed sessions or past scheduled time
    // (matches logic in session-transformers.ts isSessionEligibleForFeedback)
    const isEligibleForFeedback =
      phase === "completed" ||
      (session?.status !== "Cancelled" &&
       session?.status !== "No-Show" &&
       timeInfo.minutesSinceEnd !== null &&
       timeInfo.minutesSinceEnd > 0);

    return {
      phase,
      phaseConfig,
      phaseLabel: phaseConfig.label,
      phaseShortLabel: phaseConfig.shortLabel,
      timeUntilStart: timeInfo.timeUntilStart,
      timeSinceEnd: timeInfo.timeSinceEnd,
      minutesUntilStart: timeInfo.minutesUntilStart,
      isStartingSoon: timeInfo.isStartingSoon,
      isOverdue: timeInfo.isOverdue,
      isEligibleForPrep,
      isEligibleForFeedback,
    };
  }, [session, now]);
}

/**
 * Get the recommended default tab based on session phase and user type
 */
export function getDefaultTabForPhase(
  phase: SessionPhase,
  userType: "student" | "mentor" | "staff"
): string {
  switch (userType) {
    case "student":
      // Students should focus on prep before, feedback after
      if (phase === "upcoming" || phase === "starting-soon") return "preparation";
      if (phase === "completed") return "feedback";
      return "overview";

    case "mentor":
      // Mentors should review prep before meeting, give feedback after
      if (phase === "starting-soon") return "preparation";
      if (phase === "completed") return "feedback";
      return "overview";

    case "staff":
      // Staff always start with overview for full context
      return "overview";

    default:
      return "overview";
  }
}
