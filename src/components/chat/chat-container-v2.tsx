"use client";

/**
 * Chat container for v2 (LangGraph backend).
 * Uses the same UI as the original but connects to orchestrator-langgraph.
 */

import { useState } from "react";
import { RotateCcw, Plus, AlertCircle, Bot, Sparkles, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatV2 } from "@/hooks/use-chat-v2";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ChatAgentTrace } from "./chat-agent-trace";
import type { UserContext } from "@/types/chat";

interface ChatContainerV2Props {
  userContext?: UserContext;
}

export function ChatContainerV2({ userContext }: ChatContainerV2Props) {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const firecrawlEnabled = selectedTools.includes("firecrawl");

  const { session, sendMessage, clearChat, newChat, useMemory, setUseMemory } = useChatV2({
    userContext,
    selectedTools,
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Bot className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">AI Research Assistant</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="gap-1 text-[10px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <Zap className="h-2.5 w-2.5" />
                      LangGraph
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <p className="text-xs">
                      Powered by LangGraph with multiple specialized research agents
                      working in parallel for comprehensive answers.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="gap-1 text-[10px] h-5">
                      <Sparkles className="h-2.5 w-2.5" />
                      Multi-Agent
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <p className="text-xs">
                      5 specialized sub-agents: Entity Researcher, Text Researcher,
                      Summary Researcher, Deep Reasoning, and Mentor Matcher.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">
              {session.threadId
                ? `Session: ${session.threadId.slice(0, 8)}...`
                : "New conversation"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  disabled={session.messages.length === 0}
                  className="h-8"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:ml-1.5">Clear</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear messages (keep session)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={newChat} className="h-8">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:ml-1.5">New</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start new conversation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Error alert */}
      {session.error && (
        <Alert variant="destructive" className="mx-4 mt-4 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{session.error}</AlertDescription>
        </Alert>
      )}

      {/* Main content area */}
      <div className="flex min-h-0 flex-1">
        {/* Messages area */}
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatMessages
            messages={session.messages}
            isStreaming={session.isStreaming}
          />
          <ChatInput
            onSend={sendMessage}
            isStreaming={session.isStreaming}
            useMemory={useMemory}
            onUseMemoryChange={setUseMemory}
            toolToggles={[
              {
                id: "firecrawl",
                label: "Firecrawl",
                description: "Force web search/scrape via your Firecrawl instance",
                icon: (
                  <Globe
                    className={`h-4 w-4 ${
                      firecrawlEnabled ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                ),
                checked: firecrawlEnabled,
                onCheckedChange: (checked) => {
                  setSelectedTools((prev) =>
                    checked
                      ? Array.from(new Set([...prev, "firecrawl"]))
                      : prev.filter((tool) => tool !== "firecrawl")
                  );
                },
              },
            ]}
          />
        </div>

        {/* Agent trace sidebar - hidden on mobile */}
        <div className="hidden lg:block border-l bg-muted/10 p-2">
          <ChatAgentTrace
            traces={session.traces}
            isStreaming={session.isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
