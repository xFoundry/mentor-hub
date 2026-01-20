"use client";

/**
 * Chat input component with send button, memory toggle, and keyboard shortcuts.
 */

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Send, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  useMemory?: boolean;
  onUseMemoryChange?: (useMemory: boolean) => void;
  enterToSend?: boolean;
  variant?: "default" | "cowork";
  toolToggles?: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: ReactNode;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }>;
}

export function ChatInput({
  onSend,
  disabled,
  isStreaming,
  useMemory = false,
  onUseMemoryChange,
  enterToSend = false,
  variant = "default",
  toolToggles = [],
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled || isStreaming) return;
    onSend(input.trim());
    setInput("");
    // Reset height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check native event for IME composition
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (enterToSend) {
      if (e.key === "Enter" && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
      return;
    }

    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={variant === "cowork" ? "bg-transparent p-6 pt-4" : "border-t bg-background p-4"}>
      {/* Toggles row */}
      <div
        className={
          variant === "cowork"
            ? "mb-3 flex flex-wrap items-center justify-between gap-3 rounded-full border bg-card/70 px-4 py-2 text-xs shadow-sm backdrop-blur"
            : "mb-2 flex flex-wrap items-center justify-between gap-2"
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          {toolToggles.map((toggle) => (
            <TooltipProvider key={toggle.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    {toggle.icon}
                    <span className="text-xs text-muted-foreground">{toggle.label}</span>
                    <Switch
                      checked={toggle.checked}
                      onCheckedChange={toggle.onCheckedChange}
                      disabled={disabled || isStreaming}
                    />
                  </div>
                </TooltipTrigger>
                {toggle.description && (
                  <TooltipContent side="top">
                    <p>{toggle.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Brain className={`h-4 w-4 ${useMemory ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">Memory</span>
                <Switch
                  checked={useMemory}
                  onCheckedChange={onUseMemoryChange}
                  disabled={disabled || isStreaming}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>When enabled, the AI will search your personal memory for relevant context</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Input row */}
      <div
        className={
          variant === "cowork"
            ? "flex flex-col gap-3 rounded-2xl border bg-card/80 p-3 shadow-sm backdrop-blur"
            : "flex gap-2"
        }
      >
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              enterToSend
                ? "Type your message... (Enter to send, Cmd+Enter for new line)"
                : "Type your message... (Cmd+Enter to send)"
            }
            className={
              variant === "cowork"
                ? "min-h-[70px] max-h-[220px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                : "min-h-[60px] max-h-[200px] resize-none"
            }
            disabled={disabled || isStreaming}
          />
          {variant !== "cowork" && (
            <Button
              onClick={handleSend}
              disabled={disabled || isStreaming || !input.trim()}
              className="self-end"
              size="icon"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {variant === "cowork" && (
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Enter to send · Cmd+Enter for new line
            </div>
            <Button
              onClick={handleSend}
              disabled={disabled || isStreaming || !input.trim()}
              className="h-8 rounded-full px-4"
              size="sm"
            >
              {isStreaming ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-2 h-3.5 w-3.5" />
              )}
              Send
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
