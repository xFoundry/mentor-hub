"use client";

import { PillSelector, type PillOption } from "./pill-selector";
import { Gauge } from "lucide-react";

export type LevelOfEffort = "XS" | "S" | "M" | "L" | "XL";

const effortOptions: PillOption<LevelOfEffort>[] = [
  {
    value: "XS",
    label: "XS (< 30 min)",
    color: "text-emerald-500",
  },
  {
    value: "S",
    label: "S (30 min - 1 hr)",
    color: "text-green-500",
  },
  {
    value: "M",
    label: "M (1-4 hrs)",
    color: "text-yellow-500",
  },
  {
    value: "L",
    label: "L (4-8 hrs)",
    color: "text-orange-500",
  },
  {
    value: "XL",
    label: "XL (> 8 hrs)",
    color: "text-red-500",
  },
];

interface EffortSelectorProps {
  value: LevelOfEffort | undefined;
  onChange: (value: LevelOfEffort) => void;
  disabled?: boolean;
}

export function EffortSelector({
  value,
  onChange,
  disabled,
}: EffortSelectorProps) {
  const selectedOption = effortOptions.find((opt) => opt.value === value);

  return (
    <PillSelector
      value={value}
      onChange={onChange}
      options={effortOptions}
      placeholder="Effort"
      disabled={disabled}
      icon={<Gauge className="h-3.5 w-3.5" />}
      className={selectedOption?.color}
    />
  );
}
