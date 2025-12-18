import { isPast, isFuture } from "date-fns";
import type { Session, Contact, EnrichedMentorParticipant } from "@/types/schema";
import type { UserType } from "@/types/schema";
import { formatAsEastern, TIMEZONE_ABBR } from "@/lib/timezone";

// ====================
// Type Definitions
// ====================

export type SessionViewMode = "table" | "cards";
export type SessionFilter = "all" | "upcoming" | "past" | "needsFeedback" | "cancelled";
export type SessionSort = "date" | "type" | "status" | "team" | "mentor";
export type SessionSortDirection = "asc" | "desc";
export type SessionGroupBy = "none" | "status" | "type" | "team" | "month";

export interface SessionViewState {
  view: SessionViewMode;
  filter: SessionFilter;
  sort: SessionSort;
  sortDirection: SessionSortDirection;
  groupBy: SessionGroupBy;
  search: string;
}

export interface SessionStats {
  total: number;
  upcoming: number;
  past: number;
  completed: number;
  cancelled: number;
  needsFeedback: number;
}

// ====================
// Status Configuration
// ====================

export const SESSION_STATUS_CONFIG = {
  "Scheduled": { order: 0, color: "#3b82f6", label: "Scheduled" },
  "In Progress": { order: 1, color: "#f59e0b", label: "In Progress" },
  "Completed": { order: 2, color: "#22c55e", label: "Completed" },
  "Cancelled": { order: 3, color: "#6b7280", label: "Cancelled" },
  "No-Show": { order: 4, color: "#ef4444", label: "No-Show" },
} as const;

export type SessionStatus = keyof typeof SESSION_STATUS_CONFIG;

// ====================
// Session Type Configuration
// ====================

export const SESSION_TYPE_CONFIG = {
  "Office Hours": { order: 0, color: "#8b5cf6", icon: "Clock" },
  "Team Check-in": { order: 1, color: "#06b6d4", icon: "Users" },
  "1-on-1": { order: 2, color: "#10b981", icon: "User" },
  "Guest Lecture": { order: 3, color: "#f59e0b", icon: "Presentation" },
  "Judging": { order: 4, color: "#ec4899", icon: "Award" },
  "Workshop": { order: 5, color: "#6366f1", icon: "Wrench" },
} as const;

export type SessionType = keyof typeof SESSION_TYPE_CONFIG;

// ====================
// Utility Functions
// ====================

/**
 * Parse a datetime string from Airtable.
 * Airtable stores times as proper UTC (with Z suffix).
 * Example: 12pm Eastern is stored as "17:00:00.000Z" (5pm UTC).
 *
 * This function parses the UTC time correctly and returns a Date object.
 * When formatted for display in the browser, it will show in the user's local timezone.
 *
 * @deprecated Use parseUTC from @/lib/timezone for new code
 */
export function parseAsLocalTime(dateStr: string): Date {
  // Parse as proper UTC - do NOT strip the Z suffix
  return new Date(dateStr);
}

/**
 * Check if a session is upcoming (scheduled in the future)
 */
export function isSessionUpcoming(session: Session): boolean {
  if (!session.scheduledStart || session.status === "Cancelled") {
    return false;
  }
  try {
    return isFuture(parseAsLocalTime(session.scheduledStart));
  } catch {
    return false;
  }
}

/**
 * Check if a session is in the past
 */
export function isSessionPast(session: Session): boolean {
  if (!session.scheduledStart) {
    return false;
  }
  try {
    return isPast(parseAsLocalTime(session.scheduledStart));
  } catch {
    return false;
  }
}

/**
 * Check if a user is the mentor for a session
 * Checks sessionParticipants first, falls back to mentor[]
 * @param session - The session to check
 * @param userEmail - The current user's email
 * @returns true if the user is a mentor for this session
 */
export function isCurrentUserMentor(session: Session, userEmail?: string): boolean {
  if (!userEmail) return false;

  // Check sessionParticipants first
  const participants = session.sessionParticipants || [];
  if (participants.length > 0) {
    return participants.some(
      (p) => (p.status === "Active" || !p.status) && p.contact?.[0]?.email === userEmail
    );
  }

  // Fall back to legacy mentor field
  return session.mentor?.some((m) => m.email === userEmail) ?? false;
}

