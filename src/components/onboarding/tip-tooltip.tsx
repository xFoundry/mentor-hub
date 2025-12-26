"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnboarding } from "@/contexts/onboarding-context";
import type { TipDefinition, TipPlacement, OnboardingUserType } from "@/types/onboarding";
import { cn } from "@/lib/utils";

interface TipTooltipProps {
  /** The tip definition to display */
  tip: TipDefinition;
  /** Current user type for visibility check */
  userType: OnboardingUserType;
  /** Custom trigger element (defaults to info icon) */
  children?: React.ReactNode;
  /** Placement relative to trigger */
  placement?: TipPlacement;
  /** Additional className for trigger */
  className?: string;
}

/**
 * TipTooltip - A lightweight hover tooltip tip component
 *
 * Renders an info icon (or custom trigger) with a tooltip.
 * Perfect for field-level hints and quick explanations.
 */
export function TipTooltip({
  tip,
  userType,
  children,
  placement = "top",
  className,
}: TipTooltipProps) {
  const { shouldShowTip, recordTipView } = useOnboarding();

  // Don't render if not visible
  if (!shouldShowTip(tip, userType)) return null;

  // Map TipPlacement to tooltip side
  const mapSide = (p: TipPlacement): "top" | "bottom" | "left" | "right" => {
    if (p.startsWith("top")) return "top";
    if (p.startsWith("bottom")) return "bottom";
    if (p.startsWith("left")) return "left";
    return "right";
  };

  // Map TipPlacement to tooltip align
  const mapAlign = (p: TipPlacement): "start" | "center" | "end" => {
    if (p.endsWith("-start")) return "start";
    if (p.endsWith("-end")) return "end";
    return "center";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("inline-flex items-center cursor-help", className)}
          onMouseEnter={() => recordTipView(tip.id)}
        >
          {children || (
            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={mapSide(placement)}
        align={mapAlign(placement)}
        className="max-w-xs"
      >
        {tip.title && (
          <p className="font-medium text-sm mb-1">{tip.title}</p>
        )}
        <p className="text-xs">{tip.content}</p>
      </TooltipContent>
    </Tooltip>
  );
}
