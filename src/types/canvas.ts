import type { Edge, Node, Viewport } from "@xyflow/react";
import type { ToolStep } from "@/types/chat";

export type CanvasNodeType =
  | "zone"
  | "chatBlock"
  | "tableArtifact"
  | "documentArtifact"
  | "graphEntity";

export type ZoneStatus =
  | "idle"
  | "thinking"
  | "researching"
  | "drafting"
  | "waiting"
  | "blocked"
  | "done";

export interface HexCoord {
  q: number;
  r: number;
}

export interface ProjectTerritory {
  id: string;
  name: string;
  color?: string;
  anchor: HexCoord;
}

export interface CanvasNodeDataBase {
  [key: string]: unknown;
}

export interface CanvasChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  steps?: ToolStep[];
  attachments?: CanvasChatAttachment[];
}

export interface CanvasChatAttachment {
  type: "document";
  artifactId: string;
  title?: string;
}

export interface ZoneData extends CanvasNodeDataBase {
  title?: string;
  description?: string;
  threadId?: string | null;
  messages?: CanvasChatMessage[];
  autoArtifacts?: boolean;
  isStreaming?: boolean;
  handoffSummary?: string | null;
  handoffRecentMessages?: { role: string; content: string }[];
  contextArtifactIds?: string[];
  projectId?: string;
  agentId?: string;
  status?: ZoneStatus;
  lastActivityAt?: string;
  coord?: HexCoord;
}

export interface TableArtifactData extends CanvasNodeDataBase {
  title?: string;
  rowCount?: number;
  payload?: unknown;
  origin?: unknown;
  createdAt?: string;
  isExpanded?: boolean;
}

export interface DocumentArtifactData extends CanvasNodeDataBase {
  title?: string;
  summary?: string;
  payload?: unknown;
  origin?: unknown;
  createdAt?: string;
  isExpanded?: boolean;
  titleEdited?: boolean;
}

export interface GraphEntityData extends CanvasNodeDataBase {
  title?: string;
  entityType?: string;
  description?: string;
  origin?: unknown;
  sourceNumber?: number;
}

export type CanvasNodeData =
  | ZoneData
  | TableArtifactData
  | DocumentArtifactData
  | GraphEntityData;

export type CanvasNode = Node<CanvasNodeData, CanvasNodeType>;

export interface CanvasSnapshot {
  id: string;
  title: string;
  createdAt: string;
  nodes: CanvasNode[];
  edges: Edge[];
  viewport?: Viewport;
  activeZoneId?: string | null;
  territories?: ProjectTerritory[];
}

export interface CanvasStorageState {
  version: number;
  nodes: CanvasNode[];
  edges: Edge[];
  viewport?: Viewport;
  activeZoneId?: string | null;
  chatPanelOpen?: boolean;
  snapshots?: CanvasSnapshot[];
  territories?: ProjectTerritory[];
}

export type ChatBlockData = ZoneData;
