"use client";

import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { TourProgress } from "./tour-progress";
import type { TourStep as TourStepType, TipPlacement } from "@/types/onboarding";

interface TourStepProps {
  /** The step definition */
  step: TourStepType;
  /** Current step index (0-based) */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** The target DOM element */
  targetElement: HTMLElement;
  /** Callback when next is clicked */
  onNext: () => void;
  /** Callback when prev is clicked */
  onPrev: () => void;
  /** Callback when skip is clicked */
  onSkip: () => void;
  /** Whether this is the first step */
  isFirst: boolean;
  /** Whether this is the last step */
  isLast: boolean;
}

interface Position {
  top: number;
  left: number;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * TourStep - A single tour step with spotlight effect
 *
 * Renders a spotlight cutout around the target element
 * and a positioned card with step content and navigation.
 * Uses fixed positioning and portal for reliable positioning.
 */
export function TourStep({
  step,
  stepIndex,
  totalSteps,
  targetElement,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: TourStepProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const positionCalculatedRef = useRef(false);

  // Check if we're on mobile - only run once on mount
  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 640);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate position based on target element
  const calculatePosition = useCallback(() => {
    if (!targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const cardWidth = isMobile ? 280 : 320;
    const cardHeight = cardRef.current?.offsetHeight || 200;
    const padding = 12;
    const spotlightPadding = 8;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Spotlight rect - viewport relative (fixed positioning)
    const newSpotlightRect = {
      top: targetRect.top - spotlightPadding,
      left: targetRect.left - spotlightPadding,
      width: targetRect.width + spotlightPadding * 2,
      height: targetRect.height + spotlightPadding * 2,
    };

    let newPosition: Position;

    // On mobile, always position card at bottom or top of viewport
    if (isMobile) {
      const targetCenterY = targetRect.top + targetRect.height / 2;
      const isTargetInUpperHalf = targetCenterY < viewportHeight / 2;

      newPosition = {
        top: isTargetInUpperHalf
          ? viewportHeight - cardHeight - padding - 60
          : padding + 60,
        left: Math.max(padding, (viewportWidth - cardWidth) / 2),
      };
    } else {
      // Desktop: Calculate card position based on placement
      let top = 0;
      let left = 0;
      const placement = step.placement;

      // Determine best placement based on available space
      const spaceAbove = targetRect.top;
      const spaceBelow = viewportHeight - targetRect.bottom;
      const spaceLeft = targetRect.left;
      const spaceRight = viewportWidth - targetRect.right;

      // Auto-adjust placement if specified placement doesn't have enough space
      let effectivePlacement = placement;
      if ((placement === "top" || placement === "top-start" || placement === "top-end") && spaceAbove < cardHeight + padding) {
        effectivePlacement = placement.replace("top", "bottom") as TipPlacement;
      } else if ((placement === "bottom" || placement === "bottom-start" || placement === "bottom-end") && spaceBelow < cardHeight + padding) {
        effectivePlacement = placement.replace("bottom", "top") as TipPlacement;
      } else if (placement === "left" && spaceLeft < cardWidth + padding) {
        effectivePlacement = "right";
      } else if (placement === "right" && spaceRight < cardWidth + padding) {
        effectivePlacement = "left";
      }

      switch (effectivePlacement) {
        case "top":
        case "top-start":
        case "top-end":
          top = targetRect.top - cardHeight - padding;
          break;
        case "bottom":
        case "bottom-start":
        case "bottom-end":
          top = targetRect.bottom + padding;
          break;
        case "left":
          top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
          left = targetRect.left - cardWidth - padding;
          break;
        case "right":
          top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
          left = targetRect.right + padding;
          break;
        default:
          top = targetRect.bottom + padding;
      }

      // Horizontal alignment for top/bottom placements
      if (effectivePlacement === "top" || effectivePlacement === "bottom") {
        left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
      } else if (effectivePlacement === "top-start" || effectivePlacement === "bottom-start") {
        left = targetRect.left;
      } else if (effectivePlacement === "top-end" || effectivePlacement === "bottom-end") {
        left = targetRect.right - cardWidth;
      }

      // Clamp to viewport bounds with padding
      top = Math.max(padding, Math.min(viewportHeight - cardHeight - padding, top));
      left = Math.max(padding, Math.min(viewportWidth - cardWidth - padding, left));

      newPosition = { top, left };
    }

    setSpotlightRect(newSpotlightRect);
    setPosition(newPosition);
  }, [targetElement, step.placement, isMobile]);

  // Calculate position when mounted and target element changes
  useLayoutEffect(() => {
    if (!mounted || !targetElement) return;

    // Initial calculation after a small delay to let the card render
    const timer = setTimeout(() => {
      calculatePosition();
      positionCalculatedRef.current = true;
    }, 50);

    return () => clearTimeout(timer);
  }, [mounted, targetElement, calculatePosition]);

  // Handle resize and scroll events
  useEffect(() => {
    if (!mounted || !positionCalculatedRef.current) return;

    const handleUpdate = () => {
      calculatePosition();
    };

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [mounted, calculatePosition]);

  // Scroll target into view
  useEffect(() => {
    if (!targetElement || !mounted) return;

    const targetRect = targetElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Only scroll if target is not visible
    if (targetRect.top < 0 || targetRect.bottom > viewportHeight) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
      });
    }
  }, [targetElement, mounted]);

  // Don't render until mounted (avoid SSR issues)
  if (!mounted) return null;

  const content = (
    <>
      {/* Dark overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/50"
        onClick={onSkip}
      />

      {/* Spotlight highlight around target - creates cutout effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed z-[9999] pointer-events-none rounded-lg ring-4 ring-primary/50"
        style={{
          top: spotlightRect.top,
          left: spotlightRect.left,
          width: spotlightRect.width,
          height: spotlightRect.height,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
          backgroundColor: "transparent",
        }}
      />

      {/* Step card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="fixed z-[10000] w-[280px] sm:w-80"
        style={{ top: position.top, left: position.left }}
      >
        <Card className="shadow-2xl border-2 border-primary/20 bg-background">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-semibold">
                {step.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-2 shrink-0"
                onClick={onSkip}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Skip tour</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm text-muted-foreground">{step.content}</p>
            {step.highlightAction && (
              <p className="text-sm text-primary font-medium mt-2">
                {step.highlightAction}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t pt-3 gap-2">
            <TourProgress current={stepIndex} total={totalSteps} />
            <div className="flex items-center gap-1 sm:gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={onPrev} className="px-2 sm:px-3">
                  <ArrowLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              <Button size="sm" onClick={onNext} className="px-3">
                {isLast ? "Finish" : "Next"}
                {!isLast && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </>
  );

  // Render in portal to avoid z-index issues
  return createPortal(content, document.body);
}
