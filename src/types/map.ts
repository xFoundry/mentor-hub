/**
 * Types for the Map v2 experience.
 * Tiles on the map surface, artifacts embedded within tiles.
 */

import type { Viewport } from "@xyflow/react";
import type { ToolStep } from "@/types/chat";

// ============================================================================
// Tile Types
// ============================================================================

export type TileStatus =
  | "idle"
  | "thinking"
  | "researching"
  | "drafting"
  | "waiting"
  | "blocked"
  | "done";

export type TileType =
  | "workspace"    // General working folder (default)
  | "research"     // Research-focused
  | "planning"     // Task/planning focused
  | "archive";     // Completed work

export interface HexCoord {
  q: number;
  r: number;
}

export interface MapChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  steps?: ToolStep[];
  attachments?: MapChatAttachment[];
}

export interface MapChatAttachment {
  type: "document";
  artifactId: string;
  title?: string;
}

// ============================================================================
// Artifact Types (embedded within tiles)
// ============================================================================

export type ArtifactType = "document" | "table" | "graph";

export interface TileArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: unknown;
  summary?: string;
  createdAt: string;
  updatedAt?: string;
  isPinned: boolean;
  origin?: ArtifactOrigin;
}

export interface ArtifactOrigin {
  type?: string;
  tool_name?: string;
  chat_block_id?: string;
  canvas_id?: string;
  source_number?: number;
  query?: string;
}

export interface DocumentArtifact extends TileArtifact {
  type: "document";
  content: {
    text: string;
    format: "markdown" | "plain";
  };
}

export interface TableArtifact extends TileArtifact {
  type: "table";
  content: {
    columns: string[];
    rows: Record<string, unknown>[];
  };
}

export interface GraphArtifact extends TileArtifact {
  type: "graph";
  content: {
    nodes: Array<{
      id: string;
      label: string;
      type?: string;
      description?: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      label?: string;
    }>;
  };
}

// ============================================================================
// Tile Data
// ============================================================================

export interface TileData {
  // Index signature for React Flow compatibility
  [key: string]: unknown;

  // Identity
  id: string;
  title: string;
  description?: string;
  tileType: TileType;

  // Position
  coord: HexCoord;
  projectId: string;

  // Status
  status: TileStatus;
  lastActivityAt?: string;
  createdAt: string;

  // Chat
  threadId?: string | null;
  messages: MapChatMessage[];
  isStreaming?: boolean;
  unreadCount: number;
  handoffSummary?: string | null;
  handoffRecentMessages?: Array<{ role: string; content: string }>;
  selectedTools?: string[];

  // Artifacts (embedded, not canvas nodes)
  artifacts: TileArtifact[];
  pinnedArtifactIds: string[];

  // Content summary
  contentSummary: {
    documentCount: number;
    tableCount: number;
    graphCount: number;
    lastModified: string;
  };

  // Metadata
  tags: string[];
  autoArtifacts?: boolean;
}

// Legacy alias for backwards compatibility during migration
export type ZoneDataV2 = TileData;
export type ZoneStatus = TileStatus;
export type ZoneType = TileType;
export type ZoneArtifact = TileArtifact;

// ============================================================================
// Territory Types
// ============================================================================

export interface ProjectTerritory {
  id: string;
  name: string;
  color: string;
  anchor: HexCoord;
  description?: string;
  tileIds: string[]; // Tile IDs that belong to this territory (computed from adjacency)
}

// ============================================================================
// Map State Types
// ============================================================================

export type SidebarMode = "expanded" | "full" | "collapsed" | "hidden";

export interface MapStorageState {
  version: number;
  tiles: TileData[];
  viewport?: Viewport;
  activeTileId: string | null;
  expandedTileId: string | null;
  sidebarMode: SidebarMode;
  territories: ProjectTerritory[];
}

// ============================================================================
// Status Colors
// ============================================================================

export interface StatusColors {
  bg: string;
  text: string;
  border: string;
  animate?: string;
  icon?: string;
}

export const STATUS_COLORS: Record<TileStatus, StatusColors> = {
  idle: { bg: "slate-50", text: "slate-500", border: "slate-200" },
  thinking: { bg: "sky-50", text: "sky-600", border: "sky-100", animate: "pulse" },
  researching: { bg: "amber-50", text: "amber-600", border: "amber-100" },
  drafting: { bg: "emerald-50", text: "emerald-600", border: "emerald-100" },
  waiting: { bg: "violet-50", text: "violet-600", border: "violet-100" },
  blocked: { bg: "rose-50", text: "rose-600", border: "rose-100" },
  done: { bg: "teal-50", text: "teal-700", border: "teal-100", icon: "check" },
};

export const STATUS_LABELS: Record<TileStatus, string> = {
  idle: "Idle",
  thinking: "Thinking...",
  researching: "Researching...",
  drafting: "Drafting...",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Done",
};

// ============================================================================
// Helper Functions
// ============================================================================

export function createEmptyTile(
  id: string,
  title: string,
  coord: HexCoord,
  projectId: string
): TileData {
  const now = new Date().toISOString();
  return {
    id,
    title,
    tileType: "workspace",
    coord,
    projectId,
    status: "idle",
    createdAt: now,
    lastActivityAt: now,
    threadId: null,
    messages: [],
    isStreaming: false,
    unreadCount: 0,
    artifacts: [],
    pinnedArtifactIds: [],
    contentSummary: {
      documentCount: 0,
      tableCount: 0,
      graphCount: 0,
      lastModified: now,
    },
    tags: [],
    autoArtifacts: false,
    selectedTools: [],
  };
}

// Legacy alias
export const createEmptyZone = createEmptyTile;

export function getStatusSummary(tile: TileData): string {
  const { artifacts, messages, status } = tile;

  if (status === "thinking" || status === "researching" || status === "drafting") {
    return STATUS_LABELS[status];
  }

  const artifactCount = artifacts.length;
  if (artifactCount > 0) {
    return `${artifactCount} file${artifactCount !== 1 ? "s" : ""}`;
  }

  const messageCount = messages.length;
  if (messageCount > 0) {
    return `${messageCount} msg${messageCount !== 1 ? "s" : ""}`;
  }

  return "No activity";
}
