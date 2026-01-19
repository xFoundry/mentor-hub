"use client";

import { memo, useMemo } from "react";
import { useStore } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  useMap,
  MAP_HEX_SIZE,
  MAP_HEX_WIDTH,
  MAP_HEX_HEIGHT,
  mapCoordKey,
  mapAxialToPixel,
  HEX_DIRECTIONS,
} from "@/contexts/map-context";
import type { HexCoord, ProjectTerritory } from "@/types/map";

// Calculate visible hex range based on viewport
function getVisibleHexRange(
  viewport: { x: number; y: number; zoom: number },
  containerWidth: number,
  containerHeight: number
) {
  const { x, y, zoom } = viewport;

  // Convert viewport bounds to flow coordinates
  const left = -x / zoom;
  const top = -y / zoom;
  const right = left + containerWidth / zoom;
  const bottom = top + containerHeight / zoom;

  // Add padding to ensure we render hexes that are partially visible
  const padding = MAP_HEX_SIZE * 3;

  // Calculate approximate hex range
  const minQ = Math.floor((left - padding) / MAP_HEX_WIDTH) - 1;
  const maxQ = Math.ceil((right + padding) / MAP_HEX_WIDTH) + 1;
  const minR = Math.floor((top - padding) / (MAP_HEX_SIZE * 1.5)) - 1;
  const maxR = Math.ceil((bottom + padding) / (MAP_HEX_SIZE * 1.5)) + 1;

  // Limit the range to avoid rendering too many hexes
  const maxRange = 25;
  return {
    minQ: Math.max(minQ, -maxRange),
    maxQ: Math.min(maxQ, maxRange),
    minR: Math.max(minR, -maxRange),
    maxR: Math.min(maxR, maxRange),
  };
}

// Generate hex points for SVG polygon
const HEX_POINTS = (() => {
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
})();

// Get hex vertices in world coordinates for a hex at given coord
function getHexWorldVertices(coord: HexCoord): Array<{ x: number; y: number }> {
  const center = mapAxialToPixel(coord, MAP_HEX_SIZE);
  const w = MAP_HEX_WIDTH;
  const h = MAP_HEX_HEIGHT;
  const y1 = h * 0.25;
  const y2 = h * 0.75;
  const left = center.x - w / 2;
  const top = center.y - h / 2;
  return [
    { x: left + w / 2, y: top },        // 0: top
    { x: left + w, y: top + y1 },       // 1: top-right
    { x: left + w, y: top + y2 },       // 2: bottom-right
    { x: left + w / 2, y: top + h },    // 3: bottom
    { x: left, y: top + y2 },           // 4: bottom-left
    { x: left, y: top + y1 },           // 5: top-left
  ];
}

// Edge to neighbor direction mapping
// Edge 0 (top-right) is shared with neighbor in direction 1 (upper-right)
// Edge 1 (right) is shared with neighbor in direction 0 (right)
// Edge 2 (bottom-right) is shared with neighbor in direction 5 (lower-right)
// Edge 3 (bottom-left) is shared with neighbor in direction 4 (lower-left)
// Edge 4 (left) is shared with neighbor in direction 3 (left)
// Edge 5 (top-left) is shared with neighbor in direction 2 (upper-left)
const EDGE_TO_NEIGHBOR_DIR = [1, 0, 5, 4, 3, 2];

interface HexCellProps {
  coord: HexCoord;
  isHovered: boolean;
  isDropPreview: boolean;
  transform: string;
  territoryColors: string[]; // Colors of territories this hex is adjacent to
}

