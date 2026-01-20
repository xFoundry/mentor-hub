"use client";

import { useMemo, useCallback } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useMap, mapCoordToPosition, MAP_HEX_WIDTH, MAP_HEX_HEIGHT } from "@/contexts/map-context";
import type { TileStatus } from "@/types/map";

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 120;
const MINIMAP_PADDING = 8;

// Minimap status colors (matching the main node colors)
const STATUS_FILL: Record<TileStatus, string> = {
  idle: "#94a3b8",
  thinking: "#0ea5e9",
  researching: "#f59e0b",
  drafting: "#10b981",
  waiting: "#8b5cf6",
  blocked: "#f43f5e",
  done: "#14b8a6",
};

interface MapMinimapProps {
  className?: string;
}

export function MapMinimap({ className }: MapMinimapProps) {
  const { tiles, activeTileId, setActiveTileId } = useMap();
  const { setCenter } = useReactFlow();
  const viewport = useViewport();

  // Calculate bounds of all tiles
  const bounds = useMemo(() => {
    if (tiles.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    tiles.forEach((tile) => {
      const pos = mapCoordToPosition(tile.coord);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + MAP_HEX_WIDTH);
      maxY = Math.max(maxY, pos.y + MAP_HEX_HEIGHT);
    });

    // Add padding
    const padding = 50;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }, [tiles]);

  // Calculate scale to fit all tiles in minimap
  const scale = useMemo(() => {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const availableWidth = MINIMAP_WIDTH - 2 * MINIMAP_PADDING;
    const availableHeight = MINIMAP_HEIGHT - 2 * MINIMAP_PADDING;

    return Math.min(
      availableWidth / contentWidth,
      availableHeight / contentHeight,
      1
    );
  }, [bounds]);

  // Convert flow position to minimap position
  const toMinimapPos = useCallback(
    (x: number, y: number) => {
      return {
        x: MINIMAP_PADDING + (x - bounds.minX) * scale,
        y: MINIMAP_PADDING + (y - bounds.minY) * scale,
      };
    },
    [bounds, scale]
  );

  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = useMemo(() => {
    const currentViewport = viewport;
    // The viewport position is the top-left of what's visible
    // We need to calculate the visible area in flow coordinates
    const visibleWidth = window.innerWidth / currentViewport.zoom;
    const visibleHeight = window.innerHeight / currentViewport.zoom;

    const flowX = -currentViewport.x / currentViewport.zoom;
    const flowY = -currentViewport.y / currentViewport.zoom;

    const topLeft = toMinimapPos(flowX, flowY);
    const bottomRight = toMinimapPos(flowX + visibleWidth, flowY + visibleHeight);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: Math.max(10, bottomRight.x - topLeft.x),
      height: Math.max(10, bottomRight.y - topLeft.y),
    };
  }, [toMinimapPos, viewport]);

  // Handle click to pan
  const handleMinimapClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Convert minimap click to flow coordinates
      const flowX = bounds.minX + (clickX - MINIMAP_PADDING) / scale;
      const flowY = bounds.minY + (clickY - MINIMAP_PADDING) / scale;

      setCenter(flowX, flowY, { zoom: viewport.zoom, duration: 300 });
    },
    [bounds, scale, setCenter, viewport.zoom]
  );

  // Handle tile dot click
  const handleTileClick = useCallback(
    (tileId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setActiveTileId(tileId);

      const tile = tiles.find((t) => t.id === tileId);
      if (tile) {
        const pos = mapCoordToPosition(tile.coord);
        setCenter(
          pos.x + MAP_HEX_WIDTH / 2,
          pos.y + MAP_HEX_HEIGHT / 2,
          { zoom: 1, duration: 300 }
        );
      }
    },
    [setActiveTileId, tiles, setCenter]
  );

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/95 backdrop-blur-sm shadow-sm overflow-hidden",
        className
      )}
    >
      <svg
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="cursor-crosshair"
        onClick={handleMinimapClick}
      >
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          className="fill-muted/30"
        />

        {/* Tile dots */}
        {tiles.map((tile) => {
          const pos = mapCoordToPosition(tile.coord);
          const minimapPos = toMinimapPos(
            pos.x + MAP_HEX_WIDTH / 2,
            pos.y + MAP_HEX_HEIGHT / 2
          );
          const isActive = tile.id === activeTileId;
          const fill = STATUS_FILL[tile.status] || STATUS_FILL.idle;

          return (
            <circle
              key={tile.id}
              cx={minimapPos.x}
              cy={minimapPos.y}
              r={isActive ? 5 : 4}
              fill={fill}
              stroke={isActive ? "var(--primary)" : "transparent"}
              strokeWidth={2}
              className="cursor-pointer transition-all hover:opacity-80"
              onClick={(e) => handleTileClick(tile.id, e)}
            />
          );
        })}

        {/* Viewport rectangle */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          className="pointer-events-none"
        />
      </svg>
    </div>
  );
}
