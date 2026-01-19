"use client";

import { useMemo } from "react";
import { useStore } from "@xyflow/react";
import {
  useMap,
  MAP_HEX_SIZE,
  MAP_HEX_WIDTH,
  MAP_HEX_HEIGHT,
  mapCoordToPosition,
  mapCoordKey,
} from "@/contexts/map-context";
import type { HexCoord, ProjectTerritory, TileData } from "@/types/map";

// Direction to edge mapping for pointy-top hexagons
// HEX_DIRECTIONS: [right, up-right, up-left, left, down-left, down-right]
// Edge indices: 0=top-right, 1=right, 2=bottom-right, 3=bottom-left, 4=left, 5=top-left
const DIRECTION_TO_EDGE = [1, 0, 5, 4, 3, 2];

// Neighbor offsets matching HEX_DIRECTIONS from context
const NEIGHBOR_OFFSETS: HexCoord[] = [
  { q: 1, r: 0 },   // right
  { q: 1, r: -1 },  // up-right
  { q: 0, r: -1 },  // up-left
  { q: -1, r: 0 },  // left
  { q: -1, r: 1 },  // down-left
  { q: 0, r: 1 },   // down-right
];

// Get the vertices of a pointy-top hexagon centered at (cx, cy)
function getHexVertices(cx: number, cy: number, size: number): { x: number; y: number }[] {
  const vertices: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    // Pointy-top hex: first vertex at -90 degrees (top)
    const angle = (Math.PI / 180) * (60 * i - 90);
    vertices.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return vertices;
}

// Get the edge between vertex i and vertex (i+1)%6
function getHexEdge(
  cx: number,
  cy: number,
  size: number,
  edgeIndex: number
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const vertices = getHexVertices(cx, cy, size);
  return {
    start: vertices[edgeIndex],
    end: vertices[(edgeIndex + 1) % 6],
  };
}

// Build boundary path for a group of tiles - only outer edges
function buildTerritoryPath(
  tiles: TileData[],
  allTilesInTerritory: Set<string>
): string {
  if (tiles.length === 0) return "";

  const boundarySegments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> = [];

  for (const tile of tiles) {
    // Get the center position of this hex in pixel coords
    const pos = mapCoordToPosition(tile.coord);
    const cx = pos.x + MAP_HEX_WIDTH / 2;
    const cy = pos.y + MAP_HEX_HEIGHT / 2;

    // Check each of the 6 directions
    for (let dir = 0; dir < 6; dir++) {
      // Get the neighbor in this direction
      const neighborCoord: HexCoord = {
        q: tile.coord.q + NEIGHBOR_OFFSETS[dir].q,
        r: tile.coord.r + NEIGHBOR_OFFSETS[dir].r,
      };
      const neighborKey = mapCoordKey(neighborCoord);

      // If neighbor is not in this territory, this edge is a boundary
      if (!allTilesInTerritory.has(neighborKey)) {
        // Use the correct edge for this direction
        const edgeIndex = DIRECTION_TO_EDGE[dir];
        boundarySegments.push(getHexEdge(cx, cy, MAP_HEX_SIZE, edgeIndex));
      }
    }
  }

  if (boundarySegments.length === 0) return "";

  // Sort segments to form continuous paths
  const paths: string[] = [];
  const remaining = [...boundarySegments];

  while (remaining.length > 0) {
    const path: typeof boundarySegments = [remaining.shift()!];

    // Try to extend the path in both directions
    let extended = true;
    while (extended && remaining.length > 0) {
      extended = false;

      // Try to extend from the end
      const lastEnd = path[path.length - 1].end;
      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i];
        if (Math.abs(seg.start.x - lastEnd.x) < 1 && Math.abs(seg.start.y - lastEnd.y) < 1) {
          path.push(remaining.splice(i, 1)[0]);
          extended = true;
          break;
        }
        if (Math.abs(seg.end.x - lastEnd.x) < 1 && Math.abs(seg.end.y - lastEnd.y) < 1) {
          path.push({ start: seg.end, end: seg.start });
          remaining.splice(i, 1);
          extended = true;
          break;
        }
      }

      // Try to extend from the start
      if (!extended) {
        const firstStart = path[0].start;
        for (let i = 0; i < remaining.length; i++) {
          const seg = remaining[i];
          if (Math.abs(seg.end.x - firstStart.x) < 1 && Math.abs(seg.end.y - firstStart.y) < 1) {
            path.unshift(remaining.splice(i, 1)[0]);
            extended = true;
            break;
          }
          if (Math.abs(seg.start.x - firstStart.x) < 1 && Math.abs(seg.start.y - firstStart.y) < 1) {
            path.unshift({ start: seg.end, end: seg.start });
            remaining.splice(i, 1);
            extended = true;
            break;
          }
        }
      }
    }

    // Convert path to SVG
    if (path.length > 0) {
      const parts = [`M ${path[0].start.x.toFixed(1)} ${path[0].start.y.toFixed(1)}`];
      for (const seg of path) {
        parts.push(`L ${seg.end.x.toFixed(1)} ${seg.end.y.toFixed(1)}`);
      }
      // Close path if it loops back
      const first = path[0].start;
      const last = path[path.length - 1].end;
      if (Math.abs(first.x - last.x) < 1 && Math.abs(first.y - last.y) < 1) {
        parts.push("Z");
      }
      paths.push(parts.join(" "));
    }
  }

  return paths.join(" ");
}

interface TerritoryRenderData {
  territory: ProjectTerritory;
  tiles: TileData[];
  path: string;
}

export function MapTerritoryOverlay() {
  // Territory boundaries are now indicated by the colored fills on adjacent
  // empty hexes in MapHexGrid, so we no longer need the dashed boundary overlay.
  // Keeping this component for potential future use (e.g., territory labels).
  return null;
}
