/**
 * Onboarding & Contextual Help System
 *
 * This module provides a comprehensive onboarding experience including:
 * - Tip components (Card, Tooltip, Popover, Banner, ExplainerText)
 * - Tour components (TourProvider, TourStep, TourProgress)
 * - Welcome dialog for first-time users
 * - Settings toggle for tip preferences
 * - Page tour wrapper for easy integration
 *
 * Usage:
 * ```tsx
 * import { PageTourWrapper, TipCard, WelcomeDialog, HelpToggle } from "@/components/onboarding";
 * import { dashboardTips, sessionsTips } from "@/components/onboarding/content";
 * ```
 */

// Tip components
export { TipCard } from "./tip-card";
export { TipTooltip } from "./tip-tooltip";
export { TipPopover } from "./tip-popover";
export { TipBanner } from "./tip-banner";
export { ExplainerText } from "./explainer-text";

// Tour components
export { TourProvider } from "./tour-provider";
export { TourStep } from "./tour-step";
export { TourProgress } from "./tour-progress";

// Dialog components
export { WelcomeDialog } from "./welcome-dialog";

// Settings components
export { HelpToggle } from "./help-toggle";

// Page wrapper for easy integration
export { PageTourWrapper } from "./page-tour-wrapper";

// Content exports
export {
  allPageTips,
  getPageTips,
  dashboardTips,
  sessionsTips,
  tasksTips,
  mentorsTips,
  feedbackTips,
} from "./content";
