"use client";

import { useCallback, useMemo, useState } from "react";
import type { Edge, NodeTypes, ReactFlowInstance } from "@xyflow/react";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, MarkerType } from "@xyflow/react";
import { useCanvas } from "@/contexts/canvas-context";
import { ChatBlockNode } from "@/components/canvas/nodes/chat-block-node";
import { TableArtifactNode } from "@/components/canvas/nodes/table-artifact-node";
import { DocumentArtifactNode } from "@/components/canvas/nodes/document-artifact-node";
import { GraphEntityNode } from "@/components/canvas/nodes/graph-entity-node";
import { CanvasChatSidebar } from "@/components/canvas/canvas-chat-sidebar";
import type { CanvasNode } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, Shuffle } from "lucide-react";
import { CanvasCommandPalette } from "@/components/canvas/canvas-command-palette";

const nodeTypes = {
  chatBlock: ChatBlockNode,
  tableArtifact: TableArtifactNode,
  documentArtifact: DocumentArtifactNode,
  graphEntity: GraphEntityNode,
} satisfies NodeTypes;

const NODE_SIZES: Record<string, { width: number; height: number }> = {
  chatBlock: { width: 320, height: 220 },
  tableArtifact: { width: 320, height: 140 },
  documentArtifact: { width: 340, height: 220 },
  graphEntity: { width: 240, height: 140 },
};

const getNodeSize = (type?: string) => NODE_SIZES[type ?? ""] ?? NODE_SIZES.documentArtifact;

