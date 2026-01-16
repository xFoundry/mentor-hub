"use client";

import { useMemo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatBlockData } from "@/types/canvas";

type ChatBlockNodeType = Node<ChatBlockData, "chatBlock">;
import { useCanvas } from "@/contexts/canvas-context";
import { Button } from "@/components/ui/button";

export function ChatBlockNode({ data, selected, id }: NodeProps<ChatBlockNodeType>) {
  const { edges, openChatPanel, activeChatBlockId, focusedNodeId } = useCanvas();

  const messageCount = data?.messages?.length ?? 0;
  const lastMessage = data?.messages?.[messageCount - 1];
  const lastPreview = lastMessage?.content
    ? lastMessage.content.replace(/\s+/g, " ").slice(0, 120)
    : "";
  const lastTimestamp = lastMessage?.timestamp;
  const artifactCount = useMemo(
    () => edges.filter((edge) => edge.source === id).length,
    [edges, id]
  );
  const isActive = activeChatBlockId === id;

  const isFocused = focusedNodeId === id;

  return (
    <div
      className={cn(
        "flex w-[320px] flex-col rounded-2xl border bg-card px-4 py-4 shadow-sm transition-shadow",
        selected && "ring-2 ring-primary/40",
        isFocused && "shadow-lg ring-2 ring-primary/30"
      )}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold">
              {data?.title ?? "Chat Block"}
            </div>
            <div className="text-xs text-muted-foreground">
              {data?.description ?? "Pinned chat context for this canvas."}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant={isActive ? "default" : "outline"}
          size="sm"
          className="nodrag h-8"
          onClick={() => openChatPanel(id)}
        >
          {isActive ? "Active" : "Open chat"}
        </Button>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
        {messageCount === 0 ? (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            No messages yet. Open chat to start.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
              Latest
            </div>
            <div className="text-sm text-foreground">
              {lastPreview || "Assistant response in progress..."}
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground/70">
              <span>{messageCount} messages</span>
              <span>{artifactCount} linked items</span>
              {lastTimestamp ? (
                <span>Last active: {new Date(lastTimestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric" })}</span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
