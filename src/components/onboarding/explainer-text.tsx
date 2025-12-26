"use client";

import { useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { useOnboarding } from "@/contexts/onboarding-context";
import type { TipDefinition, OnboardingUserType } from "@/types/onboarding";
import { cn } from "@/lib/utils";

interface ExplainerTextProps {
  /** The tip definition to display */
  tip: TipDefinition;
  /** Current user type for visibility check */
  userType: OnboardingUserType;
  /** Additional className */
  className?: string;
  /** Show icon prefix (default: true) */
  showIcon?: boolean;
}

/**
 * ExplainerText - Simple inline explanatory text component
 *
 * Displays tips as inline text with an optional help icon.
 * Perfect for form field explanations and inline guidance.
 */
export function ExplainerText({
  tip,
  userType,
  className,
  showIcon = true,
}: ExplainerTextProps) {
  const { shouldShowTip, recordTipView } = useOnboarding();

  const visible = shouldShowTip(tip, userType);

  // Record view on mount
  useEffect(() => {
    if (visible) {
      recordTipView(tip.id);
    }
  }, [visible, tip.id, recordTipView]);

  // Don't render if not visible
  if (!visible) return null;

  return (
    <p
      className={cn(
        "text-sm text-muted-foreground flex items-start gap-1.5",
        className
      )}
    >
      {showIcon && (
        <HelpCircle className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
      )}
      <span>{tip.content}</span>
    </p>
  );
}
