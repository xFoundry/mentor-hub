"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Viewport } from "@xyflow/react";
import type {
  TileData,
  TileArtifact,
  ProjectTerritory,
  MapStorageState,
  SidebarMode,
  TileStatus,
  HexCoord,
} from "@/types/map";
import { createEmptyTile } from "@/types/map";
import { MapChatManager } from "@/lib/map-chat-manager";

// ============================================================================
// Hex Grid Constants & Utilities (HEX_SIZE = 90 for Map v2)
// ============================================================================

const SQRT_THREE = Math.sqrt(3);

export const MAP_HEX_SIZE = 90;
export const MAP_HEX_WIDTH = Math.round(SQRT_THREE * MAP_HEX_SIZE);
export const MAP_HEX_HEIGHT = Math.round(MAP_HEX_SIZE * 2);
export const MAP_HEX_VERTICAL_SPACING = MAP_HEX_SIZE * 1.5;

export function mapAxialToPixel(coord: HexCoord, size = MAP_HEX_SIZE) {
  const width = Math.round(SQRT_THREE * size);
  const originX = width / 2;
  const originY = size;
  return {
    x: width * (coord.q + coord.r / 2) + originX,
    y: size * 1.5 * coord.r + originY,
  };
}

export function mapPixelToAxial(point: { x: number; y: number }, size = MAP_HEX_SIZE) {
  const width = Math.round(SQRT_THREE * size);
  const originX = width / 2;
  const originY = size;
  const shifted = {
    x: point.x - originX,
    y: point.y - originY,
  };
  const r = shifted.y / (size * 1.5);
  const q = shifted.x / width - r / 2;
  return { q, r };
}

export function mapRoundAxial(coord: { q: number; r: number }): HexCoord {
  let x = coord.q;
  let z = coord.r;
  let y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

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

  return { q: rx, r: rz };
}

export function mapCoordKey(coord: HexCoord) {
  return `${coord.q},${coord.r}`;
}

export function mapCoordToPosition(coord: HexCoord, size = MAP_HEX_SIZE) {
  const center = mapAxialToPixel(coord, size);
  const width = Math.round(SQRT_THREE * size);
  const height = Math.round(size * 2);
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
  };
}

export function mapPositionToCoord(position: { x: number; y: number }, size = MAP_HEX_SIZE) {
  const width = Math.round(SQRT_THREE * size);
  const height = Math.round(size * 2);
  const center = {
    x: position.x + width / 2,
    y: position.y + height / 2,
  };
  return mapRoundAxial(mapPixelToAxial(center, size));
}

export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },   // right
  { q: 1, r: -1 },  // top-right
  { q: 0, r: -1 },  // top-left
  { q: -1, r: 0 },  // left
  { q: -1, r: 1 },  // bottom-left
  { q: 0, r: 1 },   // bottom-right
];

// Get neighboring hex coordinates
export function getHexNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((dir) => ({
    q: coord.q + dir.q,
    r: coord.r + dir.r,
  }));
}

// Check if two hex coordinates are adjacent
export function areHexesAdjacent(a: HexCoord, b: HexCoord): boolean {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs((-a.q - a.r) - (-b.q - b.r));
  return (dq + dr + ds) === 2;
}

// Find connected components of tiles based on hex adjacency
// Returns array of tile ID arrays, each array is a connected territory
export function findConnectedTerritories(tiles: TileData[]): string[][] {
  if (tiles.length === 0) return [];

  const coordToTile = new Map<string, TileData>();
  for (const tile of tiles) {
    coordToTile.set(mapCoordKey(tile.coord), tile);
  }

  const visited = new Set<string>();
  const territories: string[][] = [];

  for (const tile of tiles) {
    if (visited.has(tile.id)) continue;

    // BFS to find all connected tiles
    const territory: string[] = [];
    const queue: TileData[] = [tile];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;

      visited.add(current.id);
      territory.push(current.id);

      // Check all 6 neighbors
      const neighbors = getHexNeighbors(current.coord);
      for (const neighborCoord of neighbors) {
        const neighborTile = coordToTile.get(mapCoordKey(neighborCoord));
        if (neighborTile && !visited.has(neighborTile.id)) {
          queue.push(neighborTile);
        }
      }
    }

    territories.push(territory);
  }

  return territories;
}

