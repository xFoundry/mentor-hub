"use client";

import { useCallback, useMemo, useState } from "react";
import type { Edge, NodeTypes, ReactFlowInstance } from "@xyflow/react";
import { Controls, ReactFlow, ReactFlowProvider, MarkerType } from "@xyflow/react";
import { useCanvas } from "@/contexts/canvas-context";
import { ZoneHexNode } from "@/components/canvas/nodes/zone-hex-node";
import { TableArtifactNode } from "@/components/canvas/nodes/table-artifact-node";
import { DocumentArtifactNode } from "@/components/canvas/nodes/document-artifact-node";
import { GraphEntityNode } from "@/components/canvas/nodes/graph-entity-node";
import { CanvasChatSidebar } from "@/components/canvas/canvas-chat-sidebar";
import type { CanvasNode } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, Shuffle } from "lucide-react";
import { CanvasCommandPalette } from "@/components/canvas/canvas-command-palette";
import { HEX_HEIGHT, HEX_WIDTH, coordToPosition, positionToCoord } from "@/lib/hex-grid";
import { MapGridBackground } from "@/components/canvas/map-grid-background";
import { MapTerritories } from "@/components/canvas/map-territories";

const nodeTypes = {
  zone: ZoneHexNode,
  chatBlock: ZoneHexNode,
  tableArtifact: TableArtifactNode,
  documentArtifact: DocumentArtifactNode,
  graphEntity: GraphEntityNode,
} satisfies NodeTypes;

const NODE_SIZES: Record<string, { width: number; height: number }> = {
  zone: { width: HEX_WIDTH, height: HEX_HEIGHT },
  chatBlock: { width: HEX_WIDTH, height: HEX_HEIGHT },
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

  const handleInit = useCallback(
    (instance: ReactFlowInstance<CanvasNode, Edge>) => {
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
      if (node.type === "zone" || node.type === "chatBlock") {
        openChatPanel(node.id);
      }
      if (node.type === "documentArtifact" || node.type === "tableArtifact") {
        updateNodeData(node.id, (current) => ({
          ...current,
          isExpanded: true,
        }));
      }
    },
    [openChatPanel, setFocusedNodeId, updateNodeData]
  );

  const handleTidyLayout = useCallback(() => {
    const nextNodes = nodes.map((node): CanvasNode => {
      if (node.type !== "zone" && node.type !== "chatBlock") return node;
      const coord = positionToCoord(node.position);
      return {
        ...node,
        type: "zone" as const,
        position: coordToPosition(coord),
        data: {
          ...(node.data ?? {}),
          coord,
        },
      };
    });
    setNodes(nextNodes);
  }, [nodes, setNodes]);

  const handleNodeDragStop = useCallback(
    (_: unknown, draggedNode: CanvasNode) => {
      if (draggedNode.type === "zone" || draggedNode.type === "chatBlock") {
        const coord = positionToCoord(draggedNode.position);
        const position = coordToPosition(coord);
        const nextNodes = nodes.map((node): CanvasNode =>
          node.id === draggedNode.id
            ? {
              ...node,
              type: "zone" as const,
              position,
              data: {
                ...(node.data ?? {}),
                coord,
              },
            }
            : node
        );
        setNodes(nextNodes);
        return;
      }

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
          <span className="text-muted-foreground">Map</span>
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
          Snap
        </Button>
      </div>
      <CanvasCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        nodes={nodes}
        onSelectNode={handleSelectNode}
      />
      <ReactFlow<CanvasNode, Edge>
        className="map-flow"
        nodes={nodesWithFocus}
        edges={edgesWithFocus}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={(_, nextViewport) => setViewport(nextViewport)}
        onInit={handleInit}
        onNodeClick={(_, node) => handleSelectNode(node)}
        onPaneClick={() => clearFocus()}
        onNodeDragStop={handleNodeDragStop}
        minZoom={0.2}
        maxZoom={1.8}
        noDragClassName="nodrag"
        noWheelClassName="nowheel"
      >
        <MapGridBackground />
        <MapTerritories />
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
