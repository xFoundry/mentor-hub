"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOnboarding } from "@/contexts/onboarding-context";
import type { TipDefinition, TipPlacement, OnboardingUserType } from "@/types/onboarding";
import { cn } from "@/lib/utils";

interface TipPopoverProps {
  /** The tip definition to display */
  tip: TipDefinition;
  /** Current user type for visibility check */
  userType: OnboardingUserType;
  /** The element to wrap with the popover trigger */
  children: React.ReactNode;
  /** Placement relative to trigger */
  placement?: TipPlacement;
  /** Show indicator dot on trigger */
  showIndicator?: boolean;
  /** Custom trigger wrapper class */
  triggerClassName?: string;
  /** Open by default on first view */
  autoOpen?: boolean;
}

/**
 * TipPopover - An anchored popover tip component
 *
 * Wraps children with a popover that shows tip content.
 * Optionally shows a blue indicator dot when tip is available.
 */
export function TipPopover({
  tip,
  userType,
  children,
  placement = "bottom",
  showIndicator = true,
  triggerClassName,
  autoOpen = false,
}: TipPopoverProps) {
  const { shouldShowTip, dismissTip, recordTipView, isTipDismissed } =
    useOnboarding();
  const [isOpen, setIsOpen] = useState(false);

  const visible = shouldShowTip(tip, userType);
  const dismissed = isTipDismissed(tip.id);

  // Auto-open logic
  useEffect(() => {
    if (autoOpen && visible && !dismissed) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        recordTipView(tip.id);
      }, tip.showDelay ?? 500);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, visible, dismissed, tip.id, tip.showDelay, recordTipView]);

  // Don't render popover wrapper if not visible, just render children
  if (!visible) return <>{children}</>;

  const handleDismiss = () => {
    if (tip.dismissible !== false) {
      dismissTip(tip.id);
    }
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      recordTipView(tip.id);
    }
  };

  // Map TipPlacement to popover side
  const mapSide = (p: TipPlacement): "top" | "bottom" | "left" | "right" => {
    if (p.startsWith("top")) return "top";
    if (p.startsWith("bottom")) return "bottom";
    if (p.startsWith("left")) return "left";
    return "right";
  };

  // Map TipPlacement to popover align
  const mapAlign = (p: TipPlacement): "start" | "center" | "end" => {
    if (p.endsWith("-start")) return "start";
    if (p.endsWith("-end")) return "end";
    return "center";
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className={cn("relative inline-flex", triggerClassName)}>
          {children}
          {showIndicator && !dismissed && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 pointer-events-none"
              aria-hidden="true"
            />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={mapSide(placement)}
        align={mapAlign(placement)}
        className="w-80"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />
              {tip.title && (
                <h4 className="font-medium text-sm">{tip.title}</h4>
              )}
            </div>
            {tip.dismissible !== false && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2 -mt-1"
                onClick={handleDismiss}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Dismiss</span>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{tip.content}</p>
          {tip.action && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" asChild={!!tip.action.href}>
                {tip.action.href ? (
                  <Link href={tip.action.href}>{tip.action.label}</Link>
                ) : (
                  <span>{tip.action.label}</span>
                )}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
