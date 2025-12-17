"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TaskNameInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const TaskNameInput = React.forwardRef<HTMLInputElement, TaskNameInputProps>(
  (
    {
      value,
      onChange,
      autoFocus = true,
      disabled = false,
      placeholder = "Task name",
      className,
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "w-full bg-transparent text-lg font-medium placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    );
  }
);

TaskNameInput.displayName = "TaskNameInput";
