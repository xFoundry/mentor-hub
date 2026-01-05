"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type {
  OnboardingState,
  TipDefinition,
  TourStep,
  OnboardingUserType,
} from "@/types/onboarding";

// =====================
// Constants
// =====================

const STORAGE_KEY = "mentor-hub.onboarding-preferences";
const CURRENT_VERSION = 1;

const DEFAULT_STATE: OnboardingState = {
  showTips: true, // Default ON for all users
  tipStates: {},
  tourProgress: {},
  welcomeShown: false,
  firstVisit: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  version: CURRENT_VERSION,
};

// =====================
// Context Type
// =====================

interface OnboardingContextType {
  // State
  state: OnboardingState;
  isLoading: boolean;

  // Master toggle
  showTips: boolean;
  setShowTips: (show: boolean) => void;

  // Tip management
  isTipDismissed: (tipId: string) => boolean;
  dismissTip: (tipId: string) => void;
  resetTip: (tipId: string) => void;
  resetAllTips: () => void;
  recordTipView: (tipId: string) => void;

  // Tour management
  activeTour: string | null;
  currentTourStep: number;
  startTour: (tourId: string) => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  skipTour: () => void;
  skipTourById: (tourId: string) => void;
  completeTour: () => void;
  isTourCompleted: (tourId: string) => boolean;
  isTourSkipped: (tourId: string) => boolean;
  resetTour: (tourId: string) => void;

  // Welcome dialog
  welcomeShown: boolean;
  markWelcomeShown: () => void;

  // Utility
  shouldShowTip: (tip: TipDefinition, userType: OnboardingUserType) => boolean;
  getFilteredSteps: (
    steps: TourStep[],
    userType: OnboardingUserType
  ) => TourStep[];
}

// =====================
// Context
// =====================

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

// =====================
// Provider
// =====================

interface OnboardingProviderProps {
  children: React.ReactNode;
  /** The current user's type - used for filtering tips */
  userType: OnboardingUserType | null;
  /** Whether user is being impersonated (read-only mode) */
  isImpersonating?: boolean;
}

