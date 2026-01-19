"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MousePointerClick,
  Plus,
  Move,
  MessageSquare,
  FolderOpen,
  Keyboard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ONBOARDING_DISMISSED_KEY = "map_onboarding_dismissed";

interface MapOnboardingProps {
  hasTiles: boolean;
  forceShow?: boolean;
  onClose?: () => void;
}

export function MapOnboarding({ hasTiles, forceShow, onClose }: MapOnboardingProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const wasDismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true";
      setDismissed(wasDismissed);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    }
    onClose?.();
  }, [onClose]);

  // Show if forced, or if not dismissed and no tiles yet
  const shouldShow = forceShow || (!dismissed && !hasTiles);
  if (!shouldShow) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
      <div className="pointer-events-auto bg-card/95 backdrop-blur-md border rounded-2xl shadow-xl max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center border-b bg-gradient-to-b from-primary/5 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 text-muted-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground">
            Welcome to the Map
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your workspace for organizing AI-assisted research
          </p>
        </div>

        {/* Tips */}
        <div className="p-6 space-y-4">
          <OnboardingTip
            icon={<MousePointerClick className="h-4 w-4" />}
            title="Click empty hexagons"
            description="Click any empty hex to create a new tile for organizing work"
          />
          <OnboardingTip
            icon={<MessageSquare className="h-4 w-4" />}
            title="Chat with AI"
            description="Select a tile to open the chat sidebar and start a conversation"
          />
          <OnboardingTip
            icon={<FolderOpen className="h-4 w-4" />}
            title="Double-click to expand"
            description="Double-click a tile to see all files and artifacts inside"
          />
          <OnboardingTip
            icon={<Move className="h-4 w-4" />}
            title="Drag to organize"
            description="Drag tiles to rearrange. Adjacent tiles share context"
          />
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5" />
            <span>Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">N</kbd> for new tile</span>
          </div>
          <Button size="sm" onClick={handleDismiss}>
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}

interface OnboardingTipProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function OnboardingTip({ icon, title, description }: OnboardingTipProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

/**
 * Floating tips that appear contextually
 */
export function MapFloatingTip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 flex items-center gap-2",
        "rounded-lg bg-card/95 backdrop-blur-sm border px-3 py-2 shadow-lg",
        "text-xs text-muted-foreground",
        "animate-in fade-in slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Empty state shown when hovering an empty hex
 */
export function MapEmptyHexTip() {
  return (
    <div className="flex items-center gap-1.5">
      <Plus className="h-3.5 w-3.5 text-primary" />
      <span>Click to create tile</span>
    </div>
  );
}
