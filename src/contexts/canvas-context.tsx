"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Connection, Edge, NodeChange, EdgeChange, Viewport } from "@xyflow/react";
import { addEdge as addFlowEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type { CanvasNode, CanvasSnapshot, CanvasStorageState } from "@/types/canvas";

interface CanvasContextValue {
  canvasId: string;
  nodes: CanvasNode[];
  edges: Edge[];
  viewport?: Viewport;
  hasStoredState: boolean;
  activeChatBlockId: string | null;
  chatPanelOpen: boolean;
  focusedNodeId: string | null;
  snapshots: CanvasSnapshot[];
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: Viewport) => void;
  addNode: (node: CanvasNode) => void;
  addEdge: (edge: Edge) => void;
  updateNodeData: (
    nodeId: string,
    updater: (data: CanvasNode["data"]) => CanvasNode["data"]
  ) => void;
  setActiveChatBlockId: (chatBlockId: string | null) => void;
  setChatPanelOpen: (open: boolean) => void;
  setFocusedNodeId: (nodeId: string | null) => void;
  clearFocus: () => void;
  openChatPanel: (chatBlockId?: string) => void;
  closeChatPanel: () => void;
  resetCanvas: () => void;
  createSnapshot: (title?: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
}

interface CanvasProviderProps {
  children: ReactNode;
  storageKey: string;
}

const STORAGE_VERSION = 1;

const DEFAULT_NODES: CanvasNode[] = [
  {
    id: "chat-block-1",
    type: "chatBlock",
    position: { x: 0, y: 0 },
    data: {
      title: "Chat Block",
      description: "Start a new conversation here.",
      messages: [],
      autoArtifacts: false,
      contextArtifactIds: undefined,
    },
  },
];

const DEFAULT_EDGES: Edge[] = [];

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

const CanvasContext = createContext<CanvasContextValue | null>(null);

function readStoredState(storageKey: string): CanvasStorageState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CanvasStorageState;
    if (parsed?.version !== STORAGE_VERSION) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function CanvasProvider({ children, storageKey }: CanvasProviderProps) {
  const canvasId = storageKey;
  const [nodes, setNodes] = useState<CanvasNode[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<Edge[]>(DEFAULT_EDGES);
  const [viewport, setViewport] = useState<Viewport | undefined>(DEFAULT_VIEWPORT);
  const [hasStoredState, setHasStoredState] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [snapshots, setSnapshots] = useState<CanvasSnapshot[]>([]);
  const [activeChatBlockId, setActiveChatBlockId] = useState<string | null>(
    DEFAULT_NODES[0]?.id ?? null
  );
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredState(storageKey);
    if (stored) {
      setNodes(stored.nodes ?? DEFAULT_NODES);
      setEdges(stored.edges ?? DEFAULT_EDGES);
      setViewport(stored.viewport ?? DEFAULT_VIEWPORT);
      setSnapshots(stored.snapshots ?? []);
      if (stored.activeChatBlockId !== undefined) {
        setActiveChatBlockId(stored.activeChatBlockId ?? null);
      } else {
        setActiveChatBlockId((stored.nodes?.[0]?.id ?? DEFAULT_NODES[0]?.id) ?? null);
      }
      if (stored.chatPanelOpen !== undefined) {
        setChatPanelOpen(Boolean(stored.chatPanelOpen));
      }
      setHasStoredState(true);
    } else {
      setNodes(DEFAULT_NODES);
      setEdges(DEFAULT_EDGES);
      setViewport(DEFAULT_VIEWPORT);
      setSnapshots([]);
      setActiveChatBlockId(DEFAULT_NODES[0]?.id ?? null);
      setChatPanelOpen(true);
      setHasStoredState(false);
    }
    setHasLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoaded || typeof window === "undefined") return;

    const payload: CanvasStorageState = {
      version: STORAGE_VERSION,
      nodes,
      edges,
      viewport,
      activeChatBlockId,
      chatPanelOpen,
      snapshots,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore localStorage errors (quota, private mode, etc.)
    }
  }, [activeChatBlockId, chatPanelOpen, edges, hasLoaded, nodes, snapshots, storageKey, viewport]);

  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    setNodes((current) => applyNodeChanges<CanvasNode>(changes, current));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((current) => applyEdgeChanges<Edge>(changes, current));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const sourceNode = nodes.find((node) => node.id === connection.source);
    const targetNode = nodes.find((node) => node.id === connection.target);
    const kind = sourceNode?.type === "chatBlock" && targetNode?.type === "chatBlock"
      ? "handoff"
      : sourceNode?.type === "chatBlock" || targetNode?.type === "chatBlock"
        ? "context"
        : "reference";
    setEdges((current) =>
      addFlowEdge(
        {
          ...connection,
          data: {
            kind,
          },
        },
        current
      )
    );
  }, [nodes]);

  const addNode = useCallback((node: CanvasNode) => {
    setNodes((current) => [...current, node]);
  }, []);

  const addCanvasEdge = useCallback((edge: Edge) => {
    setEdges((current) => [...current, edge]);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, updater: (data: CanvasNode["data"]) => CanvasNode["data"]) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId ? { ...node, data: updater(node.data) } : node
        )
      );
    },
    []
  );

  const resetCanvas = useCallback(() => {
    setNodes(DEFAULT_NODES);
    setEdges(DEFAULT_EDGES);
    setViewport(DEFAULT_VIEWPORT);
    setHasStoredState(false);
    setActiveChatBlockId(DEFAULT_NODES[0]?.id ?? null);
    setChatPanelOpen(true);
    setFocusedNodeId(null);
    setSnapshots([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const cloneState = useCallback(<T,>(value: T): T => {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
  }, []);

  const createSnapshot = useCallback(
    (title?: string) => {
      const createdAt = new Date().toISOString();
      const fallbackTitle = `Snapshot ${snapshots.length + 1}`;
      const snapshot: CanvasSnapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: title?.trim() || fallbackTitle,
        createdAt,
        nodes: cloneState(nodes),
        edges: cloneState(edges),
        viewport: cloneState(viewport),
        activeChatBlockId: activeChatBlockId ?? null,
      };
      setSnapshots((current) => [snapshot, ...current].slice(0, 20));
    },
    [activeChatBlockId, cloneState, edges, nodes, snapshots.length, viewport]
  );

  const restoreSnapshot = useCallback(
    (snapshotId: string) => {
      const snapshot = snapshots.find((item) => item.id === snapshotId);
      if (!snapshot) return;
      setNodes(cloneState(snapshot.nodes));
      setEdges(cloneState(snapshot.edges));
      setViewport(cloneState(snapshot.viewport));
      setActiveChatBlockId(snapshot.activeChatBlockId ?? snapshot.nodes[0]?.id ?? null);
      setChatPanelOpen(true);
      setFocusedNodeId(null);
    },
    [cloneState, snapshots]
  );

  const deleteSnapshot = useCallback((snapshotId: string) => {
    setSnapshots((current) => current.filter((snapshot) => snapshot.id !== snapshotId));
  }, []);

  const openChatPanel = useCallback(
    (chatBlockId?: string) => {
      if (chatBlockId) {
        setActiveChatBlockId(chatBlockId);
      }
      setChatPanelOpen(true);
    },
    []
  );

  const closeChatPanel = useCallback(() => {
    setChatPanelOpen(false);
  }, []);

  const clearFocus = useCallback(() => {
    setFocusedNodeId(null);
  }, []);

  const value = useMemo(
    () => ({
      canvasId,
      nodes,
      edges,
      viewport,
      hasStoredState,
      activeChatBlockId,
      chatPanelOpen,
      focusedNodeId,
      snapshots,
      onNodesChange,
      onEdgesChange,
      onConnect,
      setNodes,
      setEdges,
      setViewport,
      addNode,
      addEdge: addCanvasEdge,
      updateNodeData,
      setActiveChatBlockId,
      setChatPanelOpen,
      setFocusedNodeId,
      clearFocus,
      openChatPanel,
      closeChatPanel,
      resetCanvas,
      createSnapshot,
      restoreSnapshot,
      deleteSnapshot,
    }),
    [
      canvasId,
      nodes,
      edges,
      viewport,
      hasStoredState,
      activeChatBlockId,
      chatPanelOpen,
      focusedNodeId,
      snapshots,
      onNodesChange,
      onEdgesChange,
      onConnect,
      setNodes,
      setEdges,
      setViewport,
      addNode,
      addCanvasEdge,
      updateNodeData,
      setActiveChatBlockId,
      setChatPanelOpen,
      setFocusedNodeId,
      clearFocus,
      openChatPanel,
      closeChatPanel,
      resetCanvas,
      createSnapshot,
      restoreSnapshot,
      deleteSnapshot,
    ]
  );

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within CanvasProvider");
  }
  return context;
}