/**
 * Get all mentor participants from a session with enriched data
 * Uses sessionParticipants, falls back to mentor[]
 */
export function getMentorParticipants(session: Session): EnrichedMentorParticipant[] {
  const participants = session.sessionParticipants || [];

  // Statuses that exclude a participant from showing
  const excludedStatuses = ["Cancelled", "Declined", "No-Show"];

  // Filter out cancelled/declined mentors and enrich
  const mentorParticipants = participants
    .filter((p) => !p.status || !excludedStatuses.includes(p.status))
    .map((p) => ({
      ...p,
      contact: p.contact?.[0] || ({} as Contact),
      isLead: p.role === "Lead Mentor",
    }));

  // If we have participants, return them sorted (lead first)
  if (mentorParticipants.length > 0) {
    return mentorParticipants.sort((a, b) => {
      if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
      return (a.contact?.fullName || "").localeCompare(b.contact?.fullName || "");
    });
  }

  // Fall back to legacy mentor field
  if (session.mentor?.length) {
    return session.mentor.map((mentor, i) => ({
      id: `legacy-${mentor.id}`,
      role: i === 0 ? "Lead Mentor" : "Supporting Mentor",
      contact: mentor,
      isLead: i === 0,
    } as EnrichedMentorParticipant));
  }

  return [];
}

/**
 * Get lead mentor contact from a session
 * Uses sessionParticipants, falls back to mentor[0]
 */
export function getLeadMentor(session: Session): Contact | null {
  const mentors = getMentorParticipants(session);
  const lead = mentors.find((m) => m.isLead);
  return lead?.contact || mentors[0]?.contact || null;
}

/**
 * Check if meeting preparation is required for a session
 * In Airtable: checked = true, unchecked = null
 * Returns true only when explicitly checked (true)
 */
export function isSessionPrepRequired(session: Session): boolean {
  return session.requirePrep === true;
}

/**
 * Check if feedback is required for a session
 * In Airtable: checked = true, unchecked = null
 * Returns true only when explicitly checked (true)
 */
export function isSessionFeedbackRequired(session: Session): boolean {
  return session.requireFeedback === true;
}

/**
 * Check if mentor has submitted feedback for a session
 * Uses the role field on feedback records instead of boolean flag
 */
export function hasMentorFeedback(session: Session): boolean {
  return session.feedback?.some(f => f.role === "Mentor") ?? false;
}

/**
 * Check if mentee has submitted feedback for a session
 * Uses the role field on feedback records instead of boolean flag
 */
export function hasMenteeFeedback(session: Session): boolean {
  return session.feedback?.some(f => f.role === "Mentee") ?? false;
}

/**
 * Check if a session is eligible for feedback (completed or past scheduled time)
 * - If requireFeedback is false, it's NOT eligible for required feedback
 * - If status is "Completed", it's eligible
 * - If status is "Cancelled" or "No-Show", it's NOT eligible
 * - If the scheduled time is in the past, it's eligible (regardless of status)
 */
