"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useOnboarding } from "@/contexts/onboarding-context";
import { TourStep } from "./tour-step";
import type { TourDefinition, OnboardingUserType } from "@/types/onboarding";

interface TourProviderProps {
  /** The tour definition */
  tour: TourDefinition;
  /** Current user type for filtering steps */
  userType: OnboardingUserType;
  /** Children to render */
  children: React.ReactNode;
  /** Auto-start tour on first visit (default: true for students) */
  autoStart?: boolean;
}

/**
 * TourProvider - Orchestrates a guided tour experience
 *
 * Wraps content and manages tour state including:
 * - Auto-starting tours for first-time users
 * - Finding and highlighting target elements
 * - Rendering the tour step UI with spotlight
 */
export function TourProvider({
  tour,
  userType,
  children,
  autoStart = true,
}: TourProviderProps) {
  const {
    activeTour,
    currentTourStep,
    startTour,
    nextTourStep,
    prevTourStep,
    skipTour,
    completeTour,
    isTourCompleted,
    isTourSkipped,
    getFilteredSteps,
    welcomeShown,
    isLoading,
    showTips,
  } = useOnboarding();

  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  // Track which step index had element not found (null = no step has failed)
  const [notFoundForStep, setNotFoundForStep] = useState<number | null>(null);

  // Filter steps by user type
  const steps = getFilteredSteps(tour.steps, userType);
  const currentStep = steps[currentTourStep];
  const isActive = activeTour === tour.id;
  const isComplete = isTourCompleted(tour.id);
  const isSkipped = isTourSkipped(tour.id);

  // Auto-start tour for first-time users (only students by default)
  useEffect(() => {
    if (
      autoStart &&
      showTips &&
      !isLoading &&
      welcomeShown &&
      !isComplete &&
      !isSkipped &&
      userType === "student" &&
      !activeTour &&
      steps.length > 0
    ) {
      // Small delay to let page render
      const timer = setTimeout(() => {
        startTour(tour.id);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    autoStart,
    showTips,
    isLoading,
    welcomeShown,
    isComplete,
    isSkipped,
    userType,
    activeTour,
    steps.length,
    startTour,
    tour.id,
  ]);

  // Find target element when step changes
  useEffect(() => {
    if (!isActive || !currentStep) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetElement(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotFoundForStep(null);
      return;
    }

    // Capture step index at effect start to avoid closure issues
    const stepIndex = currentTourStep;

    const findTarget = () => {
      const element = document.querySelector(
        currentStep.targetSelector
      ) as HTMLElement | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetElement(element);
      return element;
    };

    findTarget();

    // Retry a few times in case element renders late
    const retryDelays = [100, 300, 500, 1000];
    const timers = retryDelays.map((delay) => setTimeout(findTarget, delay));

    // Final check after all retries - if still not found, mark this specific step as not found
    const finalCheckTimer = setTimeout(() => {
      const element = findTarget();
      if (!element) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotFoundForStep(stepIndex);
      }
    }, 1200);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalCheckTimer);
    };
  }, [isActive, currentStep, currentTourStep]);

  // Auto-advance when target element is not found after retries
  // Only triggers when notFoundForStep matches the current step (prevents cascading skips)
  useEffect(() => {
    if (!isActive || notFoundForStep !== currentTourStep) return;

    // Clear the not-found state before advancing to prevent re-triggering
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotFoundForStep(null);

    // Skip to next step or complete tour if element not found
    if (currentTourStep >= steps.length - 1) {
      completeTour();
    } else {
      nextTourStep();
    }
  }, [isActive, notFoundForStep, currentTourStep, steps.length, completeTour, nextTourStep]);

  const handleNext = useCallback(() => {
    if (currentTourStep >= steps.length - 1) {
      completeTour();
    } else {
      nextTourStep();
    }
  }, [currentTourStep, steps.length, completeTour, nextTourStep]);

  const handlePrev = useCallback(() => {
    prevTourStep();
  }, [prevTourStep]);

  const handleSkip = useCallback(() => {
    skipTour();
  }, [skipTour]);

  // If tips disabled, tour is not active, or no current step, just render children
  if (!showTips || !isActive || !currentStep) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <AnimatePresence>
        {targetElement && (
          <TourStep
            step={currentStep}
            stepIndex={currentTourStep}
            totalSteps={steps.length}
            targetElement={targetElement}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            isFirst={currentTourStep === 0}
            isLast={currentTourStep === steps.length - 1}
          />
        )}
      </AnimatePresence>
    </>
  );
}
