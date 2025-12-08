"use client";

import { useMemo } from "react";
import { useSessions } from "@/hooks/use-sessions";
import { useCohortContext } from "@/contexts/cohort-context";
import { useNow } from "@/hooks/use-now";
import { getSessionPhase, getSessionTimeInfo, SESSION_PHASE_CONFIG, type SessionPhase } from "@/hooks/use-session-phase";
import type { Session } from "@/types/schema";

export interface SidebarSessionInfo {
  /** The session to display (current live session takes priority over next upcoming) */
  displaySession: Session | null;
  /** Current live session if one exists */
  currentSession: Session | null;
  /** Next upcoming session */
  upcomingSession: Session | null;
  /** Phase of the display session */
  phase: SessionPhase;
  /** Phase config for styling */
  phaseConfig: typeof SESSION_PHASE_CONFIG[SessionPhase];
  /** Whether the display session is currently live */
  isLive: boolean;
  /** Whether the display session is starting within 1 hour */
  isStartingSoon: boolean;
  /** Time until session starts (human-readable) */
  timeUntilStart: string | null;
  /** Minutes until start (for logic) */
  minutesUntilStart: number | null;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook to get the current/next session for sidebar display
 * Returns the live session if one exists, otherwise the next upcoming session
 * Automatically updates every 30 seconds to keep time displays accurate
 */
export function useSidebarSession(userEmail: string): SidebarSessionInfo {
  const { selectedCohortId } = useCohortContext();
  const { sessions, isLoading } = useSessions(userEmail, selectedCohortId);
  // Update every 30 seconds to keep time displays current
  const now = useNow(30000);

  return useMemo(() => {
    if (isLoading || !sessions.length) {
      return {
        displaySession: null,
        currentSession: null,
        upcomingSession: null,
        phase: "upcoming",
        phaseConfig: SESSION_PHASE_CONFIG["upcoming"],
        isLive: false,
        isStartingSoon: false,
        timeUntilStart: null,
        minutesUntilStart: null,
        isLoading,
      };
    }

    // Find current (live) session - phase is "during"
    const currentSession = sessions.find((s) => {
      const phase = getSessionPhase(s, now);
      return phase === "during";
    }) || null;

    // Find next upcoming session (starting-soon or upcoming, sorted by start time)
    const upcomingSessions = sessions
      .filter((s) => {
        const phase = getSessionPhase(s, now);
        return phase === "upcoming" || phase === "starting-soon";
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduledStart!).getTime();
        const dateB = new Date(b.scheduledStart!).getTime();
        return dateA - dateB;
      });

    const upcomingSession = upcomingSessions[0] || null;

    // Display session: prefer current, fall back to upcoming
    const displaySession = currentSession || upcomingSession;
    const phase = displaySession ? getSessionPhase(displaySession, now) : "upcoming";
    const phaseConfig = SESSION_PHASE_CONFIG[phase];
    const timeInfo = displaySession ? getSessionTimeInfo(displaySession, now) : null;

    return {
      displaySession,
      currentSession,
      upcomingSession,
      phase,
      phaseConfig,
      isLive: phase === "during",
      isStartingSoon: timeInfo?.isStartingSoon || false,
      timeUntilStart: timeInfo?.timeUntilStart || null,
      minutesUntilStart: timeInfo?.minutesUntilStart || null,
      isLoading,
    };
  }, [sessions, isLoading, now]);
}
