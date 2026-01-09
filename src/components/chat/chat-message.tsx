"use client";

/**
 * Individual chat message component.
 * Renders user and assistant messages with different styling.
 */

import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { ChatCitation } from "./chat-citation";
import { ChatToolSteps } from "./chat-tool-steps";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 py-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-secondary" : "bg-primary/10"}>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4 text-primary" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {/* Tool steps (only for assistant messages with steps) */}
        {!isUser && (message.steps?.length || message.isStreaming) && (
          <div className="w-full max-w-[85%]">
            <ChatToolSteps
              steps={message.steps || []}
              isStreaming={message.isStreaming}
            />
          </div>
        )}

        {/* Message bubble - hide if streaming with steps but no content yet */}
        {(message.content || !(message.isStreaming && message.steps?.length)) && (
          <div
            className={cn(
              "max-w-[85%] rounded-lg px-4 py-2",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted",
              // Only pulse if streaming with no content yet and no steps
              message.isStreaming && !message.content && !message.steps?.length && "animate-pulse"
            )}
          >
            {message.content ? (
              isUser ? (
                <div className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )
            ) : (
              <span className={cn("italic text-sm", isUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
                Thinking...
              </span>
            )}
          </div>
        )}

        {/* Citations (only for assistant messages) */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <ChatCitation citations={message.citations} />
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
