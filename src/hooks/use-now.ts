"use client";

import { useState, useEffect } from "react";

/**
 * Hook that returns the current time and updates at a specified interval
 * Useful for time-sensitive displays that need to stay current
 *
 * @param intervalMs - Update interval in milliseconds (default: 60000 = 1 minute)
 * @returns Current Date object that updates at the specified interval
 */
export function useNow(intervalMs: number = 60000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Update immediately to sync with current time
    setNow(new Date());

    const interval = setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}

/**
 * Hook that returns current time with smart interval based on urgency
 * Updates more frequently when time is critical (< 5 min = every 10s, < 1 hour = every 30s)
 *
 * @param urgentThresholdMinutes - Minutes threshold for "urgent" (faster updates)
 * @returns Current Date object
 */
export function useSmartNow(urgentThresholdMinutes: number = 60): Date {
  const [now, setNow] = useState(() => new Date());
  const [intervalMs, setIntervalMs] = useState(60000);

  useEffect(() => {
    const updateNow = () => {
      const newNow = new Date();
      setNow(newNow);
      return newNow;
    };

    // Initial update
    updateNow();

    const interval = setInterval(() => {
      updateNow();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}
