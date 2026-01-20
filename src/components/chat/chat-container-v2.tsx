"use client";

/**
 * Chat container for v2 (LangGraph backend).
 * Uses the same UI as the original but connects to orchestrator-langgraph.
 * Features resizable panels for chat and artifact viewer.
 */

import { useState } from "react";
import { RotateCcw, Plus, AlertCircle, Bot, Globe, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useChatV2 } from "@/hooks/use-chat-v2";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ChatAgentTrace } from "./chat-agent-trace";
import { ChatArtifactViewer } from "./chat-artifact-viewer";
import type { UserContext, ArtifactData } from "@/types/chat";
import { cn } from "@/lib/utils";

interface ChatContainerV2Props {
  userContext?: UserContext;
}

export function ChatContainerV2({ userContext }: ChatContainerV2Props) {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactData | null>(null);
  const firecrawlEnabled = selectedTools.includes("firecrawl");

  const {
    session,
    sendMessage,
    submitClarification,
    clearChat,
    newChat,
    useMemory,
    setUseMemory,
  } = useChatV2({
    userContext,
    selectedTools,
  });

  const citationCount = session.messages.reduce(
    (total, message) => total + (message.citations?.length ?? 0),
    0
  );
  const hasAssistantReply = session.messages.some(
    (message) => message.role === "assistant" && !message.isStreaming && message.content
  );
  const hasActivity = session.traces.length > 0;
  const progressStage = session.isStreaming
    ? hasActivity
      ? 1
      : 0
    : hasAssistantReply
    ? 2
    : session.messages.length > 0
    ? 1
    : 0;

  const todoStatusClass = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500";
      case "in_progress":
        return "bg-amber-500";
      default:
        return "bg-muted-foreground/40";
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card/80 shadow-sm">
      <div className="flex min-h-0 flex-1">
        {/* Main content area with resizable panels */}
        {/* Key changes only when panel config changes (artifact open/closed), not on every artifact */}
        <ResizablePanelGroup
          key={selectedArtifact ? "with-artifact" : "chat-only"}
          orientation="horizontal"
          className="flex-1"
        >
          {/* Chat Panel */}
          <ResizablePanel
            id="chat-panel"
            defaultSize={selectedArtifact ? "50%" : "100%"}
            minSize="20%"
            className="relative flex min-h-0 flex-col"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60"
            />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="px-6 py-4">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Bot className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Cowork</p>
                      <p className="text-xs text-muted-foreground">
                        {session.threadId
                          ? `Session: ${session.threadId.slice(0, 8)}...`
                          : "New conversation"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearChat}
                      disabled={session.messages.length === 0}
                      className="h-8 rounded-full"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:ml-1.5">Clear</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={newChat}
                      className="h-8 rounded-full"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:ml-1.5">New task</span>
                    </Button>
                  </div>
                </div>
              </div>
              {session.error && (
                <div className="px-6 mb-4">
                  <Alert variant="destructive" className="mx-auto max-w-4xl rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{session.error}</AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="relative flex min-h-0 flex-1 flex-col">
              <ChatMessages
                messages={session.messages}
                isStreaming={session.isStreaming}
                variant="cowork"
                onQuickPrompt={sendMessage}
                onClarificationSubmit={submitClarification}
                onArtifactOpen={setSelectedArtifact}
              />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background/95 via-background/70 to-transparent"
                  />
                  <div className="pointer-events-auto relative mx-auto w-full max-w-4xl">
                    <ChatInput
                      onSend={sendMessage}
                      isStreaming={session.isStreaming}
                      useMemory={useMemory}
                      onUseMemoryChange={setUseMemory}
                      enterToSend
                      variant="cowork"
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
                </div>
              </div>
            </div>
          </ResizablePanel>

          {selectedArtifact && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                id="artifact-panel"
                defaultSize="50%"
                minSize="20%"
                maxSize="80%"
              >
                <ChatArtifactViewer
                  artifact={selectedArtifact}
                  onClose={() => setSelectedArtifact(null)}
                  onRequestEdit={(instruction) => {
                    const payload = selectedArtifact.payload as { path?: string } | undefined;
                    const path = payload?.path || selectedArtifact.id;
                    sendMessage(`Edit the artifact at ${path}: ${instruction}`);
                    setSelectedArtifact(null);
                  }}
                  onSave={() => {
                    const payload = selectedArtifact.payload as { path?: string } | undefined;
                    const path = payload?.path || selectedArtifact.id;
                    const filename = path.split("/").pop() || "document.md";
                    sendMessage(`Save the artifact at ${path} permanently to /artifacts/saved/${filename}`);
                    setSelectedArtifact(null);
                  }}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Right sidebar (fixed width) */}
        <aside className="hidden lg:flex w-80 shrink-0 flex-col gap-3 border-l bg-muted/20 p-4">
          <div className="rounded-xl border bg-card/70 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Progress</h3>
              <Badge variant="secondary" className="text-[10px]">
                {session.traces.length} steps
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {[0, 1, 2].map((step) => (
                <span
                  key={`progress-${step}`}
                  className={
                    step <= progressStage
                      ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
                      : "h-2.5 w-2.5 rounded-full border border-muted-foreground/40"
                  }
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Steps will show as the task unfolds.
            </p>
            <div className="mt-4 space-y-2">
              {session.todos.length > 0 ? (
                <>
                  {session.todos.slice(0, 4).map((todo, index) => (
                    <div key={`${todo.id ?? index}`} className="flex items-center gap-2 text-xs">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          todoStatusClass(todo.status)
                        )}
                      />
                      <span className="truncate text-muted-foreground">
                        {todo.activeForm || todo.content}
                      </span>
                    </div>
                  ))}
                  {session.todos.length > 4 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{session.todos.length - 4} more tasks
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No tasks yet.</span>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card/70 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Artifacts</h3>
              {(session.artifacts?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {session.artifacts?.length} docs
                </Badge>
              )}
            </div>
            {(session.artifacts?.length ?? 0) > 0 ? (
              <div className="mt-3 space-y-2">
                {session.artifacts?.map((artifact) => {
                  const payload = artifact.payload as { path?: string; saved?: boolean } | undefined;
                  const isSaved = payload?.saved || artifact.id.includes("/saved/");
                  const isSelected = selectedArtifact?.id === artifact.id;
                  return (
                    <button
                      key={artifact.id}
                      onClick={() => setSelectedArtifact(isSelected ? null : artifact)}
                      className={cn(
                        "w-full text-left rounded-lg border p-2 transition-colors",
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isSaved ? (
                          <Save className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs font-medium truncate">
                          {artifact.title}
                        </span>
                      </div>
                      {artifact.summary && (
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                          {artifact.summary}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  Documents created during the task will appear here.
                </p>
                {citationCount > 0 && (
                  <div className="mt-3 text-xs">
                    <span className="font-medium">{citationCount} source links</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-xl border bg-card/70 p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Context</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Track the tools and memory in use as the agent works.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={useMemory ? "default" : "secondary"} className="text-[10px]">
                Memory {useMemory ? "On" : "Off"}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                Firecrawl {firecrawlEnabled ? "On" : "Off"}
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border bg-card/70 p-3 shadow-sm">
            <ChatAgentTrace
              traces={session.traces}
              isStreaming={session.isStreaming}
              variant="cowork"
              title="Activity"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