const HexCell = memo(function HexCell({
  coord,
  isHovered,
  isDropPreview,
  transform,
  territoryColors,
}: HexCellProps) {
  const hasTerritory = territoryColors.length > 0;

  return (
    <g transform={transform} data-coord={`${coord.q},${coord.r}`}>
      {/* Territory color fills - shows which territory this hex would join */}
      {hasTerritory && !isHovered && !isDropPreview && (
        territoryColors.length === 1 ? (
          // Single territory - solid color
          <polygon
            points={HEX_POINTS}
            fill={territoryColors[0]}
            fillOpacity={0.08}
            stroke="none"
          />
        ) : (
          // Multiple territories - gradient to show merge potential
          <>
            <defs>
              <linearGradient
                id={`territory-gradient-${coord.q}-${coord.r}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                {territoryColors.map((color, i) => (
                  <stop
                    key={i}
                    offset={`${(i / (territoryColors.length - 1)) * 100}%`}
                    stopColor={color}
                    stopOpacity={0.12}
                  />
                ))}
              </linearGradient>
            </defs>
            <polygon
              points={HEX_POINTS}
              fill={`url(#territory-gradient-${coord.q}-${coord.r})`}
              stroke="none"
            />
            {/* Shared territory icon - merge indicator */}
            <g transform={`translate(${MAP_HEX_WIDTH / 2 - 8}, ${MAP_HEX_HEIGHT / 2 - 8})`}>
              <circle
                cx={8}
                cy={8}
                r={10}
                fill="white"
                fillOpacity={0.9}
              />
              {/* Git merge icon paths */}
              <g transform="translate(2, 2)" stroke="currentColor" strokeWidth={1.5} fill="none" className="text-muted-foreground">
                <circle cx={6} cy={3} r={2} />
                <circle cx={6} cy={9} r={2} />
                <path d="M6 5v2" />
                <path d="M10 3a2 2 0 1 1 0 4c-1.5 0-2.5 1-3 2" strokeLinecap="round" />
              </g>
            </g>
          </>
        )
      )}

      {/* Hover state - full border + fill */}
      {isHovered && !isDropPreview && (
        <polygon
          points={HEX_POINTS}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="3 4"
          strokeLinejoin="round"
          className="fill-primary/[0.04] text-primary/50"
        />
      )}

      {/* Hover plus icon */}
      {isHovered && !isDropPreview && (
        <g transform={`translate(${MAP_HEX_WIDTH / 2 - 10}, ${MAP_HEX_HEIGHT / 2 - 10})`}>
          <circle
            cx={10}
            cy={10}
            r={14}
            className="fill-primary/10"
          />
          <path
            d="M10 6v8M6 10h8"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="text-primary"
          />
        </g>
      )}

      {/* Drop preview - ghost outline for drag target */}
      {isDropPreview && (
        <>
          {/* Animated dashed border */}
          <polygon
            points={HEX_POINTS}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="8 4"
            strokeLinejoin="round"
            className="text-primary animate-pulse"
          />
          {/* Semi-transparent fill */}
          <polygon
            points={HEX_POINTS}
            className="fill-primary/10"
            stroke="none"
          />
          {/* Target indicator */}
          <g transform={`translate(${MAP_HEX_WIDTH / 2 - 12}, ${MAP_HEX_HEIGHT / 2 - 12})`}>
            <circle
              cx={12}
              cy={12}
              r={16}
              className="fill-primary/15"
            />
            <circle
              cx={12}
              cy={12}
              r={8}
              className="fill-primary/25"
            />
            <circle
              cx={12}
              cy={12}
              r={3}
              className="fill-primary/50"
            />
          </g>
        </>
      )}
    </g>
  );
});

interface MapHexGridProps {
  hoveredCoord: HexCoord | null;
  isDragging?: boolean;
  dropPreviewCoord?: HexCoord | null;
  draggingNodeId?: string | null;
  territories: ProjectTerritory[];
}

function MapHexGridInner({ hoveredCoord, isDragging, dropPreviewCoord, draggingNodeId, territories }: MapHexGridProps) {
  const { tiles } = useMap();

  // Get viewport from React Flow store
  const transform = useStore((state) => state.transform);
  const viewport = useMemo(
    () => ({ x: transform[0], y: transform[1], zoom: transform[2] }),
    [transform]
  );

  // Get container dimensions
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);

  // Find the dragging tile's original coord (to exclude from occupied during drag)
  const draggingTile = draggingNodeId ? tiles.find(t => t.id === draggingNodeId) : null;

  // Calculate which hexes are occupied (excluding dragging node during drag)
  const occupiedCoords = useMemo(() => {
    const set = new Set<string>();
    tiles.forEach((tile) => {
      // Skip the dragging tile's original position during drag
      if (isDragging && draggingNodeId && tile.id === draggingNodeId) return;
      set.add(mapCoordKey(tile.coord));
    });
    // Add the drop preview coord as occupied if valid
    if (isDragging && dropPreviewCoord) {
      set.add(mapCoordKey(dropPreviewCoord));
    }
    return set;
  }, [tiles, isDragging, draggingNodeId, dropPreviewCoord]);

  // Build tile coord to territory map
  const tileCoordToTerritory = useMemo(() => {
    const map = new Map<string, ProjectTerritory>();
    for (const territory of territories) {
      for (const tileId of territory.tileIds) {
        const tile = tiles.find(t => t.id === tileId);
        if (tile) {
          map.set(mapCoordKey(tile.coord), territory);
        }
      }
    }
    return map;
  }, [tiles, territories]);

  // Calculate territory colors for each empty hex (which territories it's adjacent to)
  const territoryColorsMap = useMemo(() => {
    const map = new Map<string, string[]>();

    // For each empty hex in the visible range, check if it's adjacent to any tile
    // We'll compute this when building hexData, but we need the tile positions first
    const tileCoords = new Set<string>();
    tiles.forEach((tile) => {
      // Skip dragging tile's original position
      if (isDragging && draggingNodeId && tile.id === draggingNodeId) return;
      tileCoords.add(mapCoordKey(tile.coord));
    });

    // Add drop preview position as a tile position
    if (isDragging && dropPreviewCoord) {
      tileCoords.add(mapCoordKey(dropPreviewCoord));
    }

    // For each tile, mark its adjacent empty hexes with the territory color
    tiles.forEach((tile) => {
      if (isDragging && draggingNodeId && tile.id === draggingNodeId) return;

      const territory = tileCoordToTerritory.get(mapCoordKey(tile.coord));
      if (!territory) return;

      // Check each neighbor
      HEX_DIRECTIONS.forEach((dir) => {
        const neighborCoord = {
          q: tile.coord.q + dir.q,
          r: tile.coord.r + dir.r,
        };
        const key = mapCoordKey(neighborCoord);

        // Only if neighbor is empty
        if (!occupiedCoords.has(key)) {
          const existing = map.get(key) ?? [];
          if (!existing.includes(territory.color)) {
            map.set(key, [...existing, territory.color]);
          }
        }
      });
    });

    // Also highlight around drop preview with dragging tile's territory
    if (isDragging && dropPreviewCoord && draggingNodeId) {
      const draggingTile = tiles.find(t => t.id === draggingNodeId);
      if (draggingTile) {
        const territory = tileCoordToTerritory.get(mapCoordKey(draggingTile.coord));
        const color = territory?.color ?? "#6366f1"; // default indigo if no territory

        HEX_DIRECTIONS.forEach((dir) => {
          const neighborCoord = {
            q: dropPreviewCoord.q + dir.q,
            r: dropPreviewCoord.r + dir.r,
          };
          const key = mapCoordKey(neighborCoord);

          if (!occupiedCoords.has(key)) {
            const existing = map.get(key) ?? [];
            if (!existing.includes(color)) {
              map.set(key, [...existing, color]);
            }
          }
        });
      }
    }

    return map;
  }, [tiles, territories, occupiedCoords, isDragging, draggingNodeId, dropPreviewCoord, tileCoordToTerritory]);

  // Calculate visible hex range
  const hexRange = useMemo(
    () => getVisibleHexRange(viewport, width, height),
    [viewport, width, height]
  );

  // Generate hex data to render (only unoccupied)
  const hexData = useMemo(() => {
    const data: Array<{ coord: HexCoord; transform: string; key: string }> = [];
    for (let r = hexRange.minR; r <= hexRange.maxR; r++) {
      for (let q = hexRange.minQ; q <= hexRange.maxQ; q++) {
        const coord = { q, r };
        const key = mapCoordKey(coord);
        if (occupiedCoords.has(key)) continue;

        const center = mapAxialToPixel(coord, MAP_HEX_SIZE);
        const x = center.x - MAP_HEX_WIDTH / 2;
        const y = center.y - MAP_HEX_HEIGHT / 2;

        data.push({
          coord,
          transform: `translate(${x}, ${y})`,
          key,
        });
      }
    }
    return data;
  }, [hexRange, occupiedCoords]);

  // Build set of rendered hex keys for edge ownership check
  const renderedHexKeys = useMemo(() => {
    return new Set(hexData.map(h => h.key));
  }, [hexData]);

  // Compute edges - brighter if either hex has territory colors
  // For each edge, only draw it if:
  // 1. The neighbor sharing this edge doesn't exist in our grid, OR
  // 2. This hex "owns" the edge (has lower q, or same q and lower r)
  const { territoryPath, dimPath } = useMemo(() => {
    const territoryParts: string[] = [];
    const dimParts: string[] = [];

    for (const { coord, key } of hexData) {
      const vertices = getHexWorldVertices(coord);
      const thisHasTerritory = (territoryColorsMap.get(key)?.length ?? 0) > 0;

      // Check each of the 6 edges
      for (let edgeIndex = 0; edgeIndex < 6; edgeIndex++) {
        const neighborDir = EDGE_TO_NEIGHBOR_DIR[edgeIndex];
        const neighborOffset = HEX_DIRECTIONS[neighborDir];
        const neighborCoord = {
          q: coord.q + neighborOffset.q,
          r: coord.r + neighborOffset.r,
        };
        const neighborKey = mapCoordKey(neighborCoord);

        // Check if neighbor exists in our rendered grid
        const neighborExists = renderedHexKeys.has(neighborKey);

        let shouldDraw = false;
        if (!neighborExists) {
          // No neighbor - we must draw this edge
          shouldDraw = true;
        } else {
          // Neighbor exists - only draw if we "own" this edge
          // Owner is the hex with lower q, or if same q, lower r
          if (coord.q < neighborCoord.q) {
            shouldDraw = true;
          } else if (coord.q === neighborCoord.q && coord.r < neighborCoord.r) {
            shouldDraw = true;
          }
        }

        if (shouldDraw) {
          // Edge is bright if EITHER this hex or its neighbor has territory colors
          const neighborHasTerritory = (territoryColorsMap.get(neighborKey)?.length ?? 0) > 0;
          const isTerritoryEdge = thisHasTerritory || neighborHasTerritory;
          const targetParts = isTerritoryEdge ? territoryParts : dimParts;

          const v1 = vertices[edgeIndex];
          const v2 = vertices[(edgeIndex + 1) % 6];
          targetParts.push(`M${v1.x.toFixed(1)},${v1.y.toFixed(1)}L${v2.x.toFixed(1)},${v2.y.toFixed(1)}`);
        }
      }
    }

    return {
      territoryPath: territoryParts.join(" "),
      dimPath: dimParts.join(" "),
    };
  }, [hexData, territoryColorsMap, renderedHexKeys]);

  // Only render if we have valid dimensions
  if (width === 0 || height === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{
        width: "100%",
        height: "100%",
        overflow: "visible",
      }}
    >
      <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
        {/* Grid edges - drawn as unified paths for consistent appearance */}
        {dimPath && (
          <path
            d={dimPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2 5"
            strokeLinecap="round"
            className="text-foreground/25"
          />
        )}
        {territoryPath && (
          <path
            d={territoryPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2 5"
            strokeLinecap="round"
            className="text-foreground/35"
          />
        )}

        {/* Hex fills and interactive elements */}
        {hexData.map(({ coord, transform, key }) => {
          const isDropPreview = Boolean(
            isDragging &&
            dropPreviewCoord !== null &&
            dropPreviewCoord !== undefined &&
            dropPreviewCoord.q === coord.q &&
            dropPreviewCoord.r === coord.r
          );

          const isHovered = Boolean(
            !isDragging &&
            hoveredCoord !== null &&
            hoveredCoord.q === coord.q &&
            hoveredCoord.r === coord.r
          );

          const territoryColors = territoryColorsMap.get(key) ?? [];

          return (
            <HexCell
              key={key}
              coord={coord}
              isHovered={isHovered}
              isDropPreview={isDropPreview}
              transform={transform}
              territoryColors={territoryColors}
            />
          );
        })}
      </g>
    </svg>
  );
}

export const MapHexGrid = memo(MapHexGridInner);

// Helper to calculate which hex coord a point is in
export function getHexAtPoint(
  flowX: number,
  flowY: number,
  occupiedCoords: Set<string>
): HexCoord | null {
  // Account for origin offset (hex 0,0 center is at width/2, size)
  const originX = MAP_HEX_WIDTH / 2;
  const originY = MAP_HEX_SIZE;

  // Shift coordinates to remove origin offset
  const shiftedX = flowX - originX;
  const shiftedY = flowY - originY;

  // Convert to fractional axial coordinates
  const r = shiftedY / (MAP_HEX_SIZE * 1.5);
  const q = shiftedX / MAP_HEX_WIDTH - r / 2;

  // Round to nearest hex using cube coordinate rounding
  // Convert axial to cube
  let x = q;
  let z = r;
  let y = -x - z;

  // Round each coordinate
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  // Fix rounding errors by adjusting the coord with largest diff
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  const coord = { q: rx, r: rz };
  const key = mapCoordKey(coord);

  // Check if this hex is occupied
  if (occupiedCoords.has(key)) return null;

  // Verify the point is actually within this hex (use slightly larger radius for better UX)
  const center = mapAxialToPixel(coord, MAP_HEX_SIZE);
  const dx = flowX - center.x;
  const dy = flowY - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // If within hex radius, return coord
  if (dist < MAP_HEX_SIZE * 0.95) {
    return coord;
  }

  return null;
}
