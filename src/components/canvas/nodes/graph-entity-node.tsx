"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { MessageSquare, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphEntityData } from "@/types/canvas";
import { useCanvas } from "@/contexts/canvas-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type GraphNodeType = Node<GraphEntityData, "graphEntity">;

export function GraphEntityNode({ data, selected, id }: NodeProps<GraphNodeType>) {
  const { focusedNodeId, openChatPanel } = useCanvas();
  const isFocused = focusedNodeId === id;
  const origin = data?.origin as { tool_name?: string; query?: string; chat_block_id?: string } | undefined;
  const toolLabel = origin?.tool_name ? "Graph" : null;
  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[260px] rounded-xl border bg-card px-4 py-3 shadow-sm transition-shadow",
        selected && "ring-2 ring-primary/40",
        isFocused && "shadow-lg ring-2 ring-primary/30"
      )}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-600">
            <Network className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold">
              {data?.title ?? "Graph Node"}
            </div>
            {data?.entityType ? (
              <div className="text-xs text-muted-foreground">{data.entityType}</div>
            ) : null}
            {data?.description ? (
              <div className="text-xs text-muted-foreground line-clamp-3">
                {data.description}
              </div>
            ) : null}
            {data?.sourceNumber ? (
              <div className="text-[11px] text-muted-foreground/70">
                Source #{data.sourceNumber}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {toolLabel ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-default">
                  {toolLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs text-xs">
                  {origin?.query ? `Query: ${origin.query}` : "Graph result"}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : null}
          {origin?.chat_block_id ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openChatPanel(origin.chat_block_id)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
