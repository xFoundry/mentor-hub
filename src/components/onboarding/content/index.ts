import type { PageTipsConfig } from "@/types/onboarding";
import { dashboardTips } from "./dashboard-tips";
import { sessionsTips } from "./sessions-tips";
import { tasksTips } from "./tasks-tips";
import { mentorsTips } from "./mentors-tips";
import { feedbackTips } from "./feedback-tips";

/**
 * Registry of all page tips configurations
 *
 * Maps route paths to their tip configurations.
 * Add new page tip files here as they are created.
 */
export const allPageTips: Record<string, PageTipsConfig> = {
  "/dashboard": dashboardTips,
  "/sessions": sessionsTips,
  "/tasks": tasksTips,
  "/mentors": mentorsTips,
  "/feedback": feedbackTips,
};

/**
 * Get tip configuration for a given pathname
 *
 * Handles exact matches and prefix matching for dynamic routes.
 *
 * @param pathname - The current route path
 * @returns The page tips config or undefined if not found
 */
export function getPageTips(pathname: string): PageTipsConfig | undefined {
  // Try exact match first
  if (allPageTips[pathname]) {
    return allPageTips[pathname];
  }

  // Try prefix match for dynamic routes (e.g., /sessions/123)
  for (const [path, config] of Object.entries(allPageTips)) {
    if (pathname.startsWith(path + "/")) {
      return config;
    }
  }

  return undefined;
}

// Re-export individual page configs for direct imports
export { dashboardTips } from "./dashboard-tips";
export { sessionsTips } from "./sessions-tips";
export { tasksTips } from "./tasks-tips";
export { mentorsTips } from "./mentors-tips";
export { feedbackTips } from "./feedback-tips";
