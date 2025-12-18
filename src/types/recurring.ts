/**
 * Types for Recurring Sessions
 *
 * Defines the data structures for creating and managing recurring meetings.
 */

/**
 * Mentor assignment for a session
 */
export interface MentorAssignment {
  contactId: string;
  role: "Lead Mentor" | "Supporting Mentor" | "Observer";
}

/**
 * Configuration for session recurrence pattern
 */
export interface RecurrenceConfig {
  /** Recurrence frequency */
  frequency: "weekly" | "biweekly" | "monthly";
  /** Interval between occurrences (e.g., 1 = every week, 2 = every 2 weeks) */
  interval?: number;
  /** End date for the series (YYYY-MM-DD format) */
  endDate?: string;
  /** Number of occurrences (alternative to endDate) */
  occurrences?: number;
  /** Days of week for recurrence (0=Sun, 1=Mon, etc.) - used for weekly patterns */
  daysOfWeek?: number[];
}

/**
 * Template configuration stored on the parent session
 * Used to recreate sessions with the same settings
 */
export interface SeriesConfig {
  sessionType: string;
  teamId: string;
  mentors: MentorAssignment[];
  duration: number;
  meetingPlatform?: string;
  meetingUrl?: string;
  locationId?: string;
  agenda?: string;
  cohortId?: string;
  /** Whether meeting preparation is required (defaults to true) */
  requirePrep?: boolean;
  /** Whether post-session feedback is required (defaults to true) */
  requireFeedback?: boolean;
}

/**
 * Input for creating a recurring session series
 */
export interface RecurringSessionInput {
  /** Configuration for each session in the series */
  sessionConfig: SeriesConfig;
  /** Recurrence pattern configuration */
  recurrence: RecurrenceConfig;
  /** Start date/time for the first occurrence (ISO string in UTC) */
  scheduledStart: string;
}

/**
 * Scope options for editing/deleting sessions in a series
 */
export type SeriesScope = "single" | "future" | "all";

/**
 * Response from creating a recurring session series
 */
export interface RecurringSessionResult {
  /** All sessions created in the series */
  sessions: { id: string; scheduledStart: string }[];
  /** The series ID linking all sessions */
  seriesId: string;
  /** Total number of sessions created */
  count: number;
  /** Number of emails scheduled across all sessions */
  scheduledEmails: number;
}

/**
 * Constants for recurrence limits
 */
export const RECURRENCE_LIMITS = {
  /** Maximum number of occurrences allowed */
  MAX_OCCURRENCES: 52,
  /** Maximum days into the future for end date */
  MAX_DAYS_AHEAD: 365,
} as const;
