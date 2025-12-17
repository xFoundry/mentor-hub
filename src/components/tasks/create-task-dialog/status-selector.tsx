"use client";

import { PillSelector, type PillOption } from "./pill-selector";
import { Circle, PlayCircle, PauseCircle, CheckCircle2 } from "lucide-react";

export type TaskStatus = "Not Started" | "In Progress" | "Blocked" | "Completed";

const statusOptions: PillOption<TaskStatus>[] = [
  {
    value: "Not Started",
    label: "Not Started",
    color: "text-slate-400",
    icon: <Circle className="h-3.5 w-3.5" />,
  },
  {
    value: "In Progress",
    label: "In Progress",
    color: "text-blue-500",
    icon: <PlayCircle className="h-3.5 w-3.5" />,
  },
  {
    value: "Blocked",
    label: "Blocked",
    color: "text-red-500",
    icon: <PauseCircle className="h-3.5 w-3.5" />,
  },
  {
    value: "Completed",
    label: "Completed",
    color: "text-green-500",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
];

interface StatusSelectorProps {
  value: TaskStatus | undefined;
  onChange: (value: TaskStatus) => void;
  disabled?: boolean;
}

export function StatusSelector({
  value,
  onChange,
  disabled,
}: StatusSelectorProps) {
  const selectedOption = statusOptions.find((opt) => opt.value === value);

  return (
    <PillSelector
      value={value}
      onChange={onChange}
      options={statusOptions}
      placeholder="Status"
      disabled={disabled}
      icon={selectedOption?.icon}
      className={selectedOption?.color}
    />
  );
}
