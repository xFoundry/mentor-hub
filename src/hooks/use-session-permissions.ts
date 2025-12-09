"use client";

import { useMemo, useCallback } from "react";
import type { Session, UserType } from "@/types/schema";
import { hasPermission } from "@/lib/permissions";
import { hasMentorFeedback, hasMenteeFeedback, isSessionEligibleForFeedback, isCurrentUserMentor } from "@/components/sessions/session-transformers";

/**
 * Permissions for session operations
 */
export interface SessionPermissions {
  /** Can create new sessions */
  canCreate: boolean;
  /** Can update sessions */
  canUpdate: boolean;
  /** Can cancel sessions */
  canCancel: boolean;
  /** Check if feedback can be added to a session */
  canAddFeedback: (session: Session) => boolean;
  /** Check if user can view private notes (staff only) */
  canViewPrivateNotes: boolean;
  /** Available grouping options for this user type */
  allowedGroupings: string[];
  /** Visible table columns for this user type */
  visibleColumns: string[];
  /** Show feedback tab/column for this user type */
  showFeedbackStatus: boolean;
}

/**
 * Default grouping options by role
 */
const GROUPINGS_BY_ROLE: Record<UserType, string[]> = {
  student: ["none", "status", "type", "month"],
  mentor: ["none", "status", "type", "team", "month"],
  staff: ["none", "status", "type", "team", "month"],
};

/**
 * Default visible columns by role
 * Note: "actions" is shown for mentor/staff
 */
const COLUMNS_BY_ROLE: Record<UserType, string[]> = {
  student: ["indicator", "dateTime", "type", "mentor", "status"],
  mentor: ["indicator", "dateTime", "type", "team", "status", "feedback", "actions"],
  staff: ["indicator", "dateTime", "type", "team", "mentor", "status", "feedback", "emailStatus", "actions"],
};

/**
 * Hook for session-specific permissions
 *
 * @param userType - The current user's type
 * @param userEmail - The current user's email
 * @returns Permission helper functions and flags
 */
export function useSessionPermissions(
  userType: UserType | undefined,
  userEmail: string | undefined
): SessionPermissions {
  /**
   * Check if user can create sessions
   */
  const canCreate = useMemo(() => {
    if (!userType) return false;
    return hasPermission(userType, "session", "create");
  }, [userType]);

  /**
   * Check if user can update sessions
   */
  const canUpdate = useMemo(() => {
    if (!userType) return false;
    return hasPermission(userType, "session", "update");
  }, [userType]);

  /**
   * Check if user can cancel sessions
   */
  const canCancel = useMemo(() => {
    if (!userType) return false;
    // Only staff can cancel sessions
    return userType === "staff";
  }, [userType]);

  /**
   * Check if user can view private notes (staff only)
   */
  const canViewPrivateNotes = useMemo(() => {
    if (!userType) return false;
    return userType === "staff";
  }, [userType]);

  /**
   * Check if feedback can be added to a session by this user
   * - Session must be eligible (completed or past scheduled time)
   * - Mentor/Staff: no mentor feedback record with role="Mentor" exists
   * - Student: no feedback record with role="Mentee" exists
   * - Mentor must be the session's mentor (or staff)
   */
  const canAddFeedback = useCallback((session: Session): boolean => {
    if (!userType || !userEmail) return false;

    // Session must be eligible for feedback (completed or past)
    if (!isSessionEligibleForFeedback(session)) return false;

    // Staff can add feedback to any eligible session (as mentor feedback)
    if (userType === "staff") {
      return !hasMentorFeedback(session);
    }

    // Mentors can only add feedback to their own sessions
    if (userType === "mentor") {
      const isSessionMentor = isCurrentUserMentor(session, userEmail);
      if (!isSessionMentor) return false;
      return !hasMentorFeedback(session);
    }

    // Students can add mentee feedback
    if (userType === "student") {
      // Check if user is part of the team
      const isTeamMember = session.team?.[0]?.members?.some(
        m => m.contact?.[0]?.email === userEmail
      );
      if (!isTeamMember) return false;
      return !hasMenteeFeedback(session);
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
    if (!userType) return ["dateTime", "type", "status"];
    return COLUMNS_BY_ROLE[userType] || ["dateTime", "type", "status"];
  }, [userType]);

  /**
   * Show feedback status column/indicator
   */
  const showFeedbackStatus = useMemo(() => {
    if (!userType) return false;
    return userType === "mentor" || userType === "staff";
  }, [userType]);

  return {
    canCreate,
    canUpdate,
    canCancel,
    canAddFeedback,
    canViewPrivateNotes,
    allowedGroupings,
    visibleColumns,
    showFeedbackStatus,
  };
}
