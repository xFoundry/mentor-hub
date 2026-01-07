"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOnboarding } from "@/contexts/onboarding-context";
import type { TipDefinition, OnboardingUserType } from "@/types/onboarding";
import { cn } from "@/lib/utils";

interface TipBannerProps {
  /** The tip definition to display */
  tip: TipDefinition;
  /** Current user type for visibility check */
  userType: OnboardingUserType;
  /** Additional className for the banner */
  className?: string;
}

/**
 * TipBanner - A full-width banner tip component
 *
 * Displays tips as Alert components for page-level announcements.
 * Great for important tips that should be highly visible.
 */
export function TipBanner({ tip, userType, className }: TipBannerProps) {
  const { shouldShowTip, dismissTip, recordTipView, isTipDismissed } =
    useOnboarding();

  const visible = shouldShowTip(tip, userType);
  const dismissed = isTipDismissed(tip.id);

  // Record view on mount
  useEffect(() => {
    if (visible && !dismissed) {
      recordTipView(tip.id);
    }
  }, [visible, dismissed, tip.id, recordTipView]);

  // Don't render if not visible
  if (!visible) return null;

  const handleDismiss = () => {
    if (tip.dismissible !== false) {
      dismissTip(tip.id);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Alert
            className={cn(
              "relative border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
              className
            )}
          >
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {tip.title && (
              <AlertTitle className="text-blue-900 dark:text-blue-100">
                {tip.title}
              </AlertTitle>
            )}
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="text-blue-800 dark:text-blue-200">
                {tip.content}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {tip.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild={!!tip.action.href}
                    className="border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900"
                  >
                    {tip.action.href ? (
                      <Link href={tip.action.href}>
                        {tip.action.label}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    ) : (
                      <span>{tip.action.label}</span>
                    )}
                  </Button>
                )}
                {tip.dismissible !== false && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900"
                    onClick={handleDismiss}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
