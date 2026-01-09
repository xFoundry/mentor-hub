"use client";

/**
 * Chat messages list component with auto-scroll.
 */

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { ChatMessage } from "./chat-message";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  isStreaming?: boolean;
}

export function ChatMessages({ messages, isStreaming }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Start a conversation</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Ask questions about mentorship data, feedback, sessions, or any
            information in the knowledge base.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-0 flex-1 px-4">
      <div className="space-y-1 py-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
