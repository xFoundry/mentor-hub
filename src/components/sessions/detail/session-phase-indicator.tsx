"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Timer,
  Radio,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionPhase } from "@/hooks/use-session-phase";
import { SESSION_PHASE_CONFIG } from "@/hooks/use-session-phase";

interface SessionPhaseIndicatorProps {
  phase: SessionPhase;
  timeUntilStart?: string | null;
  timeSinceEnd?: string | null;
  minutesUntilStart?: number | null;
  isStartingSoon?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show detailed info in tooltip */
  showTooltip?: boolean;
  /** Show countdown for starting soon */
  showCountdown?: boolean;
  /** Additional className */
  className?: string;
}

const PHASE_ICONS: Record<SessionPhase, React.ElementType> = {
  upcoming: CalendarClock,
  "starting-soon": Timer,
  during: Radio,
  completed: CheckCircle2,
  cancelled: XCircle,
  "no-show": AlertCircle,
};

const SIZE_CLASSES = {
  sm: {
    badge: "text-xs px-2 py-0.5",
    icon: "h-3 w-3",
    dot: "h-1.5 w-1.5",
  },
  md: {
    badge: "text-sm px-2.5 py-1",
    icon: "h-4 w-4",
    dot: "h-2 w-2",
  },
  lg: {
    badge: "text-base px-3 py-1.5",
    icon: "h-5 w-5",
    dot: "h-2.5 w-2.5",
  },
};

/**
 * Visual indicator for session phase with contextual information
 */
export function SessionPhaseIndicator({
  phase,
  timeUntilStart,
  timeSinceEnd,
  minutesUntilStart,
  isStartingSoon,
  size = "md",
  showTooltip = true,
  showCountdown = true,
  className,
}: SessionPhaseIndicatorProps) {
  const config = SESSION_PHASE_CONFIG[phase];
  const Icon = PHASE_ICONS[phase];
  const sizeClasses = SIZE_CLASSES[size];

  // Calculate progress for "during" phase (if we had session duration info)
  const isLive = phase === "during";

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium transition-all",
        sizeClasses.badge,
        config.bgColor,
        config.color,
        config.borderColor,
        // Subtle pulse animation for live sessions
        isLive && "animate-pulse",
        // Slight urgency for starting soon
        phase === "starting-soon" && isStartingSoon && "ring-2 ring-amber-400/30",
        className
      )}
    >
      {/* Animated dot for live sessions */}
      {isLive ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
      ) : (
        <Icon className={sizeClasses.icon} />
      )}

      <span>{config.shortLabel}</span>

      {/* Countdown for starting soon */}
      {showCountdown && phase === "starting-soon" && timeUntilStart && (
        <span className="ml-1 opacity-80">
          · {timeUntilStart}
        </span>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  const tooltipContent = getTooltipContent(phase, timeUntilStart, timeSinceEnd);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          className={cn(
            "max-w-xs bg-popover dark:bg-popover",
            config.borderColor,
            config.color
          )}
        >
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs opacity-80">{tooltipContent}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getTooltipContent(
  phase: SessionPhase,
  timeUntilStart?: string | null,
  timeSinceEnd?: string | null
): string {
  switch (phase) {
    case "upcoming":
      return timeUntilStart
        ? `This session starts in ${timeUntilStart}`
        : "This session is scheduled for the future";
    case "starting-soon":
      return timeUntilStart
        ? `Starting in ${timeUntilStart} — time to prepare!`
        : "This session is starting very soon";
    case "during":
      return "This session is currently in progress";
    case "completed":
      return timeSinceEnd
        ? `This session ended ${timeSinceEnd}`
        : "This session has been completed";
    case "cancelled":
      return "This session was cancelled";
    case "no-show":
      return "This session was marked as a no-show";
    default:
      return "";
  }
}

/**
 * Compact phase badge for use in lists/tables
 */
export function SessionPhaseBadge({
  phase,
  className,
}: {
  phase: SessionPhase;
  className?: string;
}) {
  const config = SESSION_PHASE_CONFIG[phase];
  const Icon = PHASE_ICONS[phase];
  const isLive = phase === "during";

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        config.bgColor,
        config.color,
        config.borderColor,
        isLive && "animate-pulse",
        className
      )}
    >
      {isLive ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
        </span>
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {config.shortLabel}
    </Badge>
  );
}

/**
 * Session countdown timer for header display
 */
export function SessionCountdown({
  minutesUntilStart,
  timeUntilStart,
  phase,
  className,
}: {
  minutesUntilStart: number | null;
  timeUntilStart: string | null;
  phase: SessionPhase;
  className?: string;
}) {
  if (phase !== "starting-soon" || !minutesUntilStart || !timeUntilStart) {
    return null;
  }

  // Calculate urgency level
  const isUrgent = minutesUntilStart <= 15;
  const isVerySoon = minutesUntilStart <= 30;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isUrgent
          ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
          : isVerySoon
          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
          : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
        className
      )}
    >
      <Clock className={cn("h-4 w-4", isUrgent && "animate-pulse")} />
      <span>
        {isUrgent ? "Starting very soon" : `Starts in ${timeUntilStart}`}
      </span>
    </div>
  );
}

/**
 * Progress bar showing position in session lifecycle
 */
export function SessionLifecycleProgress({
  phase,
  className,
}: {
  phase: SessionPhase;
  className?: string;
}) {
  const progressValue = {
    upcoming: 0,
    "starting-soon": 25,
    during: 50,
    completed: 100,
    cancelled: 0,
    "no-show": 0,
  }[phase];

  const showProgress = phase !== "cancelled" && phase !== "no-show";

  if (!showProgress) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <Progress value={progressValue} className="h-1.5" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Scheduled</span>
        <span>In Progress</span>
        <span>Completed</span>
      </div>
    </div>
  );
}