export function mapHexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [center];

  const results: HexCoord[] = [];
  let current = {
    q: center.q + HEX_DIRECTIONS[4].q * radius,
    r: center.r + HEX_DIRECTIONS[4].r * radius,
  };

  for (let dir = 0; dir < HEX_DIRECTIONS.length; dir += 1) {
    for (let step = 0; step < radius; step += 1) {
      results.push({ ...current });
      current = {
        q: current.q + HEX_DIRECTIONS[dir].q,
        r: current.r + HEX_DIRECTIONS[dir].r,
      };
    }
  }

  return results;
}

export function mapFindOpenCoord(
  occupied: Set<string>,
  anchor: HexCoord,
  maxRing = 12
): HexCoord {
  if (!occupied.has(mapCoordKey(anchor))) {
    return anchor;
  }

  for (let radius = 1; radius <= maxRing; radius += 1) {
    const ring = mapHexRing(anchor, radius);
    const open = ring.find((coord) => !occupied.has(mapCoordKey(coord)));
    if (open) return open;
  }

  return anchor;
}

// ============================================================================
// Context Types
// ============================================================================

interface MapContextValue {
  // State
  tiles: TileData[];
  activeTileId: string | null;
  expandedTileId: string | null;
  sidebarMode: SidebarMode;
  viewport: Viewport | undefined;
  territories: ProjectTerritory[];
  hasLoaded: boolean;

  // Tile Actions
  setActiveTileId: (id: string | null) => void;
  setExpandedTileId: (id: string | null) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setViewport: (viewport: Viewport) => void;

  // Tile CRUD
  addTile: (tile: TileData) => void;
  updateTile: (id: string, updates: Partial<TileData>) => void;
  deleteTile: (id: string) => void;

  // Tile Status
  setTileStatus: (id: string, status: TileStatus) => void;
  setTileStreaming: (id: string, isStreaming: boolean) => void;

  // Messages
  addMessage: (tileId: string, message: TileData["messages"][0]) => void;
  updateMessage: (
    tileId: string,
    messageId: string,
    updates: Partial<TileData["messages"][0]>
  ) => void;
  clearMessages: (tileId: string) => void;

  // Unread tracking
  markTileAsRead: (tileId: string) => void;
  incrementUnreadCount: (tileId: string) => void;

  // Artifacts
  addArtifact: (tileId: string, artifact: TileArtifact) => void;
  updateArtifact: (tileId: string, artifactId: string, updates: Partial<TileArtifact>) => void;
  deleteArtifact: (tileId: string, artifactId: string) => void;
  toggleArtifactPin: (tileId: string, artifactId: string) => void;

  // Territories
  setTerritories: (territories: ProjectTerritory[]) => void;

  // Utilities
  getNextTileCoord: (projectId: string) => HexCoord;
  resetMap: () => void;
  createTile: (title: string, projectId?: string) => TileData;
}

interface MapProviderProps {
  children: ReactNode;
  storageKey: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_VERSION = 1;

// Color palette for auto-assigned territory colors
const TERRITORY_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
];

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

// Compute territories from tile positions (connected components)
function computeTerritoriesFromTiles(tiles: TileData[]): ProjectTerritory[] {
  const connectedGroups = findConnectedTerritories(tiles);

  return connectedGroups.map((tileIds, index) => {
    // Find the tiles in this group
    const groupTiles = tiles.filter((t) => tileIds.includes(t.id));

    // Use first tile's title as territory name, or generate one
    const firstTile = groupTiles[0];
    const name = groupTiles.length === 1
      ? firstTile?.title ?? "Tile"
      : `Group ${index + 1}`;

    // Calculate centroid for anchor
    const avgQ = groupTiles.reduce((sum, t) => sum + t.coord.q, 0) / groupTiles.length;
    const avgR = groupTiles.reduce((sum, t) => sum + t.coord.r, 0) / groupTiles.length;

    return {
      id: `territory-${tileIds.sort().join("-")}`,
      name,
      color: TERRITORY_COLORS[index % TERRITORY_COLORS.length],
      anchor: { q: Math.round(avgQ), r: Math.round(avgR) },
      tileIds, // Track which tiles belong to this territory
    };
  });
}

// ============================================================================
// Context
// ============================================================================

const MapContext = createContext<MapContextValue | null>(null);