export function isSessionEligibleForFeedback(session: Session): boolean {
  // If feedback is not required, return false
  // Note: This checks for REQUIRED feedback - optional feedback is still allowed
  if (!isSessionFeedbackRequired(session)) {
    return false;
  }

  // Explicitly completed sessions are eligible
  if (session.status === "Completed") {
    return true;
  }

  // Cancelled or No-Show sessions are not eligible
  if (session.status === "Cancelled" || session.status === "No-Show") {
    return false;
  }

  // If scheduled time is in the past, session is eligible for feedback
  if (session.scheduledStart) {
    try {
      return isPast(parseAsLocalTime(session.scheduledStart));
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Check if a session needs feedback from the current user
 */
export function sessionNeedsFeedback(session: Session, userType: UserType): boolean {
  if (!isSessionEligibleForFeedback(session)) {
    return false;
  }

  if (userType === "mentor" || userType === "staff") {
    return !hasMentorFeedback(session);
  }

  if (userType === "student") {
    return !hasMenteeFeedback(session);
  }

  return false;
}

/**
 * Check if a session is starting soon (within specified minutes)
 */
export function isSessionStartingSoon(session: Session, withinMinutes: number = 30): boolean {
  if (!session.scheduledStart || session.status === "Cancelled") {
    return false;
  }
  try {
    const startTime = parseAsLocalTime(session.scheduledStart);
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes > 0 && diffMinutes <= withinMinutes;
  } catch {
    return false;
  }
}

/**
 * Format session date for display in Eastern timezone
 */
export function formatSessionDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return formatAsEastern(dateStr, "EEE, MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

/**
 * Format session time for display in Eastern timezone with "ET" suffix
 */
export function formatSessionTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return `${formatAsEastern(dateStr, "h:mm a")} ${TIMEZONE_ABBR}`;
  } catch {
    return "";
  }
}

/**
 * Get month/year string from date for grouping (Eastern timezone)
 */
export function getSessionMonth(dateStr?: string): string {
  if (!dateStr) return "No Date";
  try {
    return formatAsEastern(dateStr, "MMMM yyyy");
  } catch {
    return "No Date";
  }
}

// ====================
// Filter Functions
// ====================

/**
 * Filter sessions based on filter type
 */
export function filterSessions(
  sessions: Session[],
  filter: SessionFilter,
  userType?: UserType,
  userEmail?: string
): Session[] {
  switch (filter) {
    case "upcoming":
      return sessions.filter(session =>
        session.scheduledStart &&
        isFuture(parseAsLocalTime(session.scheduledStart)) &&
        session.status !== "Cancelled"
      );
    case "past":
      return sessions.filter(session =>
        session.scheduledStart &&
        isPast(parseAsLocalTime(session.scheduledStart)) &&
        session.status !== "Cancelled"
      );
    case "needsFeedback":
      return sessions.filter(session => {
        if (!isSessionEligibleForFeedback(session)) return false;
        if (userType === "mentor") {
          // Mentors only see feedback needed for their own sessions
          if (!isCurrentUserMentor(session, userEmail)) return false;
          return !hasMentorFeedback(session);
        }
        if (userType === "staff") {
          // Staff see all sessions needing mentor feedback
          return !hasMentorFeedback(session);
        }
        // Students see feedback needed for sessions they're part of
        return !hasMenteeFeedback(session);
      });
    case "cancelled":
      return sessions.filter(session => session.status === "Cancelled");
    case "all":
    default:
      return sessions;
  }
}

// ====================
// Search Function
// ====================

/**
 * Search sessions by query string
 * Searches in: team name, mentor name, session type, agenda
 */
export function searchSessions(sessions: Session[], query: string): Session[] {
  if (!query || query.trim().length < 2) {
    return sessions;
  }

  const searchTerms = query.toLowerCase().trim().split(/\s+/);

  return sessions.filter(session => {
    // Include all mentor names in searchable text
    const mentorNames = getMentorParticipants(session).map(p => p.contact?.fullName);

    const searchableText = [
      session.team?.[0]?.teamName,
      ...mentorNames,
      session.sessionType,
      session.agenda,
      session.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchTerms.every(term => searchableText.includes(term));
  });
}

// ====================
// Sort Functions
// ====================

/**
 * Sort sessions based on sort field and direction
 */
export function sortSessions(
  sessions: Session[],
  sort: SessionSort,
  direction: SessionSortDirection
): Session[] {
  const sorted = [...sessions].sort((a, b) => {
    let comparison = 0;

    switch (sort) {
      case "date": {
        if (!a.scheduledStart && !b.scheduledStart) comparison = 0;
        else if (!a.scheduledStart) comparison = 1;
        else if (!b.scheduledStart) comparison = -1;
        else {
          comparison = parseAsLocalTime(a.scheduledStart).getTime() - parseAsLocalTime(b.scheduledStart).getTime();
        }
        break;
      }
      case "type": {
        const aOrder = SESSION_TYPE_CONFIG[a.sessionType as SessionType]?.order ?? 99;
        const bOrder = SESSION_TYPE_CONFIG[b.sessionType as SessionType]?.order ?? 99;
        comparison = aOrder - bOrder;
        break;
      }
      case "status": {
        const aOrder = SESSION_STATUS_CONFIG[a.status as SessionStatus]?.order ?? 99;
        const bOrder = SESSION_STATUS_CONFIG[b.status as SessionStatus]?.order ?? 99;
        comparison = aOrder - bOrder;
        break;
      }
      case "team": {
        const aTeam = a.team?.[0]?.teamName || "";
        const bTeam = b.team?.[0]?.teamName || "";
        comparison = aTeam.localeCompare(bTeam);
        break;
      }
      case "mentor": {
        const aMentor = getLeadMentor(a)?.fullName || "";
        const bMentor = getLeadMentor(b)?.fullName || "";
        comparison = aMentor.localeCompare(bMentor);
        break;
      }
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

// ====================
// Group Functions
// ====================

/**
 * Group sessions by a field
 */
export function groupSessions(
  sessions: Session[],
  groupBy: SessionGroupBy
): Map<string, Session[]> {
  const groups = new Map<string, Session[]>();

  if (groupBy === "none") {
    groups.set("all", sessions);
    return groups;
  }

  for (const session of sessions) {
    let key: string;

    switch (groupBy) {
      case "status":
        key = session.status || "Scheduled";
        break;
      case "type":
        key = session.sessionType || "Other";
        break;
      case "team":
        key = session.team?.[0]?.teamName || "No Team";
        break;
      case "month":
        key = getSessionMonth(session.scheduledStart);
        break;
      default:
        key = "all";
    }

    const existing = groups.get(key) || [];
    existing.push(session);
    groups.set(key, existing);
  }

  return groups;
}

/**
 * Get group color based on group type and name
 */
export function getGroupColor(groupBy: SessionGroupBy, groupName: string): string {
  if (groupBy === "status") {
    return SESSION_STATUS_CONFIG[groupName as SessionStatus]?.color ?? "#6b7280";
  }

  if (groupBy === "type") {
    return SESSION_TYPE_CONFIG[groupName as SessionType]?.color ?? "#6b7280";
  }

  // Default color for team/month groups
  return "#6b7280";
}

// ====================
// Stats Functions
// ====================

/**
 * Get session statistics
 */
export function getSessionStats(sessions: Session[], userType?: UserType, userEmail?: string): SessionStats {
  const upcoming = sessions.filter(s =>
    s.scheduledStart &&
    isFuture(parseAsLocalTime(s.scheduledStart)) &&
    s.status !== "Cancelled"
  ).length;

  const past = sessions.filter(s =>
    s.scheduledStart &&
    isPast(parseAsLocalTime(s.scheduledStart)) &&
    s.status !== "Cancelled"
  ).length;

  const completed = sessions.filter(s => s.status === "Completed").length;
  const cancelled = sessions.filter(s => s.status === "Cancelled").length;

  const needsFeedback = sessions.filter(s => {
    if (!isSessionEligibleForFeedback(s)) return false;
    if (userType === "mentor") {
      // Mentors only see feedback needed for their own sessions
      if (!isCurrentUserMentor(s, userEmail)) return false;
      return !hasMentorFeedback(s);
    }
    if (userType === "staff") {
      // Staff see all sessions needing mentor feedback
      return !hasMentorFeedback(s);
    }
    // Students see feedback needed for sessions they're part of
    return !hasMenteeFeedback(s);
  }).length;

  return {
    total: sessions.length,
    upcoming,
    past,
    completed,
    cancelled,
    needsFeedback,
  };
}

// ====================
// Process Pipeline
// ====================

/**
 * Process sessions with search, filter, sort, and group
 */
export function processSessions(
  sessions: Session[],
  search: string,
  filter: SessionFilter,
  sort: SessionSort,
  sortDirection: SessionSortDirection,
  groupBy: SessionGroupBy,
  userType?: UserType,
  userEmail?: string
): {
  searched: Session[];
  filtered: Session[];
  sorted: Session[];
  grouped: Map<string, Session[]>;
} {
  const searched = searchSessions(sessions, search);
  const filtered = filterSessions(searched, filter, userType, userEmail);
  const sorted = sortSessions(filtered, sort, sortDirection);
  const grouped = groupSessions(sorted, groupBy);

  return { searched, filtered, sorted, grouped };
}
