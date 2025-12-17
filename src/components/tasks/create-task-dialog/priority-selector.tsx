"use client";

import { PillSelector, type PillOption } from "./pill-selector";
import { SignalHigh, SignalMedium, SignalLow, AlertTriangle } from "lucide-react";

export type Priority = "Low" | "Medium" | "High" | "Urgent";

const priorityOptions: PillOption<Priority>[] = [
  {
    value: "Urgent",
    label: "Urgent",
    color: "text-red-600",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  {
    value: "High",
    label: "High",
    color: "text-orange-500",
    icon: <SignalHigh className="h-3.5 w-3.5" />,
  },
  {
    value: "Medium",
    label: "Medium",
    color: "text-yellow-500",
    icon: <SignalMedium className="h-3.5 w-3.5" />,
  },
  {
    value: "Low",
    label: "Low",
    color: "text-slate-400",
    icon: <SignalLow className="h-3.5 w-3.5" />,
  },
];

interface PrioritySelectorProps {
  value: Priority | undefined;
  onChange: (value: Priority) => void;
  disabled?: boolean;
}

export function PrioritySelector({
  value,
  onChange,
  disabled,
}: PrioritySelectorProps) {
  const selectedOption = priorityOptions.find((opt) => opt.value === value);

  return (
    <PillSelector
      value={value}
      onChange={onChange}
      options={priorityOptions}
      placeholder="Priority"
      disabled={disabled}
      icon={selectedOption?.icon}
      className={selectedOption?.color}
    />
  );
}
