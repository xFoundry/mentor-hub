"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TaskDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TaskDescriptionInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Add description...",
  className,
}: TaskDescriptionInputProps) {
  const [isExpanded, setIsExpanded] = React.useState(!!value);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  // Expand when user starts typing
  const handleExpand = () => {
    setIsExpanded(true);
    // Focus textarea after expanding
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <ChevronRight className="h-4 w-4" />
        <span>{placeholder}</span>
      </button>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <button
        type="button"
        onClick={() => !value && setIsExpanded(false)}
        disabled={disabled}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed"
      >
        <ChevronDown className="h-4 w-4" />
        <span>Description</span>
      </button>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Add more details..."
        rows={2}
        className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px]"
      />
    </div>
  );
}
