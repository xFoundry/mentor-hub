import type { Edge, Node, Viewport } from "@xyflow/react";
import type { ToolStep } from "@/types/chat";

export type CanvasNodeType = "chatBlock" | "tableArtifact" | "documentArtifact" | "graphEntity";

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

export interface ChatBlockData extends CanvasNodeDataBase {
  title?: string;
  description?: string;
  threadId?: string | null;
  messages?: CanvasChatMessage[];
  autoArtifacts?: boolean;
  isStreaming?: boolean;
  handoffSummary?: string | null;
  handoffRecentMessages?: { role: string; content: string }[];
  contextArtifactIds?: string[];
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
  | ChatBlockData
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
  activeChatBlockId?: string | null;
}

export interface CanvasStorageState {
  version: number;
  nodes: CanvasNode[];
  edges: Edge[];
  viewport?: Viewport;
  activeChatBlockId?: string | null;
  chatPanelOpen?: boolean;
  snapshots?: CanvasSnapshot[];
}
