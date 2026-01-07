"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboarding } from "@/contexts/onboarding-context";
import type { TipDefinition, OnboardingUserType } from "@/types/onboarding";
import { cn } from "@/lib/utils";

interface TipCardProps {
  /** The tip definition to display */
  tip: TipDefinition;
  /** Current user type for visibility check */
  userType: OnboardingUserType;
  /** Additional className for the card */
  className?: string;
  /** Compact variant with smaller padding */
  compact?: boolean;
}

/**
 * TipCard - An inline card-style tip component
 *
 * Displays tips as styled cards with blue accent styling.
 * Supports dismissal, action buttons, and animations.
 */
export function TipCard({
  tip,
  userType,
  className,
  compact = false,
}: TipCardProps) {
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            className={cn(
              "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
              className
            )}
          >
            <CardHeader className={cn("pb-2", compact && "py-3 px-4")}>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  {tip.title || "Tip"}
                </CardTitle>
                {tip.dismissible !== false && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mr-2 -mt-1 text-muted-foreground hover:text-foreground"
                    onClick={handleDismiss}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Dismiss tip</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className={cn(compact && "py-2 px-4")}>
              <p className="text-sm text-muted-foreground mb-3">
                {tip.content}
              </p>
              {tip.action && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild={!!tip.action.href}
                  className="mt-1"
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
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
