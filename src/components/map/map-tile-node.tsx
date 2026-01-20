"use client";

import { memo, useMemo, useEffect, useRef, useCallback, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Check, MessageSquare, FolderOpen, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAP_HEX_WIDTH, MAP_HEX_HEIGHT, useMap } from "@/contexts/map-context";
import type { TileData, TileStatus } from "@/types/map";
import { STATUS_LABELS } from "@/types/map";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Soft, breathable color palette
const STATUS_STYLES: Record<
  TileStatus,
  {
    bgClass: string;
    textClass: string;
    borderClass: string;
    color: string; // Hex color for gradients
    animate?: boolean;
  }
> = {
  idle: {
    bgClass: "bg-slate-50 dark:bg-slate-900/50",
    textClass: "text-slate-500 dark:text-slate-400",
    borderClass: "border-slate-200 dark:border-slate-700",
    color: "#64748b", // slate-500
  },
  thinking: {
    bgClass: "bg-sky-50 dark:bg-sky-900/30",
    textClass: "text-sky-600 dark:text-sky-400",
    borderClass: "border-sky-200 dark:border-sky-800",
    color: "#0284c7", // sky-600
    animate: true,
  },
  researching: {
    bgClass: "bg-amber-50 dark:bg-amber-900/30",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800",
    color: "#d97706", // amber-600
    animate: true,
  },
  drafting: {
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30",
    textClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    color: "#059669", // emerald-600
    animate: true,
  },
  waiting: {
    bgClass: "bg-violet-50 dark:bg-violet-900/30",
    textClass: "text-violet-600 dark:text-violet-400",
    borderClass: "border-violet-200 dark:border-violet-800",
    color: "#7c3aed", // violet-600
  },
  blocked: {
    bgClass: "bg-rose-50 dark:bg-rose-900/30",
    textClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-rose-200 dark:border-rose-800",
    color: "#e11d48", // rose-600
  },
  done: {
    bgClass: "bg-teal-50 dark:bg-teal-900/30",
    textClass: "text-teal-700 dark:text-teal-400",
    borderClass: "border-teal-200 dark:border-teal-800",
    color: "#0f766e", // teal-700
  },
};

// Extended node data with display-time properties
interface MapTileNodeData extends TileData {
  isActive?: boolean;
}

type MapTileNodeType = Node<MapTileNodeData, "tile">;

// Compute a simple status summary without reading messages array deeply
function getSimpleStatusSummary(data: MapTileNodeData): string {
  const { status, artifacts, messages } = data;

  if (status === "thinking" || status === "researching" || status === "drafting") {
    return STATUS_LABELS[status];
  }

  const artifactCount = artifacts?.length ?? 0;
  if (artifactCount > 0) {
    return `${artifactCount} file${artifactCount !== 1 ? "s" : ""}`;
  }

  const messageCount = messages?.length ?? 0;
  if (messageCount > 0) {
    return `${messageCount} msg${messageCount !== 1 ? "s" : ""}`;
  }

  return "No activity";
}

// Pendulum physics constants
const GRAVITY = 0.4;           // Pulls pendulum back to center (like real gravity)
const AIR_RESISTANCE = 0.96;   // Slows down over time (1 = no resistance, lower = more)
const INERTIA_SCALE = 0.08;    // How much horizontal movement affects swing
const MAX_ROTATION = 15;       // Maximum swing angle in degrees
const SETTLE_THRESHOLD = 0.05; // When to stop the settle animation

// Track if tile hover tips have been shown
const TILE_TIPS_SHOWN_KEY = "map_tile_tips_shown";