// Legacy storage migration helper
interface LegacyMapStorageState {
  version: number;
  zones?: TileData[];
  tiles?: TileData[];
  viewport?: Viewport;
  activeZoneId?: string | null;
  activeTileId?: string | null;
  expandedZoneId?: string | null;
  expandedTileId?: string | null;
  sidebarMode: SidebarMode;
  territories: ProjectTerritory[];
}

function readStoredState(storageKey: string): MapStorageState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as LegacyMapStorageState;
    if (!parsed?.version || parsed.version > STORAGE_VERSION) return null;

    // Migrate legacy zone fields to tile fields
    return {
      version: parsed.version,
      tiles: parsed.tiles ?? parsed.zones ?? [],
      viewport: parsed.viewport,
      activeTileId: parsed.activeTileId ?? parsed.activeZoneId ?? null,
      expandedTileId: parsed.expandedTileId ?? parsed.expandedZoneId ?? null,
      sidebarMode: parsed.sidebarMode ?? "expanded",
      territories: parsed.territories ?? [],
    };
  } catch {
    return null;
  }
}

export function MapProvider({ children, storageKey }: MapProviderProps) {
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [activeTileIdState, setActiveTileIdState] = useState<string | null>(null);
  const [expandedTileId, setExpandedTileId] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("expanded");
  const [viewport, setViewport] = useState<Viewport | undefined>(DEFAULT_VIEWPORT);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Wrap setActiveTileId to also mark the tile as read
  const setActiveTileId = useCallback((id: string | null) => {
    setActiveTileIdState(id);
    if (id) {
      // Mark the tile as read when it becomes active
      setTiles((current) =>
        current.map((tile) =>
          tile.id === id && tile.unreadCount > 0
            ? { ...tile, unreadCount: 0 }
            : tile
        )
      );
    }
  }, []);

  // Alias for external use
  const activeTileId = activeTileIdState;

  // Compute territories automatically based on tile adjacency
  const territories = useMemo(() => computeTerritoriesFromTiles(tiles), [tiles]);

  // No-op setter for API compatibility
  const setTerritories = useCallback((_territories: ProjectTerritory[]) => {
    // Territories are now computed from tile positions, not set manually
    console.warn("setTerritories is deprecated - territories are computed from tile adjacency");
  }, []);

  // Load from storage
  useEffect(() => {
    const stored = readStoredState(storageKey);
    if (stored) {
      setTiles(stored.tiles ?? []);
      // Use base setter during load to preserve unread counts
      setActiveTileIdState(stored.activeTileId ?? null);
      setExpandedTileId(stored.expandedTileId ?? null);
      setSidebarMode(stored.sidebarMode ?? "expanded");
      setViewport(stored.viewport ?? DEFAULT_VIEWPORT);
      // Territories are computed from tile positions, not stored
    } else {
      // Create default tile (projectId no longer matters for territories)
      const defaultTile = createEmptyTile(
        "tile-1",
        "Untitled",
        { q: 0, r: 0 },
        "default"
      );
      setTiles([defaultTile]);
      setActiveTileIdState(defaultTile.id);
      // Don't set viewport - let fitView center on the tile
      setViewport(undefined);
    }
    setHasLoaded(true);
  }, [storageKey]);

  // Save to storage
  useEffect(() => {
    if (!hasLoaded || typeof window === "undefined") return;

    const payload: MapStorageState = {
      version: STORAGE_VERSION,
      tiles,
      viewport,
      activeTileId,
      expandedTileId,
      sidebarMode,
      territories: [], // Territories are computed, not stored
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore localStorage errors
    }
  }, [
    activeTileId,
    expandedTileId,
    hasLoaded,
    sidebarMode,
    storageKey,
    viewport,
    tiles,
  ]);

  // Tile CRUD
  const addTile = useCallback((tile: TileData) => {
    setTiles((current) => [...current, tile]);
  }, []);

  const updateTile = useCallback((id: string, updates: Partial<TileData>) => {
    setTiles((current) =>
      current.map((tile) =>
        tile.id === id
          ? {
              ...tile,
              ...updates,
              lastActivityAt: new Date().toISOString(),
            }
          : tile
      )
    );
  }, []);

  const deleteTile = useCallback(
    (id: string) => {
      setTiles((current) => current.filter((tile) => tile.id !== id));
      if (activeTileId === id) {
        setActiveTileId(null);
      }
      if (expandedTileId === id) {
        setExpandedTileId(null);
      }
    },
    [activeTileId, expandedTileId]
  );

  // Tile Status
  const setTileStatus = useCallback((id: string, status: TileStatus) => {
    setTiles((current) =>
      current.map((tile) =>
        tile.id === id
          ? {
              ...tile,
              status,
              lastActivityAt: new Date().toISOString(),
            }
          : tile
      )
    );
  }, []);

  const setTileStreaming = useCallback((id: string, isStreaming: boolean) => {
    setTiles((current) =>
      current.map((tile) =>
        tile.id === id
          ? {
              ...tile,
              isStreaming,
              lastActivityAt: new Date().toISOString(),
            }
          : tile
      )
    );
  }, []);

  // Messages
  const addMessage = useCallback(
    (tileId: string, message: TileData["messages"][0]) => {
      setTiles((current) =>
        current.map((tile) =>
          tile.id === tileId
            ? {
                ...tile,
                messages: [...tile.messages, message],
                lastActivityAt: new Date().toISOString(),
              }
            : tile
        )
      );
    },
    []
  );

  const updateMessage = useCallback(
    (
      tileId: string,
      messageId: string,
      updates: Partial<TileData["messages"][0]>
    ) => {
      setTiles((current) =>
        current.map((tile) =>
          tile.id === tileId
            ? {
                ...tile,
                messages: tile.messages.map((msg) =>
                  msg.id === messageId ? { ...msg, ...updates } : msg
                ),
              }
            : tile
        )
      );
    },
    []
  );

  const clearMessages = useCallback((tileId: string) => {
    setTiles((current) =>
      current.map((tile) =>
        tile.id === tileId
          ? {
              ...tile,
              messages: [],
              threadId: null,
              handoffSummary: null,
              handoffRecentMessages: [],
              status: "idle",
              isStreaming: false,
              unreadCount: 0,
            }
          : tile
      )
    );
  }, []);

  // Unread tracking
  const markTileAsRead = useCallback((tileId: string) => {
    setTiles((current) =>
      current.map((tile) =>
        tile.id === tileId && tile.unreadCount > 0
          ? { ...tile, unreadCount: 0 }
          : tile
      )
    );
  }, []);

  const incrementUnreadCount = useCallback((tileId: string) => {
    setTiles((current) =>
      current.map((tile) =>
        tile.id === tileId
          ? { ...tile, unreadCount: (tile.unreadCount ?? 0) + 1 }
          : tile
      )
    );
  }, []);

  // Artifacts
  const addArtifact = useCallback((tileId: string, artifact: TileArtifact) => {
    setTiles((current) =>
      current.map((tile) => {
        if (tile.id !== tileId) return tile;

        const now = new Date().toISOString();
        const newArtifacts = [...tile.artifacts, artifact];
        const documentCount = newArtifacts.filter((a) => a.type === "document").length;
        const tableCount = newArtifacts.filter((a) => a.type === "table").length;
        const graphCount = newArtifacts.filter((a) => a.type === "graph").length;

        return {
          ...tile,
          artifacts: newArtifacts,
          contentSummary: {
            documentCount,
            tableCount,
            graphCount,
            lastModified: now,
          },
          lastActivityAt: now,
        };
      })
    );
  }, []);

  const updateArtifact = useCallback(
    (tileId: string, artifactId: string, updates: Partial<TileArtifact>) => {
      setTiles((current) =>
        current.map((tile) => {
          if (tile.id !== tileId) return tile;

          const now = new Date().toISOString();
          return {
            ...tile,
            artifacts: tile.artifacts.map((artifact) =>
              artifact.id === artifactId
                ? { ...artifact, ...updates, updatedAt: now }
                : artifact
            ),
            contentSummary: {
              ...tile.contentSummary,
              lastModified: now,
            },
          };
        })
      );
    },
    []
  );

  const deleteArtifact = useCallback((tileId: string, artifactId: string) => {
    setTiles((current) =>
      current.map((tile) => {
        if (tile.id !== tileId) return tile;

        const now = new Date().toISOString();
        const newArtifacts = tile.artifacts.filter((a) => a.id !== artifactId);
        const documentCount = newArtifacts.filter((a) => a.type === "document").length;
        const tableCount = newArtifacts.filter((a) => a.type === "table").length;
        const graphCount = newArtifacts.filter((a) => a.type === "graph").length;

        return {
          ...tile,
          artifacts: newArtifacts,
          pinnedArtifactIds: tile.pinnedArtifactIds.filter((id) => id !== artifactId),
          contentSummary: {
            documentCount,
            tableCount,
            graphCount,
            lastModified: now,
          },
          lastActivityAt: now,
        };
      })
    );
  }, []);

  const toggleArtifactPin = useCallback((tileId: string, artifactId: string) => {
    setTiles((current) =>
      current.map((tile) => {
        if (tile.id !== tileId) return tile;

        const isPinned = tile.pinnedArtifactIds.includes(artifactId);
        return {
          ...tile,
          pinnedArtifactIds: isPinned
            ? tile.pinnedArtifactIds.filter((id) => id !== artifactId)
            : [...tile.pinnedArtifactIds, artifactId],
        };
      })
    );
  }, []);

  // Initialize MapChatManager with callbacks
  // Use a ref to track tiles for the getTile callback
  const tilesRef = useRef<TileData[]>([]);
  tilesRef.current = tiles;

  // Track activeTileId for unread logic
  const activeTileIdRef = useRef<string | null>(null);
  activeTileIdRef.current = activeTileId;

  useEffect(() => {
    MapChatManager.setCallbacks({
      addMessage,
      updateMessage,
      updateTile,
      setTileStatus,
      setTileStreaming,
      addArtifact,
      incrementUnreadCount,
      getActiveTileId: () => activeTileIdRef.current,
      getTile: (tileId: string) => {
        const tile = tilesRef.current.find((t) => t.id === tileId);
        if (!tile) return undefined;
        return {
          threadId: tile.threadId,
          autoArtifacts: tile.autoArtifacts,
          handoffSummary: tile.handoffSummary,
          handoffRecentMessages: tile.handoffRecentMessages,
          selectedTools: tile.selectedTools,
        };
      },
    });

    return () => {
      MapChatManager.cleanup();
    };
  }, [addMessage, updateMessage, updateTile, setTileStatus, setTileStreaming, addArtifact, incrementUnreadCount]);

  // Utilities
  const getNextTileCoord = useCallback(
    (_projectId?: string) => {
      // Find an open coord near existing tiles
      const occupied = new Set(tiles.map((tile) => mapCoordKey(tile.coord)));

      // Start from center or near the last tile
      const anchor = tiles.length > 0 ? tiles[tiles.length - 1].coord : { q: 0, r: 0 };
      return mapFindOpenCoord(occupied, anchor, 18);
    },
    [tiles]
  );

  const createTile = useCallback(
    (title: string, _projectId?: string): TileData => {
      const coord = getNextTileCoord();
      const tileId = `tile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return createEmptyTile(tileId, title, coord, "default");
    },
    [getNextTileCoord]
  );

  const resetMap = useCallback(() => {
    const defaultTile = createEmptyTile(
      "tile-1",
      "Untitled",
      { q: 0, r: 0 },
      "default"
    );
    setTiles([defaultTile]);
    setActiveTileId(defaultTile.id);
    setExpandedTileId(null);
    setSidebarMode("expanded");
    setViewport(DEFAULT_VIEWPORT);

    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const value = useMemo<MapContextValue>(
    () => ({
      // State
      tiles,
      activeTileId,
      expandedTileId,
      sidebarMode,
      viewport,
      territories,
      hasLoaded,

      // Tile Actions
      setActiveTileId,
      setExpandedTileId,
      setSidebarMode,
      setViewport,

      // Tile CRUD
      addTile,
      updateTile,
      deleteTile,

      // Tile Status
      setTileStatus,
      setTileStreaming,

      // Messages
      addMessage,
      updateMessage,
      clearMessages,

      // Unread tracking
      markTileAsRead,
      incrementUnreadCount,

      // Artifacts
      addArtifact,
      updateArtifact,
      deleteArtifact,
      toggleArtifactPin,

      // Territories
      setTerritories,

      // Utilities
      getNextTileCoord,
      resetMap,
      createTile,
    }),
    [
      tiles,
      activeTileId,
      expandedTileId,
      sidebarMode,
      viewport,
      territories,
      hasLoaded,
      addTile,
      updateTile,
      deleteTile,
      setTileStatus,
      setTileStreaming,
      addMessage,
      updateMessage,
      clearMessages,
      markTileAsRead,
      incrementUnreadCount,
      addArtifact,
      updateArtifact,
      deleteArtifact,
      toggleArtifactPin,
      getNextTileCoord,
      resetMap,
      createTile,
    ]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within MapProvider");
  }
  return context;
}
