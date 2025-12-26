/**
 * Onboarding and Contextual Help System Types
 *
 * This module defines types for the onboarding system including:
 * - Tip definitions (popovers, tooltips, cards, banners, inline text)
 * - Tour definitions (step-by-step guided walkthroughs)
 * - Onboarding state (persisted user preferences)
 */

// =====================
// Base Types
// =====================

/** User types that can receive tips */
export type OnboardingUserType = "student" | "mentor" | "staff";

/** Tip display variants */
export type TipVariant = "popover" | "tooltip" | "card" | "banner" | "inline";

/** Tip priority for ordering/filtering */
export type TipPriority = "high" | "medium" | "low";

/** Tip/tour step placement relative to target element */
export type TipPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end";

// =====================
// Tip Types
// =====================

/** Optional action button for tips */
export interface TipAction {
  /** Button label text */
  label: string;
  /** Link destination (renders as anchor) */
  href?: string;
  /** Callback function name (for custom handlers) */
  onClick?: string;
}

/** Individual tip definition */
export interface TipDefinition {
  /** Unique identifier for this tip */
  id: string;
  /** Display title (optional for tooltips) */
  title?: string;
  /** Main content text */
  content: string;
  /** Which variant to render */
  variant: TipVariant;
  /** User types this tip applies to */
  userTypes: OnboardingUserType[];
  /** Priority for display ordering */
  priority: TipPriority;
  /** Whether tip can be dismissed (default: true) */
  dismissible?: boolean;
  /** Delay before showing (ms) - for auto-show tips */
  showDelay?: number;
  /** Optional icon name from lucide-react */
  icon?: string;
  /** Optional action button */
  action?: TipAction;
}

// =====================
// Tour Types
// =====================

/** Tour step definition */
export interface TourStep {
  /** Unique identifier for this step */
  id: string;
  /** CSS selector for target element to spotlight */
  targetSelector: string;
  /** Title of this step */
  title: string;
  /** Description/content */
  content: string;
  /** Popover placement relative to target */
  placement: TipPlacement;
  /** Optional action to highlight (e.g., "Click here to continue") */
  highlightAction?: string;
  /** User types this step applies to (inherits from tour if not specified) */
  userTypes?: OnboardingUserType[];
}

/** Tour definition */
export interface TourDefinition {
  /** Unique identifier for this tour */
  id: string;
  /** Tour name for display */
  name: string;
  /** Description */
  description: string;
  /** User types this tour applies to */
  userTypes: OnboardingUserType[];
  /** Page/route this tour is for */
  page: string;
  /** Ordered list of steps */
  steps: TourStep[];
}

// =====================
// State Types
// =====================

/** State for an individual tip */
export interface TipState {
  /** Whether the tip has been dismissed */
  dismissed: boolean;
  /** When the tip was dismissed (ISO date string) */
  dismissedAt?: string;
  /** Number of times this tip has been viewed */
  viewCount: number;
  /** When the tip was last viewed (ISO date string) */
  lastViewedAt?: string;
}

/** Tour progress state */
export interface TourProgress {
  /** Whether the tour has been completed */
  completed: boolean;
  /** When the tour was completed (ISO date string) */
  completedAt?: string;
  /** Whether the tour was skipped */
  skipped: boolean;
  /** When the tour was skipped (ISO date string) */
  skippedAt?: string;
}

/** Overall onboarding state (persisted to localStorage) */
export interface OnboardingState {
  /** Master toggle for showing tips */
  showTips: boolean;
  /** Per-tip state (dismissals, view counts) */
  tipStates: Record<string, TipState>;
  /** Per-tour progress */
  tourProgress: Record<string, TourProgress>;
  /** Whether welcome dialog has been shown */
  welcomeShown: boolean;
  /** First visit timestamp (ISO date string) */
  firstVisit: string;
  /** Last updated timestamp (ISO date string) */
  lastUpdated: string;
  /** Schema version for migrations */
  version: number;
}

// =====================
// Configuration Types
// =====================

/** Page-specific tips configuration */
export interface PageTipsConfig {
  /** Route path this config applies to */
  page: string;
  /** Tips for this page */
  tips: TipDefinition[];
  /** Optional tour for this page */
  tour?: TourDefinition;
}
