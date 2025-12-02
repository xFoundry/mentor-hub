"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";

interface RatingInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function RatingInput({
  value,
  onChange,
  label,
  description,
  disabled = false,
}: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | undefined>();

  // Use hover value if hovering, otherwise use the selected value
  const displayValue = hoverValue ?? value;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div
        className="flex gap-1"
        onMouseLeave={() => setHoverValue(undefined)}
      >
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onChange(rating)}
            onMouseEnter={() => !disabled && setHoverValue(rating)}
            className={`p-1 transition-colors ${
              displayValue && displayValue >= rating
                ? "text-yellow-500"
                : "text-muted-foreground"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <Star
              className="h-6 w-6"
              fill={displayValue && displayValue >= rating ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {value ? `${value}/5` : "Click to rate"}
      </p>
    </div>
  );
}
