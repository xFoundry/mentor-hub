"use client";

import { useMemo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ZoneData, ZoneStatus } from "@/types/canvas";
import { useCanvas } from "@/contexts/canvas-context";
import { HEX_HEIGHT, HEX_WIDTH } from "@/lib/hex-grid";

const STATUS_STYLES: Record<ZoneStatus, { label: string; className: string }> = {
  idle: { label: "Idle", className: "bg-muted/60 text-muted-foreground" },
  thinking: { label: "Thinking", className: "bg-sky-500/15 text-sky-600" },
  researching: { label: "Researching", className: "bg-amber-500/15 text-amber-600" },
  drafting: { label: "Drafting", className: "bg-emerald-500/15 text-emerald-600" },
  waiting: { label: "Waiting", className: "bg-indigo-500/15 text-indigo-600" },
  blocked: { label: "Blocked", className: "bg-rose-500/15 text-rose-600" },
  done: { label: "Done", className: "bg-emerald-600/15 text-emerald-700" },
};

type ZoneNodeType = Node<ZoneData, "zone" | "chatBlock">;

export function ZoneHexNode({ data, selected, id }: NodeProps<ZoneNodeType>) {
  const { edges, openChatPanel, activeZoneId, focusedNodeId, territories } = useCanvas();
  const messageCount = data?.messages?.length ?? 0;
  const lastMessage = data?.messages?.[messageCount - 1];
  const lastPreview = lastMessage?.content
    ? lastMessage.content.replace(/\s+/g, " ").slice(0, 64)
    : "";
  const artifactCount = useMemo(
    () => edges.filter((edge) => edge.source === id).length,
    [edges, id]
  );

  const status = data?.status ?? "idle";
  const statusMeta = STATUS_STYLES[status];
  const isActive = activeZoneId === id;
  const isFocused = focusedNodeId === id;
  const projectName = useMemo(() => {
    const match = territories.find((territory) => territory.id === data?.projectId);
    return match?.name ?? "General";
  }, [data?.projectId, territories]);
  const hexPoints = useMemo(() => {
    const w = HEX_WIDTH;
    const h = HEX_HEIGHT;
    const y1 = h * 0.25;
    const y2 = h * 0.75;
    return [
      `${w / 2},0`,
      `${w},${y1}`,
      `${w},${y2}`,
      `${w / 2},${h}`,
      `0,${y2}`,
      `0,${y1}`,
    ].join(" ");
  }, []);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: HEX_WIDTH, height: HEX_HEIGHT }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />

      <button
        type="button"
        onClick={() => openChatPanel(id)}
        className="group relative h-full w-full text-center focus:outline-none"
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${HEX_WIDTH} ${HEX_HEIGHT}`}
          shapeRendering="geometricPrecision"
          aria-hidden
        >
          <polygon
            points={hexPoints}
            fill="var(--card)"
            fillOpacity={0.9}
            stroke="var(--border)"
            strokeOpacity={0.7}
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <polygon
            points={hexPoints}
            fill="var(--card)"
            fillOpacity={0.98}
            stroke="var(--primary)"
            strokeOpacity={0.4}
            strokeWidth={1}
            strokeLinejoin="round"
            className={cn(
              "opacity-0 transition-opacity",
              "group-hover:opacity-100",
              isActive && "opacity-100"
            )}
          />
          {(selected || isFocused) && (
            <polygon
              points={hexPoints}
              fill="none"
              stroke="var(--primary)"
              strokeOpacity={0.65}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
        </svg>
        <div className="absolute inset-[14%] flex flex-col items-center justify-between text-center">
          <div
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              statusMeta.className
            )}
          >
            {statusMeta.label}
          </div>

          <div className="space-y-1">
            <div className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
              {data?.title ?? "Zone"}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {projectName}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{messageCount} msgs</span>
              <span className="text-muted-foreground/60">·</span>
              <span>{artifactCount} items</span>
            </div>
            <div className="text-[10px] text-muted-foreground line-clamp-1">
              {lastPreview || "No activity yet."}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
