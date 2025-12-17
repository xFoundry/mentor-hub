"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, X } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DueDatePickerProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export function DueDatePicker({
  value,
  onChange,
  disabled,
}: DueDatePickerProps) {
  const [open, setOpen] = useState(false);

  const date = value ? parseISO(value) : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(format(selectedDate, "yyyy-MM-dd"));
    } else {
      onChange(undefined);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {date ? format(date, "MMM d") : "Due date"}
          {value && (
            <span
              role="button"
              onClick={handleClear}
              className="ml-0.5 rounded-sm hover:bg-accent"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
