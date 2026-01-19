"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Trash2,
  MoreHorizontal,
  FolderOpen,
  Maximize2,
  Minimize2,
  Globe,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChatMessage,
  ChatMessageAvatar,
  ChatMessageAvatarAssistantIcon,
  ChatMessageAvatarUserIcon,
  ChatMessageContainer,
  ChatMessageContent,
  ChatMessageHeader,
  ChatMessageMarkdown,
  ChatMessageTimestamp,
} from "@/components/simple-ai/chat-message";
import {
  ChatMessageArea,
  ChatMessageAreaContent,
  ChatMessageAreaScrollButton,
} from "@/components/simple-ai/chat-message-area";
import {
  ChatInput,
  ChatInputEditor,
  ChatInputGroupAddon,
  ChatInputSubmitButton,
  useChatInput,
} from "@/components/simple-ai/chat-input";
import { ChatToolSteps } from "@/components/chat/chat-tool-steps";
import { useMap } from "@/contexts/map-context";
import { useMapChat } from "@/hooks/use-map-chat";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import type { UserContext as ChatUserContext } from "@/types/chat";
import { STATUS_LABELS } from "@/types/map";

interface MapSidebarProps {
  canvasId: string;
}

export function MapSidebar({ canvasId }: MapSidebarProps) {
  const {
    tiles,
    activeTileId,
    setActiveTileId,
    setExpandedTileId,
    sidebarMode,
    setSidebarMode,
    clearMessages,
    updateTile,
  } = useMap();

  const { userContext } = useEffectiveUser();

  // Active tile
  const activeTile = useMemo(
    () => tiles.find((t) => t.id === activeTileId),
    [tiles, activeTileId]
  );

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Start renaming
  const handleStartRename = useCallback(() => {
    if (activeTile) {
      setRenameValue(activeTile.title);
      setIsRenaming(true);
    }
  }, [activeTile]);

  // Confirm rename
  const handleConfirmRename = useCallback(() => {
    if (activeTileId && renameValue.trim()) {
      updateTile(activeTileId, { title: renameValue.trim() });
    }
    setIsRenaming(false);
  }, [activeTileId, renameValue, updateTile]);

  // Cancel rename
  const handleCancelRename = useCallback(() => {
    setIsRenaming(false);
    setRenameValue("");
  }, []);

  // Build chat user context
  const chatUserContext: ChatUserContext | undefined = useMemo(() => {
    if (!userContext) return undefined;
    return {
      name: userContext.fullName || userContext.name,
      email: userContext.email,
      role:
        userContext.type === "staff"
          ? "Staff"
          : userContext.type === "mentor"
          ? "Mentor"
          : userContext.type === "student"
          ? "Participant"
          : undefined,
      cohort: userContext.cohort?.shortName,
      auth0_id: userContext.auth0Id,
    };
  }, [userContext]);

  // Chat hook
  const {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    retry,
    hasError,
  } = useMapChat({
    tileId: activeTileId ?? "",
    canvasId,
    userContext: chatUserContext,
  });

  // Input handling
  const { value, onChange, handleSubmit, parsed } = useChatInput({
    onSubmit: (parsedValue) => {
      if (activeTileId) {
        sendMessage(parsedValue.content);
      }
    },
  });

  // Handle clear chat
  const handleClearChat = useCallback(() => {
    if (!activeTileId) return;
    if (isStreaming) {
      stopStreaming();
    }
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Clear this chat? This cannot be undone."
      );
      if (!confirmed) return;
    }
    clearMessages(activeTileId);
  }, [activeTileId, isStreaming, stopStreaming, clearMessages]);

  // Handle open workspace
  const handleOpenWorkspace = useCallback(() => {
    if (activeTileId) {
      setExpandedTileId(activeTileId);
      setSidebarMode("hidden");
    }
  }, [activeTileId, setExpandedTileId, setSidebarMode]);

  // Sidebar widths
  const sidebarWidth =
    sidebarMode === "full"
      ? "w-[66.67vw]"
      : sidebarMode === "expanded"
      ? "w-[360px]"
      : sidebarMode === "collapsed"
      ? "w-12"
      : "w-0";

  const isExpanded = sidebarMode === "expanded" || sidebarMode === "full";
  const isFull = sidebarMode === "full";
  const isHidden = sidebarMode === "hidden";
  const selectedTools = activeTile?.selectedTools ?? [];
  const firecrawlEnabled = selectedTools.includes("firecrawl");

  if (isHidden) return null;

  return (
    <aside
      className={cn(
        "h-full shrink-0 border-l backdrop-blur-xl transition-[width,background-color] duration-300 ease-out overflow-hidden",
        sidebarWidth,
        isFull ? "bg-card/60 max-w-[900px]" : "bg-card/95"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded-full bg-primary/10 p-2 text-primary shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            {isExpanded && activeTile && (
              <div className="min-w-0 flex-1">
                {isRenaming ? (
                  <Input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleConfirmRename();
                      } else if (e.key === "Escape") {
                        handleCancelRename();
                      }
                    }}
                    onBlur={handleConfirmRename}
                    className="h-7 text-sm font-semibold"
                    placeholder="Tile name..."
                  />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleStartRename}
                        className="group flex items-center gap-1.5 text-left"
                      >
                        <span className="text-sm font-semibold truncate max-w-[140px]">
                          {activeTile.title}
                        </span>
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Click to rename</TooltipContent>
                  </Tooltip>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      activeTile.status === "thinking" && "animate-pulse",
                      activeTile.status === "researching" && "animate-pulse",
                      activeTile.status === "drafting" && "animate-pulse"
                    )}
                  >
                    {STATUS_LABELS[activeTile.status]}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isExpanded && (
              <>
                {hasError && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={retry}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Retry last message</TooltipContent>
                  </Tooltip>
                )}

                {/* Full mode toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setSidebarMode(isFull ? "expanded" : "full")
                      }
                    >
                      {isFull ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isFull ? "Shrink sidebar" : "Expand to full width"}
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>More options</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleStartRename}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename tile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenWorkspace}>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Open workspace
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleClearChat}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setSidebarMode(isExpanded ? "collapsed" : "expanded")
                  }
                >
                  {isExpanded ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isExpanded ? "Collapse sidebar" : "Expand sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {isExpanded ? (
          <>
            {/* Tile tabs */}
            {tiles.length > 1 && (
              <div className="border-b px-3 py-2">
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {tiles.map((tile) => (
                    <Button
                      key={tile.id}
                      variant={tile.id === activeTileId ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-7 shrink-0 text-xs",
                        tile.id !== activeTileId &&
                          "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setActiveTileId(tile.id)}
                    >
                      {tile.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className={cn(
              "flex-1 min-h-0 flex flex-col pb-2 pt-3",
              isFull ? "px-6" : "px-2"
            )}>
              <ChatMessageArea className="nodrag nowheel cursor-default h-full flex-1">
                <ChatMessageAreaContent className={cn(
                  "cursor-default min-h-full",
                  isFull && "max-w-4xl" // Wider content in full mode
                )}>
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground p-6">
                      <div className="rounded-full bg-primary/10 p-4">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <div className="font-semibold text-foreground text-base">
                          Start a conversation
                        </div>
                        <div className="text-xs max-w-[220px]">
                          Ask questions to research topics, generate content, or analyze data. The AI will create files and artifacts as you work.
                        </div>
                      </div>
                      <div className="mt-2 space-y-1.5 text-[11px] text-muted-foreground/80">
                        <div>Try asking:</div>
                        <div className="space-y-1">
                          <div className="bg-muted/50 rounded px-2 py-1 text-left">
                            &ldquo;Research the latest trends in...&rdquo;
                          </div>
                          <div className="bg-muted/50 rounded px-2 py-1 text-left">
                            &ldquo;Create a summary of...&rdquo;
                          </div>
                          <div className="bg-muted/50 rounded px-2 py-1 text-left">
                            &ldquo;Help me outline a plan for...&rdquo;
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <ChatMessage key={message.id}>
                        <ChatMessageAvatar>
                          {message.role === "user" ? (
                            <ChatMessageAvatarUserIcon />
                          ) : (
                            <ChatMessageAvatarAssistantIcon />
                          )}
                        </ChatMessageAvatar>
                        <ChatMessageContainer>
                          <ChatMessageHeader>
                            <span className="text-sm font-medium">
                              {message.role === "user" ? "You" : "Assistant"}
                            </span>
                            <ChatMessageTimestamp createdAt={message.timestamp} />
                          </ChatMessageHeader>
                          <ChatMessageContent>
                            {message.role === "assistant" && (
                              <ChatToolSteps
                                steps={message.steps ?? []}
                                isStreaming={message.isStreaming}
                              />
                            )}
                            {message.content.trim().length > 0 ? (
                              <ChatMessageMarkdown content={message.content} />
                            ) : null}
                          </ChatMessageContent>
                        </ChatMessageContainer>
                      </ChatMessage>
                    ))
                  )}
                </ChatMessageAreaContent>
                <ChatMessageAreaScrollButton alignment="right" />
              </ChatMessageArea>
            </div>

            {/* Input */}
            <div className={cn(
              "border-t nodrag nowheel",
              isFull ? "p-4 px-6" : "p-3"
            )}>
              <div className={cn(isFull && "max-w-4xl mx-auto")}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Globe
                            className={`h-4 w-4 ${
                              firecrawlEnabled ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span className="text-xs text-muted-foreground">Firecrawl</span>
                          <Switch
                            checked={firecrawlEnabled}
                            onCheckedChange={(checked) => {
                              if (!activeTileId) return;
                              updateTile(activeTileId, {
                                selectedTools: checked
                                  ? Array.from(new Set([...selectedTools, "firecrawl"]))
                                  : selectedTools.filter((tool) => tool !== "firecrawl"),
                              });
                            }}
                            disabled={!activeTileId || isStreaming}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Force web search/scrape via Firecrawl</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <ChatInput
                  onSubmit={handleSubmit}
                  isStreaming={isStreaming}
                  onStop={stopStreaming}
                >
                  <ChatInputEditor
                    value={value}
                    onChange={onChange}
                    placeholder="Ask a question..."
                    className="cursor-text"
                    onEnter={() => {
                      if (!isStreaming && parsed.content.trim()) {
                        handleSubmit();
                      }
                    }}
                  />
                  <ChatInputGroupAddon align="inline-end">
                    <ChatInputSubmitButton
                      isStreaming={isStreaming}
                      disabled={!parsed.content.trim()}
                    />
                  </ChatInputGroupAddon>
                </ChatInput>
              </div>
            </div>
          </>
        ) : (
          // Collapsed view
          <div className="flex flex-1 flex-col items-center gap-2 py-4">
            {tiles.slice(0, 5).map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => {
                  setActiveTileId(tile.id);
                  setSidebarMode("expanded");
                }}
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors",
                  tile.id === activeTileId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                title={tile.title}
              >
                {tile.title.charAt(0).toUpperCase()}
              </button>
            ))}
            {tiles.length > 5 && (
              <div className="text-[10px] text-muted-foreground">
                +{tiles.length - 5}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
