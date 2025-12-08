/**
 * Timezone Utilities
 *
 * Centralized timezone handling for the application.
 *
 * BACKGROUND:
 * Times in Airtable are stored as proper UTC (with Z suffix).
 * Example: A session at 12pm Eastern is stored as "17:00:00.000Z" (5pm UTC).
 *
 * The app displays all times in Eastern timezone (America/New_York) since
 * all users are in that timezone.
 *
 * IMPORTANT: Do NOT strip the Z suffix - parse times as proper UTC,
 * then convert to Eastern for display.
 */

import { format as formatTz } from "date-fns-tz";

// The timezone used for displaying all times in the application
export const APP_TIMEZONE = "America/New_York";

// Timezone abbreviation for display (always "ET" regardless of DST)
export const TIMEZONE_ABBR = "ET";

/**
 * Parse a UTC date string and return a Date object
 *
 * This handles the ISO string from Airtable correctly.
 * The returned Date is in UTC (as all JS Dates are internally).
 *
 * @param dateStr - ISO date string from Airtable (with Z suffix)
 * @returns Date object representing that moment in time
 */
export function parseUTC(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Format a Date for display in Eastern time
 *
 * @param date - Date object (UTC internally)
 * @param formatStr - date-fns format string
 * @returns Formatted string in Eastern time
 */
export function formatInEastern(date: Date, formatStr: string): string {
  return formatTz(date, formatStr, { timeZone: APP_TIMEZONE });
}

/**
 * Format a UTC date string for display in Eastern time
 *
 * Convenience function that combines parsing and formatting.
 *
 * @param dateStr - ISO date string from Airtable
 * @param formatStr - date-fns format string
 * @returns Formatted string in Eastern time
 */
export function formatAsEastern(dateStr: string, formatStr: string): string {
  try {
    const date = parseUTC(dateStr);
    return formatInEastern(date, formatStr);
  } catch {
    return dateStr;
  }
}

/**
 * Check if a time is in the future
 *
 * @param dateStr - ISO date string from Airtable
 * @returns true if the time is in the future
 */
export function isInFuture(dateStr: string): boolean {
  try {
    return parseUTC(dateStr) > new Date();
  } catch {
    return false;
  }
}

/**
 * Check if a time is in the past
 *
 * @param dateStr - ISO date string from Airtable
 * @returns true if the time is in the past
 */
export function isInPast(dateStr: string): boolean {
  try {
    return parseUTC(dateStr) < new Date();
  } catch {
    return false;
  }
}

/**
 * Calculate hours between now and a time
 *
 * Positive = future, Negative = past
 *
 * @param dateStr - ISO date string from Airtable
 * @returns Hours until (positive) or since (negative) the time
 */
export function hoursUntil(dateStr: string): number {
  const target = parseUTC(dateStr);
  const now = new Date();
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/**
 * Calculate hours since a time
 *
 * Positive = past, Negative = future
 *
 * @param dateStr - ISO date string from Airtable
 * @returns Hours since the time
 */
export function hoursSince(dateStr: string): number {
  return -hoursUntil(dateStr);
}

/**
 * Get the session end time given start time and duration
 *
 * @param scheduledStart - ISO date string from Airtable
 * @param durationMinutes - Session duration in minutes
 * @returns Date object for session end time
 */
export function getSessionEndTime(scheduledStart: string, durationMinutes: number): Date {
  const start = parseUTC(scheduledStart);
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Calculate email schedule times based on session start and duration
 *
 * Returns Date objects that can be used directly with Resend's scheduledAt.
 * (Resend expects ISO strings, use .toISOString() on these)
 *
 * @param scheduledStart - ISO date string from Airtable
 * @param durationMinutes - Session duration in minutes
 * @returns Object with prep48h, prep24h, feedbackImmediate, sessionStart, sessionEnd
 */
export function calculateScheduleTimes(scheduledStart: string, durationMinutes: number) {
  const start = parseUTC(scheduledStart);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return {
    prep48h: new Date(start.getTime() - 48 * 60 * 60 * 1000),
    prep24h: new Date(start.getTime() - 24 * 60 * 60 * 1000),
    feedbackImmediate: end,
    sessionStart: start,
    sessionEnd: end,
  };
}

/**
 * Format a date for email display (date portion) in Eastern time
 *
 * @param dateStr - ISO date string from Airtable
 * @returns Formatted date string like "Monday, December 8, 2024"
 */
export function formatDateForEmail(dateStr: string): string {
  return formatAsEastern(dateStr, "EEEE, MMMM d, yyyy");
}

/**
 * Format a date for email display (time portion) in Eastern time
 *
 * @param dateStr - ISO date string from Airtable
 * @returns Formatted time string like "1:00 PM ET"
 */
export function formatTimeForEmail(dateStr: string): string {
  return `${formatAsEastern(dateStr, "h:mm a")} ${TIMEZONE_ABBR}`;
}

/**
 * Format a time with timezone indicator for UI display
 *
 * @param dateStr - ISO date string from Airtable
 * @returns Formatted time string like "1:00 PM ET"
 */
export function formatTimeWithZone(dateStr: string): string {
  return `${formatAsEastern(dateStr, "h:mm a")} ${TIMEZONE_ABBR}`;
}

/**
 * Convert a Date to an ISO-like string in Eastern time (no Z suffix)
 *
 * Useful for displaying times where we want the raw Eastern time value.
 *
 * @param date - Date object
 * @returns ISO-like string in Eastern time (e.g., "2024-12-08T13:00:00")
 */
export function toEasternISOString(date: Date): string {
  return formatTz(date, "yyyy-MM-dd'T'HH:mm:ss", { timeZone: APP_TIMEZONE });
}

/**
 * Check if a scheduled time is valid for Resend
 * (not in the past and within 30 days)
 *
 * @param scheduledFor - Date object for when to send
 * @param maxDays - Maximum days in advance (default 30)
 * @returns true if the time is valid for scheduling
 */
export function isValidScheduleTime(scheduledFor: Date, maxDays: number = 30): boolean {
  const now = new Date();
  const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
  return scheduledFor > now && scheduledFor <= maxDate;
}
