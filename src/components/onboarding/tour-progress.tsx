import { cn } from "@/lib/utils";

interface TourProgressProps {
  /** Current step index (0-based) */
  current: number;
  /** Total number of steps */
  total: number;
  /** Additional className */
  className?: string;
}

/**
 * TourProgress - Dot indicator showing tour progress
 *
 * Displays a row of dots indicating the current step in a tour.
 * Active dot is wider, completed dots have reduced opacity.
 */
export function TourProgress({ current, total, className }: TourProgressProps) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-200",
            i === current
              ? "w-4 bg-primary"
              : i < current
              ? "w-1.5 bg-primary/50"
              : "w-1.5 bg-muted"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
