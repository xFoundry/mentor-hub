/**
 * RRule Helpers for Recurring Sessions
 *
 * Utilities for generating and parsing RFC 5545 recurrence rules.
 * Uses the rrule library for accurate date calculations.
 */

import { RRule, Frequency } from "rrule";
import type { RecurrenceConfig } from "@/types/recurring";
import { RECURRENCE_LIMITS } from "@/types/recurring";

/**
 * Map our frequency strings to RRule frequencies
 */
const FREQUENCY_MAP: Record<RecurrenceConfig["frequency"], Frequency> = {
  weekly: RRule.WEEKLY,
  biweekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
};

/**
 * Generate all occurrence dates for a recurring session series
 *
 * @param startDate - Start date/time for the first occurrence (ISO string)
 * @param config - Recurrence configuration
 * @returns Array of Date objects for each occurrence
 */
export function generateOccurrences(
  startDate: string,
  config: RecurrenceConfig
): Date[] {
  const start = new Date(startDate);

  // Validate start date is in the future
  if (start <= new Date()) {
    throw new Error("Start date must be in the future");
  }

  // Calculate interval (biweekly = weekly with interval 2)
  const interval = config.frequency === "biweekly" ? 2 : (config.interval || 1);

  // Build RRule options
  const options: Partial<ConstructorParameters<typeof RRule>[0]> = {
    freq: FREQUENCY_MAP[config.frequency],
    interval,
    dtstart: start,
  };

  // Set end condition
  if (config.occurrences) {
    options.count = Math.min(config.occurrences, RECURRENCE_LIMITS.MAX_OCCURRENCES);
  } else if (config.endDate) {
    const endDate = new Date(config.endDate);
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Validate end date is within limits
    const maxEndDate = new Date(start);
    maxEndDate.setDate(maxEndDate.getDate() + RECURRENCE_LIMITS.MAX_DAYS_AHEAD);
    if (endDate > maxEndDate) {
      throw new Error(`End date cannot be more than ${RECURRENCE_LIMITS.MAX_DAYS_AHEAD} days from start`);
    }

    options.until = endDate;
  } else {
    // Default to 12 occurrences if neither specified
    options.count = 12;
  }

  // Add days of week for weekly patterns
  if (config.daysOfWeek && config.daysOfWeek.length > 0) {
    // RRule expects 0=Monday, but our config uses 0=Sunday
    // Convert: Sunday=0 -> 6, Monday=1 -> 0, etc.
    options.byweekday = config.daysOfWeek.map(day =>
      day === 0 ? 6 : day - 1
    );
  }

  const rule = new RRule(options as ConstructorParameters<typeof RRule>[0]);
  const dates = rule.all();

  // Enforce max occurrences limit
  if (dates.length > RECURRENCE_LIMITS.MAX_OCCURRENCES) {
    return dates.slice(0, RECURRENCE_LIMITS.MAX_OCCURRENCES);
  }

  return dates;
}

/**
 * Convert RecurrenceConfig to an RFC 5545 RRULE string
 *
 * @param startDate - Start date for the series
 * @param config - Recurrence configuration
 * @returns RFC 5545 RRULE string (e.g., "FREQ=WEEKLY;INTERVAL=1;COUNT=12")
 */
export function configToRRule(startDate: Date, config: RecurrenceConfig): string {
  const interval = config.frequency === "biweekly" ? 2 : (config.interval || 1);

  const options: Partial<ConstructorParameters<typeof RRule>[0]> = {
    freq: FREQUENCY_MAP[config.frequency],
    interval,
    dtstart: startDate,
  };

  if (config.occurrences) {
    options.count = Math.min(config.occurrences, RECURRENCE_LIMITS.MAX_OCCURRENCES);
  } else if (config.endDate) {
    const endDate = new Date(config.endDate);
    endDate.setHours(23, 59, 59, 999);
    options.until = endDate;
  } else {
    options.count = 12;
  }

  if (config.daysOfWeek && config.daysOfWeek.length > 0) {
    options.byweekday = config.daysOfWeek.map(day =>
      day === 0 ? 6 : day - 1
    );
  }

  const rule = new RRule(options as ConstructorParameters<typeof RRule>[0]);
  return rule.toString();
}

/**
 * Parse an RFC 5545 RRULE string back to RecurrenceConfig
 *
 * @param rruleStr - RFC 5545 RRULE string
 * @returns RecurrenceConfig object
 */
export function parseRRule(rruleStr: string): RecurrenceConfig {
  const rule = RRule.fromString(rruleStr);
  const options = rule.options;

  // Determine frequency
  let frequency: RecurrenceConfig["frequency"];
  if (options.freq === RRule.MONTHLY) {
    frequency = "monthly";
  } else if (options.freq === RRule.WEEKLY && options.interval === 2) {
    frequency = "biweekly";
  } else {
    frequency = "weekly";
  }

  const config: RecurrenceConfig = {
    frequency,
    interval: options.interval,
  };

  if (options.count) {
    config.occurrences = options.count;
  }

  if (options.until) {
    config.endDate = options.until.toISOString().split("T")[0];
  }

  // Convert RRule weekday back to our format (RRule: 0=Mon, our: 0=Sun)
  if (options.byweekday && options.byweekday.length > 0) {
    config.daysOfWeek = options.byweekday.map(day => {
      // RRule Weekday can be a number or an object with weekday property
      const dayNum = typeof day === "number" ? day : (day as { weekday: number }).weekday;
      return dayNum === 6 ? 0 : dayNum + 1;
    });
  }

  return config;
}

/**
 * Get a human-readable description of a recurrence pattern
 *
 * @param config - Recurrence configuration
 * @returns Human-readable string (e.g., "Weekly for 12 sessions")
 */
export function getRecurrenceDescription(config: RecurrenceConfig): string {
  const frequencyText: Record<RecurrenceConfig["frequency"], string> = {
    weekly: "Weekly",
    biweekly: "Every 2 weeks",
    monthly: "Monthly",
  };

  let description = frequencyText[config.frequency];

  if (config.occurrences) {
    description += ` for ${config.occurrences} sessions`;
  } else if (config.endDate) {
    const date = new Date(config.endDate);
    description += ` until ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  return description;
}

/**
 * Validate a RecurrenceConfig
 *
 * @param config - Recurrence configuration to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateRecurrenceConfig(
  config: RecurrenceConfig
): { isValid: boolean; error?: string } {
  if (!config.frequency) {
    return { isValid: false, error: "Frequency is required" };
  }

  if (!["weekly", "biweekly", "monthly"].includes(config.frequency)) {
    return { isValid: false, error: "Invalid frequency" };
  }

  if (!config.occurrences && !config.endDate) {
    return { isValid: false, error: "Either occurrences or end date is required" };
  }

  if (config.occurrences && config.occurrences < 2) {
    return { isValid: false, error: "At least 2 occurrences are required" };
  }

  if (config.occurrences && config.occurrences > RECURRENCE_LIMITS.MAX_OCCURRENCES) {
    return {
      isValid: false,
      error: `Maximum ${RECURRENCE_LIMITS.MAX_OCCURRENCES} occurrences allowed`,
    };
  }

  if (config.endDate) {
    const endDate = new Date(config.endDate);
    if (isNaN(endDate.getTime())) {
      return { isValid: false, error: "Invalid end date format" };
    }
  }

  return { isValid: true };
}