function CanvasSurface() {
  const {
    nodes,
    edges,
    viewport,
    hasStoredState,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setViewport,
    focusedNodeId,
    setFocusedNodeId,
    clearFocus,
    setNodes,
    openChatPanel,
    updateNodeData,
  } = useCanvas();
  const [commandOpen, setCommandOpen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<CanvasNode, Edge> | null>(null);

  const handleInit = useCallback(
    (instance: ReactFlowInstance<CanvasNode, Edge>) => {
      setReactFlowInstance(instance);
      if (hasStoredState && viewport) {
        instance.setViewport(viewport);
        return;
      }
      if (!hasStoredState) {
        instance.fitView({ padding: 0.2 });
      }
    },
    [hasStoredState, viewport]
  );

  const focusSet = useMemo(() => {
    if (!focusedNodeId) return null;
    const connected = new Set<string>([focusedNodeId]);
    edges.forEach((edge) => {
      if (edge.source === focusedNodeId) {
        connected.add(edge.target);
      }
      if (edge.target === focusedNodeId) {
        connected.add(edge.source);
      }
    });
    return connected;
  }, [edges, focusedNodeId]);

  const nodesWithFocus = useMemo(() => {
    if (!focusSet) return nodes;
    return nodes.map((node) => {
      const isFocused = focusSet.has(node.id);
      return {
        ...node,
        className: cn(node.className, !isFocused && "opacity-35"),
      };
    });
  }, [focusSet, nodes]);

  const edgesWithFocus = useMemo(() => {
    return edges.map((edge) => {
      const kind = (edge.data as { kind?: string } | undefined)?.kind
        ?? (edge.id.startsWith("graph_edge_") ? "graph" : "reference");
      const baseColor = kind === "handoff"
        ? "rgba(14, 165, 233, 0.9)"
        : kind === "context"
          ? "rgba(148, 163, 184, 0.9)"
          : kind === "graph"
            ? "rgba(99, 102, 241, 0.9)"
            : "rgba(100, 116, 139, 0.75)";
      const isFocused = focusSet
        ? focusSet.has(edge.source) && focusSet.has(edge.target)
        : true;
      const opacity = isFocused ? 0.95 : 0.25;
      const strokeWidth = kind === "graph" ? 1.6 : kind === "handoff" ? 1.4 : 1;
      return {
        ...edge,
        type: edge.type ?? "smoothstep",
        style: {
          ...edge.style,
          stroke: baseColor,
          strokeWidth,
          opacity,
        },
        markerEnd: edge.markerEnd ?? { type: MarkerType.ArrowClosed, color: baseColor },
        labelStyle: edge.label
          ? {
            ...(edge.labelStyle ?? {}),
            fill: baseColor,
            opacity: isFocused ? 0.9 : 0.35,
          }
          : edge.labelStyle,
        animated: isFocused ? edge.animated ?? true : false,
      };
    });
  }, [edges, focusSet]);

  const handleSelectNode = useCallback(
    (node: CanvasNode) => {
      setFocusedNodeId(node.id);
      if (node.type === "chatBlock") {
        openChatPanel(node.id);
      }
      if (node.type === "documentArtifact" || node.type === "tableArtifact") {
        updateNodeData(node.id, (current) => ({
          ...current,
          isExpanded: true,
        }));
      }
      if (reactFlowInstance) {
        const width = node.width ?? 300;
        const height = node.height ?? 200;
        reactFlowInstance.setCenter(
          node.position.x + width / 2,
          node.position.y + height / 2,
          { zoom: Math.max(0.6, reactFlowInstance.getZoom()) }
        );
      }
    },
    [openChatPanel, reactFlowInstance, setFocusedNodeId, updateNodeData]
  );

  const handleTidyLayout = useCallback(() => {
    const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
    const nextNodes = nodes.map((node) => ({ ...node }));
    const chatBlocks = nextNodes.filter((node) => node.type === "chatBlock");

    const placeNear = (anchor: { x: number; y: number }, nodeType: string) => {
      const size = getNodeSize(nodeType);
      const overlaps = (candidate: { x: number; y: number; width: number; height: number }) =>
        occupied.some(
          (rect) =>
            candidate.x < rect.x + rect.width + 40 &&
            candidate.x + candidate.width + 40 > rect.x &&
            candidate.y < rect.y + rect.height + 40 &&
            candidate.y + candidate.height + 40 > rect.y
        );

      for (let ring = 0; ring < 6; ring += 1) {
        const radius = 320 + ring * 220;
        const steps = Math.max(10, Math.ceil((2 * Math.PI * radius) / 260));
        const step = (2 * Math.PI) / steps;
        for (let i = 0; i < steps; i += 1) {
          const angle = step * i;
          const candidate = {
            x: anchor.x + Math.cos(angle) * radius - size.width / 2,
            y: anchor.y + Math.sin(angle) * radius - size.height / 2,
            width: size.width,
            height: size.height,
          };
          if (!overlaps(candidate)) {
            occupied.push(candidate);
            return { x: candidate.x, y: candidate.y };
          }
        }
      }
      return { x: anchor.x + 320, y: anchor.y };
    };

    const chatAnchors = new Map(
      chatBlocks.map((node) => [
        node.id,
        {
          x: node.position.x + (node.width ?? getNodeSize(node.type).width) / 2,
          y: node.position.y + (node.height ?? getNodeSize(node.type).height) / 2,
        },
      ])
    );

    const linkedByChat = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (chatAnchors.has(edge.source)) {
        linkedByChat.set(edge.source, [...(linkedByChat.get(edge.source) ?? []), edge.target]);
      }
      if (chatAnchors.has(edge.target)) {
        linkedByChat.set(edge.target, [...(linkedByChat.get(edge.target) ?? []), edge.source]);
      }
    });

    chatBlocks.forEach((chat) => {
      const size = getNodeSize(chat.type);
      occupied.push({
        x: chat.position.x,
        y: chat.position.y,
        width: chat.width ?? size.width,
        height: chat.height ?? size.height,
      });
    });

    linkedByChat.forEach((linkedIds, chatId) => {
      const anchor = chatAnchors.get(chatId);
      if (!anchor) return;
      linkedIds.forEach((nodeId) => {
        const node = nextNodes.find((item) => item.id === nodeId);
        if (!node || node.type === "chatBlock") return;
        node.position = placeNear(anchor, node.type ?? "documentArtifact");
      });
    });

    setNodes(nextNodes);
  }, [edges, nodes, setNodes]);

  const handleNodeDragStop = useCallback(
    (_: unknown, draggedNode: CanvasNode) => {
      const size = getNodeSize(draggedNode.type);
      const draggedRect = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
        width: draggedNode.width ?? size.width,
        height: draggedNode.height ?? size.height,
      };
      const others = nodes
        .filter((node) => node.id !== draggedNode.id)
        .map((node) => {
          const nodeSize = getNodeSize(node.type);
          return {
            x: node.position.x,
            y: node.position.y,
            width: node.width ?? nodeSize.width,
            height: node.height ?? nodeSize.height,
          };
        });

      const overlaps = others.some(
        (rect) =>
          draggedRect.x < rect.x + rect.width + 40 &&
          draggedRect.x + draggedRect.width + 40 > rect.x &&
          draggedRect.y < rect.y + rect.height + 40 &&
          draggedRect.y + draggedRect.height + 40 > rect.y
      );

      if (!overlaps) return;

      const anchor = {
        x: draggedRect.x + draggedRect.width / 2,
        y: draggedRect.y + draggedRect.height / 2,
      };

      const placeNear = () => {
        for (let ring = 0; ring < 6; ring += 1) {
          const radius = 280 + ring * 200;
          const steps = Math.max(8, Math.ceil((2 * Math.PI * radius) / 240));
          const step = (2 * Math.PI) / steps;
          for (let i = 0; i < steps; i += 1) {
            const angle = step * i;
            const candidate = {
              x: anchor.x + Math.cos(angle) * radius - draggedRect.width / 2,
              y: anchor.y + Math.sin(angle) * radius - draggedRect.height / 2,
              width: draggedRect.width,
              height: draggedRect.height,
            };
            const isFree = others.every(
              (rect) =>
                candidate.x >= rect.x + rect.width + 40 ||
                candidate.x + candidate.width + 40 <= rect.x ||
                candidate.y >= rect.y + rect.height + 40 ||
                candidate.y + candidate.height + 40 <= rect.y
            );
            if (isFree) {
              return { x: candidate.x, y: candidate.y };
            }
          }
        }
        return { x: draggedRect.x + 40, y: draggedRect.y + 40 };
      };

      const nextPosition = placeNear();
      const nextNodes = nodes.map((node) =>
        node.id === draggedNode.id ? { ...node, position: nextPosition } : node
      );
      setNodes(nextNodes);
    },
    [nodes, setNodes]
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-card">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border bg-card/90 px-2 py-1 text-xs shadow-sm">
        {focusedNodeId ? (
          <>
            <span className="text-muted-foreground">Focus mode</span>
            <Button variant="ghost" size="sm" className="h-7" onClick={clearFocus}>
              Exit
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground">Canvas</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="mr-1 h-4 w-4" />
          Search
        </Button>
        <Button variant="ghost" size="sm" className="h-7" onClick={handleTidyLayout}>
          <Shuffle className="mr-1 h-4 w-4" />
          Tidy
        </Button>
      </div>
      <CanvasCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        nodes={nodes}
        onSelectNode={handleSelectNode}
      />
      <ReactFlow<CanvasNode, Edge>
        nodes={nodesWithFocus}
        edges={edgesWithFocus}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={(_, nextViewport) => setViewport(nextViewport)}
        onInit={handleInit}
        onNodeClick={(_, node) => setFocusedNodeId(node.id)}
        onPaneClick={() => clearFocus()}
        onNodeDragStop={handleNodeDragStop}
        minZoom={0.2}
        maxZoom={1.8}
        noDragClassName="nodrag"
        noWheelClassName="nowheel"
      >
        <Background gap={24} size={1} />
        <MiniMap
          pannable
          zoomable
          className="bg-card shadow-sm"
          maskColor="rgba(0, 0, 0, 0.08)"
        />
        <Controls className="bg-card shadow-sm" />
      </ReactFlow>
    </div>
  );
}

export function CanvasWorkspace() {
  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full overflow-hidden rounded-xl border bg-card">
        <div className="flex-1 min-w-0">
          <CanvasSurface />
        </div>
        <CanvasChatSidebar />
      </div>
    </ReactFlowProvider>
  );
}
