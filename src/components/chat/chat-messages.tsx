"use client";

/**
 * Chat messages list component with auto-scroll.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  Calendar,
  ArrowDown,
  FileText,
  Folder,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ChatMessage as ChatMessageType,
  ArtifactData,
  ClarificationPayload,
  ClarificationResponse,
} from "@/types/chat";
import { ChatMessage } from "./chat-message";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  isStreaming?: boolean;
  variant?: "default" | "cowork";
  onQuickPrompt?: (prompt: string) => void;
  onClarificationSubmit?: (
    messageId: string,
    clarification: ClarificationPayload,
    response: ClarificationResponse
  ) => void;
  onArtifactOpen?: (artifact: ArtifactData) => void;
}

const QUICK_PROMPTS = [
  { label: "Create a file", prompt: "Draft a one-page project outline.", icon: FileText },
  { label: "Crunch data", prompt: "Summarize the latest mentor sessions into insights.", icon: BarChart3 },
  { label: "Make a prototype", prompt: "Outline a mentor-matching prototype flow.", icon: LayoutDashboard },
  { label: "Organize files", prompt: "List the documents we should keep for this cohort.", icon: Folder },
  { label: "Prep for a meeting", prompt: "Prepare an agenda for next week's mentor sync.", icon: Calendar },
  { label: "Draft a message", prompt: "Write a friendly update to the mentor group.", icon: Mail },
];

export function ChatMessages({
  messages,
  isStreaming,
  variant = "default",
  onQuickPrompt,
  onClarificationSubmit,
  onArtifactOpen,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const updateIsAtBottom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const threshold = 96;
    const distance =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const atBottom = distance <= threshold;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      scrollRef.current?.scrollIntoView({ behavior });
      isAtBottomRef.current = true;
      setIsAtBottom(true);
    },
    []
  );

  useEffect(() => {
    if (!scrollAreaRef.current) return;
    const viewport = scrollAreaRef.current.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLDivElement | null;
    if (!viewport) return;

    viewportRef.current = viewport;
    updateIsAtBottom();

    viewport.addEventListener("scroll", updateIsAtBottom, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", updateIsAtBottom);
    };
  }, [updateIsAtBottom]);

  // Auto-scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    scrollToBottom(isStreaming ? "auto" : "smooth");
  }, [messages, isStreaming, scrollToBottom]);

  if (messages.length === 0) {
    if (variant === "cowork") {
      return (
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Cowork is an early research preview. New improvements ship frequently.
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">
              Let&apos;s knock something off your list
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Start with a task and I&apos;ll build the plan, pull context, and draft the output.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onQuickPrompt?.(item.prompt)}
                  className="group flex items-center gap-3 rounded-xl border bg-card/70 px-4 py-3 text-left text-sm shadow-sm transition hover:border-emerald-500/40 hover:bg-emerald-500/5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 transition group-hover:bg-emerald-500/20">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

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
    <div className={cn("relative h-0 flex-1")}>
      <div ref={scrollAreaRef} className="h-full">
        <ScrollArea
          className={cn(
            "h-full",
            variant === "cowork" ? "px-6" : "px-4"
          )}
        >
          <div className={cn(
            "space-y-1 py-4",
            variant === "cowork" && "pb-56 mx-auto max-w-4xl"
          )}>
            {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onClarificationSubmit={onClarificationSubmit}
            onArtifactOpen={onArtifactOpen}
          />
        ))}
            {/* Scroll anchor */}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {!isAtBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className={cn(
            "absolute z-30 inline-flex items-center gap-2 rounded-full border bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur transition hover:bg-card",
            variant === "cowork" ? "bottom-28 right-8" : "bottom-4 right-4"
          )}
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Jump to latest
        </button>
      )}
    </div>
  );
}
