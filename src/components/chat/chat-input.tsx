"use client";

/**
 * Chat input component with send button, memory toggle, and keyboard shortcuts.
 */

import { useState, useRef, useEffect } from "react";
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
}

export function ChatInput({
  onSend,
  disabled,
  isStreaming,
  useMemory = false,
  onUseMemoryChange,
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
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      {/* Memory toggle row */}
      <div className="mb-2 flex items-center justify-end gap-2">
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
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Cmd+Enter to send)"
          className="min-h-[60px] max-h-[200px] resize-none"
          disabled={disabled || isStreaming}
        />
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
      </div>
    </div>
  );
}
