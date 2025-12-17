"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface PillOption<T extends string> {
  value: T;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

interface PillSelectorProps<T extends string> {
  value: T | undefined;
  onChange: (value: T) => void;
  options: PillOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function PillSelector<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  icon,
  className,
}: PillSelectorProps<T>) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs font-normal",
            selectedOption?.color,
            className
          )}
        >
          {icon || selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        <div className="flex flex-col gap-0.5">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                value === option.value && "bg-accent"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center",
                  option.color
                )}
              >
                {option.icon}
              </span>
              <span className="flex-1 text-left">{option.label}</span>
              {value === option.value && (
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