export function OnboardingProvider({
  children,
  userType,
  isImpersonating = false,
}: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTour, setActiveTour] = useState<string | null>(null);
  const [currentTourStep, setCurrentTourStep] = useState(0);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OnboardingState;
        // Handle version migrations if needed
        if (parsed.version < CURRENT_VERSION) {
          // Future migrations go here
          parsed.version = CURRENT_VERSION;
        }
        setState(parsed);
      }
    } catch (error) {
      console.error("[Onboarding] Failed to load state:", error);
    }
    setIsLoading(false);
  }, []);

  // =====================
  // Master Toggle
  // =====================

  const setShowTips = useCallback(
    (show: boolean) => {
      setState((prev) => {
        const newState = { ...prev, showTips: show, lastUpdated: new Date().toISOString() };
        if (!isImpersonating && typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          } catch (error) {
            console.error("[Onboarding] Failed to persist state:", error);
          }
        }
        return newState;
      });
    },
    [isImpersonating]
  );

  // =====================
  // Tip Management
  // =====================

  const isTipDismissed = useCallback(
    (tipId: string): boolean => {
      return state.tipStates[tipId]?.dismissed ?? false;
    },
    [state.tipStates]
  );

  const dismissTip = useCallback(
    (tipId: string) => {
      setState((prev) => {
        const currentTipState = prev.tipStates[tipId];
        const tipState = {
          dismissed: true,
          dismissedAt: new Date().toISOString(),
          viewCount: (currentTipState?.viewCount ?? 0) + 1,
          lastViewedAt: new Date().toISOString(),
        };
        const newState = {
          ...prev,
          tipStates: { ...prev.tipStates, [tipId]: tipState },
          lastUpdated: new Date().toISOString(),
        };
        if (!isImpersonating && typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          } catch (error) {
            console.error("[Onboarding] Failed to persist state:", error);
          }
        }
        return newState;
      });
    },
    [isImpersonating]
  );

  const resetTip = useCallback(
    (tipId: string) => {
      setState((prev) => {
        const { [tipId]: _, ...rest } = prev.tipStates;
        const newState = { ...prev, tipStates: rest, lastUpdated: new Date().toISOString() };
        if (!isImpersonating && typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          } catch (error) {
            console.error("[Onboarding] Failed to persist state:", error);
          }
        }
        return newState;
      });
    },
    [isImpersonating]
  );

  /** Reset all dismissed tips (does not affect tour progress) */
  const resetAllTips = useCallback(() => {
    setState((prev) => {
      const newState = { ...prev, tipStates: {}, lastUpdated: new Date().toISOString() };
      if (!isImpersonating && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        } catch (error) {
          console.error("[Onboarding] Failed to persist state:", error);
        }
      }
      return newState;
    });
  }, [isImpersonating]);

  const recordTipView = useCallback(
    (tipId: string) => {
      setState((prev) => {
        const current = prev.tipStates[tipId];
        const tipState = {
          dismissed: current?.dismissed ?? false,
          dismissedAt: current?.dismissedAt,
          viewCount: (current?.viewCount ?? 0) + 1,
          lastViewedAt: new Date().toISOString(),
        };
        const newState = {
          ...prev,
          tipStates: { ...prev.tipStates, [tipId]: tipState },
          lastUpdated: new Date().toISOString(),
        };
        if (!isImpersonating && typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          } catch (error) {
            console.error("[Onboarding] Failed to persist state:", error);
          }
        }
        return newState;
      });
    },
    [isImpersonating]
  );

  // =====================
  // Tour Management
  // =====================

  const startTour = useCallback((tourId: string) => {
    setActiveTour(tourId);
    setCurrentTourStep(0);
  }, []);

  const nextTourStep = useCallback(() => {
    setCurrentTourStep((prev) => prev + 1);
  }, []);

  const prevTourStep = useCallback(() => {
    setCurrentTourStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    setActiveTour((currentTour) => {
      if (currentTour) {
        setState((prev) => {
          const progress = {
            completed: false,
            skipped: true,
            skippedAt: new Date().toISOString(),
          };
          const newState = {
            ...prev,
            tourProgress: { ...prev.tourProgress, [currentTour]: progress },
            lastUpdated: new Date().toISOString(),
          };
          if (!isImpersonating && typeof window !== "undefined") {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
            } catch (error) {
              console.error("[Onboarding] Failed to persist state:", error);
            }
          }
          return newState;
        });
      }
      return null;
    });
    setCurrentTourStep(0);
  }, [isImpersonating]);

  /** Skip a specific tour by ID (without it being active) */
  const skipTourById = useCallback(
    (tourId: string) => {
      setState((prev) => {
        const progress = {
          completed: false,
          skipped: true,
          skippedAt: new Date().toISOString(),
        };
        const newState = {
          ...prev,
          tourProgress: { ...prev.tourProgress, [tourId]: progress },
          lastUpdated: new Date().toISOString(),
        };
        if (!isImpersonating && typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          } catch (error) {
            console.error("[Onboarding] Failed to persist state:", error);
          }
        }
        return newState;
      });
    },
    [isImpersonating]
  );

  const completeTour = useCallback(() => {
    setActiveTour((currentTour) => {
      if (currentTour) {
        setState((prev) => {
          const progress = {
            completed: true,
            completedAt: new Date().toISOString(),
            skipped: false,
          };
          const newState = {
            ...prev,
            tourProgress: { ...prev.tourProgress, [currentTour]: progress },
            lastUpdated: new Date().toISOString(),
          };
          if (!isImpersonating && typeof window !== "undefined") {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
            } catch (error) {
              console.error("[Onboarding] Failed to persist state:", error);
            }
          }
          return newState;
        });
      }
      return null;
    });
    setCurrentTourStep(0);
  }, [isImpersonating]);

  const isTourCompleted = useCallback(
    (tourId: string): boolean => {
      return state.tourProgress[tourId]?.completed ?? false;
    },
    [state.tourProgress]
  );

  const isTourSkipped = useCallback(
    (tourId: string): boolean => {
      return state.tourProgress[tourId]?.skipped ?? false;
    },
    [state.tourProgress]
  );

  const resetTour = useCallback(
    (tourId: string) => {
      setState((prev) => {
        const { [tourId]: _, ...rest } = prev.tourProgress;
        const newState = { ...prev, tourProgress: rest, lastUpdated: new Date().toISOString() };
        if (!isImpersonating && typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          } catch (error) {
            console.error("[Onboarding] Failed to persist state:", error);
          }
        }
        return newState;
      });
    },
    [isImpersonating]
  );

  // =====================
  // Welcome Dialog
  // =====================

  const markWelcomeShown = useCallback(() => {
    setState((prev) => {
      const newState = { ...prev, welcomeShown: true, lastUpdated: new Date().toISOString() };
      if (!isImpersonating && typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        } catch (error) {
          console.error("[Onboarding] Failed to persist state:", error);
        }
      }
      return newState;
    });
  }, [isImpersonating]);

  // =====================
  // Utilities
  // =====================

  const shouldShowTip = useCallback(
    (tip: TipDefinition, userType: OnboardingUserType): boolean => {
      // Don't show if master toggle is off
      if (!state.showTips) return false;
      // Don't show if tip doesn't apply to this user type
      if (!tip.userTypes.includes(userType)) return false;
      // Don't show if dismissed (and dismissible)
      if (tip.dismissible !== false && isTipDismissed(tip.id)) return false;
      return true;
    },
    [state.showTips, isTipDismissed]
  );

  const getFilteredSteps = useCallback(
    (steps: TourStep[], userType: OnboardingUserType): TourStep[] => {
      return steps.filter(
        (step) => !step.userTypes || step.userTypes.includes(userType)
      );
    },
    []
  );

  // =====================
  // Context Value
  // =====================

  const value = useMemo(
    () => ({
      state,
      isLoading,
      showTips: state.showTips,
      setShowTips,
      isTipDismissed,
      dismissTip,
      resetTip,
      resetAllTips,
      recordTipView,
      activeTour,
      currentTourStep,
      startTour,
      nextTourStep,
      prevTourStep,
      skipTour,
      skipTourById,
      completeTour,
      isTourCompleted,
      isTourSkipped,
      resetTour,
      welcomeShown: state.welcomeShown,
      markWelcomeShown,
      shouldShowTip,
      getFilteredSteps,
    }),
    [
      state,
      isLoading,
      setShowTips,
      isTipDismissed,
      dismissTip,
      resetTip,
      resetAllTips,
      recordTipView,
      activeTour,
      currentTourStep,
      startTour,
      nextTourStep,
      prevTourStep,
      skipTour,
      skipTourById,
      completeTour,
      isTourCompleted,
      isTourSkipped,
      resetTour,
      markWelcomeShown,
      shouldShowTip,
      getFilteredSteps,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// =====================
// Hooks
// =====================

/**
 * Access the onboarding context.
 * Throws an error if used outside of OnboardingProvider.
 */
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

/**
 * Safe version of useOnboarding that returns default values if not in provider.
 * Useful for components that may be rendered outside the provider.
 */
export function useOnboardingSafe(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    return {
      state: DEFAULT_STATE,
      isLoading: false,
      showTips: true,
      setShowTips: () => {},
      isTipDismissed: () => false,
      dismissTip: () => {},
      resetTip: () => {},
      resetAllTips: () => {},
      recordTipView: () => {},
      activeTour: null,
      currentTourStep: 0,
      startTour: () => {},
      nextTourStep: () => {},
      prevTourStep: () => {},
      skipTour: () => {},
      skipTourById: () => {},
      completeTour: () => {},
      isTourCompleted: () => false,
      isTourSkipped: () => false,
      resetTour: () => {},
      welcomeShown: true,
      markWelcomeShown: () => {},
      shouldShowTip: () => false,
      getFilteredSteps: (steps: TourStep[]) => steps,
    };
  }
  return context;
}