function MapTileNodeInner({
  data,
  selected,
  dragging,
}: NodeProps<MapTileNodeType>) {
  const { setActiveTileId, setExpandedTileId, deleteTile } = useMap();
  const status: TileStatus = data?.status ?? "idle";
  const statusMeta = STATUS_STYLES[status];
  const isActive = data?.isActive ?? false;
  const statusLabel = STATUS_LABELS[status];
  const statusSummary = data ? getSimpleStatusSummary(data) : "No activity";
  const unreadCount = data?.unreadCount ?? 0;
  const hasUnread = unreadCount > 0 && !isActive;

  // Context menu handlers
  const handleOpenChat = useCallback(() => {
    if (data?.id) {
      setActiveTileId(data.id);
    }
  }, [data, setActiveTileId]);

  const handleOpenWorkspace = useCallback(() => {
    if (data?.id) {
      setExpandedTileId(data.id);
    }
  }, [data, setExpandedTileId]);

  const handleDelete = useCallback(() => {
    if (data?.id) {
      deleteTile(data.id);
    }
  }, [data, deleteTile]);

  // Hover tip state
  const [showHoverTip, setShowHoverTip] = useState(false);
  const [tipsShown, setTipsShown] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(TILE_TIPS_SHOWN_KEY) === "true";
  });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if tips have been shown before (handled in state initializer)

  // Handle hover - show tip after delay (only if tips not yet shown)
  const handleMouseEnter = useCallback(() => {
    if (tipsShown || dragging) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setShowHoverTip(true);
      // Mark tips as shown
      if (typeof window !== "undefined") {
        localStorage.setItem(TILE_TIPS_SHOWN_KEY, "true");
      }
      setTipsShown(true);
    }, 800); // Show after 800ms hover
  }, [tipsShown, dragging]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowHoverTip(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Pendulum swing - use refs to avoid re-renders, apply via DOM
  const nodeRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const velocityRef = useRef(0);
  const rotationRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  // Apply rotation transform directly to DOM to avoid React re-renders
  const applyRotation = useCallback((rot: number) => {
    if (nodeRef.current) {
      const scale = dragging ? 1.05 : (isActive ? 1.02 : 1);
      nodeRef.current.style.transform = `scale(${scale}) rotate(${rot}deg)`;
    }
  }, [dragging, isActive]);

  // Animate pendulum with gravity - runs during drag and settling
  useEffect(() => {
    if (dragging) {
      // Start physics simulation during drag
      const simulate = () => {
        // Apply gravity (pulls toward center, proportional to angle)
        const gravityForce = -rotationRef.current * GRAVITY * 0.1;
        velocityRef.current += gravityForce;

        // Apply air resistance
        velocityRef.current *= AIR_RESISTANCE;

        // Update rotation
        rotationRef.current += velocityRef.current;

        // Clamp rotation
        rotationRef.current = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, rotationRef.current));

        // Apply to DOM
        applyRotation(rotationRef.current);

        animationRef.current = requestAnimationFrame(simulate);
      };

      animationRef.current = requestAnimationFrame(simulate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }

    // Settling animation when drag ends
    lastPositionRef.current = null;

    const settle = () => {
      // Apply gravity (stronger when settling for snappier return)
      const gravityForce = -rotationRef.current * GRAVITY;
      velocityRef.current += gravityForce;

      // Apply air resistance
      velocityRef.current *= AIR_RESISTANCE;

      // Update rotation
      rotationRef.current += velocityRef.current;

      // Check if settled
      if (Math.abs(rotationRef.current) < SETTLE_THRESHOLD && Math.abs(velocityRef.current) < SETTLE_THRESHOLD) {
        rotationRef.current = 0;
        velocityRef.current = 0;
        applyRotation(0);
        return;
      }

      applyRotation(rotationRef.current);
      animationRef.current = requestAnimationFrame(settle);
    };

    // Start settling if there's any motion
    if (Math.abs(rotationRef.current) > SETTLE_THRESHOLD || Math.abs(velocityRef.current) > SETTLE_THRESHOLD) {
      animationRef.current = requestAnimationFrame(settle);
    } else {
      applyRotation(0);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dragging, applyRotation]);

  // Pointer move handler - applies impulse force based on horizontal movement
  // The actual physics simulation runs in the animation frame above
  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (lastPositionRef.current) {
        const deltaX = e.clientX - lastPositionRef.current.x;

        // Apply impulse force based on horizontal acceleration
        // This simulates the inertia of the pendulum lagging behind the movement
        velocityRef.current += deltaX * INERTIA_SCALE;
      }
      lastPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [dragging]);

  // SVG hexagon points
  const hexPoints = useMemo(() => {
    const w = MAP_HEX_WIDTH;
    const h = MAP_HEX_HEIGHT;
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={nodeRef}
          className={cn(
            "relative flex items-center justify-center",
            dragging && "cursor-grabbing"
          )}
          style={{
            width: MAP_HEX_WIDTH,
            height: MAP_HEX_HEIGHT,
            transformOrigin: "50% 20%", // Pivot point slightly below top
            transition: dragging ? "none" : "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            zIndex: dragging ? 1000 : "auto",
            willChange: dragging ? "transform" : "auto",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Handle type="target" position={Position.Left} className="opacity-0" />
          <Handle type="source" position={Position.Right} className="opacity-0" />

          <div className="group relative h-full w-full text-center">
        {/* Selection glow - soft primary-colored halo */}
        {(isActive || selected) && !dragging && (
          <div
            className="absolute inset-0 blur-md transition-opacity duration-200"
            style={{
              background: "hsl(var(--primary))",
              opacity: 0.12,
              clipPath: `polygon(${hexPoints.split(" ").map(p => {
                const [x, y] = p.split(",");
                return `${x}px ${y}px`;
              }).join(", ")})`,
              transform: "scale(1.08)",
            }}
          />
        )}

        {/* Drop shadow when dragging */}
        {dragging && (
          <div
            className="absolute inset-0 blur-xl opacity-30"
            style={{
              background: "var(--foreground)",
              clipPath: `polygon(${hexPoints.split(" ").map(p => {
                const [x, y] = p.split(",");
                return `${x}px ${y}px`;
              }).join(", ")})`,
              transform: "translateY(8px) scale(0.95)",
            }}
          />
        )}

        {/* Background hexagon */}
        <svg
          className="absolute inset-0 h-full w-full transition-[filter] duration-200"
          viewBox={`0 0 ${MAP_HEX_WIDTH} ${MAP_HEX_HEIGHT}`}
          shapeRendering="geometricPrecision"
          aria-hidden
          style={{
            filter: dragging
              ? "drop-shadow(0 12px 20px rgba(0,0,0,0.25))"
              : (isActive || selected)
                ? "drop-shadow(0 4px 12px rgba(0,0,0,0.1))"
                : "none",
          }}
        >
          {/* Gradient definitions */}
          <defs>
            {/* Unread indicator gradient - bottom corner */}
            <radialGradient
              id={`unread-gradient-${data?.id}`}
              cx="50%"
              cy="100%"
              r="45%"
              fx="50%"
              fy="100%"
            >
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>
            {/* Status indicator gradient - top corner */}
            <radialGradient
              id={`status-gradient-${data?.id}`}
              cx="50%"
              cy="0%"
              r="50%"
              fx="50%"
              fy="0%"
            >
              <stop offset="0%" stopColor={statusMeta.color} stopOpacity="0.35" />
              <stop offset="45%" stopColor={statusMeta.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={statusMeta.color} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Base fill */}
          <polygon
            points={hexPoints}
            className="fill-card"
            fillOpacity={dragging ? 1 : 0.95}
            stroke="var(--border)"
            strokeOpacity={dragging ? 0.8 : 0.6}
            strokeWidth={dragging ? 2 : 1}
            strokeLinejoin="round"
          />

          {/* Status indicator - colored gradient from top corner */}
          <polygon
            points={hexPoints}
            fill={`url(#status-gradient-${data?.id})`}
            stroke="none"
            className={cn(statusMeta.animate && !dragging && "animate-pulse")}
            style={{
              clipPath: status !== "idle"
                ? "circle(100% at 50% 0%)"
                : "circle(0% at 50% 0%)",
              transition: "clip-path 500ms ease-out",
            }}
          />

          {/* Unread indicator - orange gradient from bottom corner */}
          <polygon
            points={hexPoints}
            fill={`url(#unread-gradient-${data?.id})`}
            stroke="none"
            style={{
              clipPath: hasUnread
                ? "circle(100% at 50% 100%)"
                : "circle(0% at 50% 100%)",
              transition: "clip-path 500ms ease-out",
            }}
          />
          {/* Active/Selected state - refined border */}
          {(isActive || selected) && !dragging && (
            <polygon
              points={hexPoints}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeOpacity={0.35}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          {/* Dragging ring */}
          {dragging && (
            <polygon
              points={hexPoints}
              fill="none"
              stroke="var(--primary)"
              strokeOpacity={0.9}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeDasharray="4 2"
            />
          )}
        </svg>


        {/* Content */}
        <div className="absolute inset-[12%] flex flex-col items-center justify-between py-1 text-center">
          {/* Status text at top - illuminated by gradient */}
          <div
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium transition-all",
              isActive ? statusMeta.textClass : "text-muted-foreground/50"
            )}
            style={{
              textShadow: status !== "idle" && isActive ? `0 0 8px ${statusMeta.color}40` : "none",
            }}
          >
            {status === "done" && <Check className="h-3 w-3" />}
            {statusLabel}
          </div>

          {/* Title */}
          <div className="flex flex-col items-center gap-0.5 px-1">
            <div className={cn(
              "text-[14px] font-semibold leading-tight line-clamp-2 transition-colors",
              isActive ? "text-foreground" : "text-foreground/50"
            )}>
              {data?.title ?? "Tile"}
            </div>
          </div>

          {/* Status summary at bottom */}
          <div className={cn(
            "text-[11px] transition-colors",
            isActive ? "text-muted-foreground" : "text-muted-foreground/40"
          )}>
            {statusSummary}
          </div>
        </div>

        {/* Hover tip tooltip - shows once for new users */}
        {showHoverTip && !dragging && (
          <div
            className={cn(
              "absolute -bottom-20 left-1/2 -translate-x-1/2 z-50",
              "bg-popover text-popover-foreground border rounded-lg shadow-lg",
              "px-3 py-2 text-xs whitespace-nowrap",
              "animate-in fade-in slide-in-from-top-2 duration-200"
            )}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3 w-3 text-primary" />
                <span>Click to chat</span>
              </div>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-3 w-3 text-primary" />
                <span>Double-click to expand</span>
              </div>
              <div className="flex items-center gap-2">
                <GripVertical className="h-3 w-3 text-primary" />
                <span>Drag to move</span>
              </div>
            </div>
            {/* Arrow pointing up */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-popover border-l border-t rotate-45" />
          </div>
        )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleOpenChat}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Open Chat
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenWorkspace}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Open Workspace
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Tile
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Memoize to prevent re-renders when other tiles change
export const MapTileNode = memo(MapTileNodeInner, (prevProps, nextProps) => {
  // Only re-render if our specific data changed
  const prevData = prevProps.data;
  const nextData = nextProps.data;

  return (
    prevProps.selected === nextProps.selected &&
    prevProps.dragging === nextProps.dragging &&
    prevData?.id === nextData?.id &&
    prevData?.title === nextData?.title &&
    prevData?.status === nextData?.status &&
    prevData?.isActive === nextData?.isActive &&
    prevData?.unreadCount === nextData?.unreadCount &&
    prevData?.artifacts?.length === nextData?.artifacts?.length &&
    prevData?.messages?.length === nextData?.messages?.length
  );
});
