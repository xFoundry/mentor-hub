"use client";

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import type { Node, NodeTypes, ReactFlowInstance, Viewport, NodeChange } from "@xyflow/react";
import { Controls, ReactFlow, applyNodeChanges, Panel } from "@xyflow/react";
import { Search, Plus, RotateCcw, GitMerge, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useMap,
  MAP_HEX_WIDTH,
  MAP_HEX_HEIGHT,
  mapCoordToPosition,
  mapPositionToCoord,
  mapCoordKey,
  HEX_DIRECTIONS,
} from "@/contexts/map-context";
import type { TileData, HexCoord, ProjectTerritory } from "@/types/map";
import { MapTileNode } from "./map-tile-node";
import { MapTerritoryOverlay } from "./map-territory-overlay";
import { MapCommandPalette } from "./map-command-palette";
import { MapHexGrid, getHexAtPoint } from "./map-hex-grid";
import { MapOnboarding } from "./map-onboarding";

// localStorage key for "don't show merge dialog" preference
const MERGE_DIALOG_DISMISSED_KEY = "map_merge_dialog_dismissed";

// Register node types
const nodeTypes: NodeTypes = {
  tile: MapTileNode,
};

// Extended node data with display-time properties
interface MapTileNodeData extends TileData {
  isActive?: boolean;
}

// Convert tile data to React Flow node with display properties
function tileToNode(
  tile: TileData,
  activeTileId: string | null
): Node<MapTileNodeData, "tile"> {
  const isActive = tile.id === activeTileId;
  return {
    id: tile.id,
    type: "tile",
    position: mapCoordToPosition(tile.coord),
    data: {
      ...tile,
      isActive,
    },
    draggable: true,
    selectable: true,
    // Bring active tile to front
    zIndex: isActive ? 100 : 0,
  };
}

export function MapSurface() {
  const {
    tiles,
    territories,
    viewport,
    hasLoaded,
    activeTileId,
    sidebarMode,
    setActiveTileId,
    setExpandedTileId,
    setViewport,
    setSidebarMode,
    addTile,
    updateTile,
    createTile,
    resetMap,
  } = useMap();

  const [commandOpen, setCommandOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    Node<MapTileNodeData, "tile">
  > | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dropPreviewCoord, setDropPreviewCoord] = useState<HexCoord | null>(null);

  // Nodes state - managed separately from tiles to allow React Flow to update positions during drag
  const [nodes, setNodes] = useState<Node<MapTileNodeData, "tile">[]>([]);

  // Track whether we're currently dragging to avoid syncing from tiles during drag
  const isDraggingRef = useRef(false);

  // Calculate which hexes are occupied (for hover detection)
  const occupiedCoords = useMemo(() => {
    const set = new Set<string>();
    tiles.forEach((tile) => {
      set.add(mapCoordKey(tile.coord));
    });
    return set;
  }, [tiles]);

  // State for merge territory confirmation dialog
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [pendingMergeCoord, setPendingMergeCoord] = useState<HexCoord | null>(null);
  const [pendingMergeTerritories, setPendingMergeTerritories] = useState<ProjectTerritory[]>([]);
  const [pendingMergeNodeId, setPendingMergeNodeId] = useState<string | null>(null); // For drag-drop merges
  const [dontShowMergeDialogAgain, setDontShowMergeDialogAgain] = useState(false);

  // Check if user has dismissed the merge dialog permanently
  const mergeDialogDismissed = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      mergeDialogDismissed.current = localStorage.getItem(MERGE_DIALOG_DISMISSED_KEY) === "true";
    }
  }, []);

  // Helper to get territories adjacent to a hex coord
  const getAdjacentTerritories = useCallback(
    (coord: HexCoord, excludeTileId?: string): ProjectTerritory[] => {
      const adjacentTerritoryIds = new Set<string>();
      const result: ProjectTerritory[] = [];

      // Check each neighbor direction
      for (const dir of HEX_DIRECTIONS) {
        const neighborCoord = { q: coord.q + dir.q, r: coord.r + dir.r };
        const neighborKey = mapCoordKey(neighborCoord);

        // Find if a tile exists at this neighbor (excluding the specified tile)
        const neighborTile = tiles.find(
          (t) => mapCoordKey(t.coord) === neighborKey && t.id !== excludeTileId
        );
        if (!neighborTile) continue;

        // Find which territory this tile belongs to
        for (const territory of territories) {
          if (territory.tileIds.includes(neighborTile.id) && !adjacentTerritoryIds.has(territory.id)) {
            adjacentTerritoryIds.add(territory.id);
            result.push(territory);
          }
        }
      }

      return result;
    },
    [tiles, territories]
  );

  // Helper to get the territory a tile belongs to
  const getTileTerritory = useCallback(
    (tileId: string): ProjectTerritory | null => {
      for (const territory of territories) {
        if (territory.tileIds.includes(tileId)) {
          return territory;
        }
      }
      return null;
    },
    [territories]
  );

  // Sync nodes from tiles when tiles change (but not during drag)
  useEffect(() => {
    if (isDraggingRef.current) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(tiles.map((tile) => tileToNode(tile, activeTileId)));
  }, [tiles, activeTileId]);

  // Handle React Flow initialization
  const handleInit = useCallback(
    (instance: ReactFlowInstance<Node<MapTileNodeData, "tile">>) => {
      setReactFlowInstance(instance);
      if (hasLoaded && viewport) {
        instance.setViewport(viewport);
      } else {
        instance.fitView({ padding: 0.3, maxZoom: 1.2 });
      }
    },
    [hasLoaded, viewport]
  );

  // Handle viewport changes
  const handleMoveEnd = useCallback(
    (_: unknown, newViewport: Viewport) => {
      setViewport(newViewport);
    },
    [setViewport]
  );

  // Handle node click - single click selects and opens sidebar
  const handleNodeClick = useCallback(
    (_: unknown, node: Node<MapTileNodeData, "tile">) => {
      setActiveTileId(node.id);
    },
    [setActiveTileId]
  );

  // Handle node double click - expands workspace panel
  const handleNodeDoubleClick = useCallback(
    (_: unknown, node: Node<MapTileNodeData, "tile">) => {
      setExpandedTileId(node.id);
    },
    [setExpandedTileId]
  );

  // Create tile at a specific coordinate
  const createTileAtCoord = useCallback(
    (coord: HexCoord) => {
      const newTile = createTile("Untitled");
      newTile.coord = coord;

      addTile(newTile);
      setActiveTileId(newTile.id);
      setHoveredHex(null);
    },
    [createTile, addTile, setActiveTileId]
  );

  // Handle pane click - create tile if hovering empty hex
  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!hoveredHex) return;

      // Check if this hex is adjacent to multiple territories (shared space)
      const adjacentTerritories = getAdjacentTerritories(hoveredHex);

      if (adjacentTerritories.length > 1 && !mergeDialogDismissed.current) {
        // Show confirmation dialog for shared territory
        setPendingMergeCoord(hoveredHex);
        setPendingMergeTerritories(adjacentTerritories);
        setMergeDialogOpen(true);
        return;
      }

      // Create tile directly
      createTileAtCoord(hoveredHex);
    },
    [hoveredHex, getAdjacentTerritories, createTileAtCoord]
  );

  // Handle merge dialog confirmation
  const handleMergeConfirm = useCallback(() => {
    // Save preference if checked
    if (dontShowMergeDialogAgain && typeof window !== "undefined") {
      localStorage.setItem(MERGE_DIALOG_DISMISSED_KEY, "true");
      mergeDialogDismissed.current = true;
    }

    if (pendingMergeNodeId && pendingMergeCoord) {
      // This is a drag-drop merge - update the existing tile's position
      updateTile(pendingMergeNodeId, { coord: pendingMergeCoord });
    } else if (pendingMergeCoord) {
      // This is a new tile creation
      createTileAtCoord(pendingMergeCoord);
    }

    setMergeDialogOpen(false);
    setPendingMergeCoord(null);
    setPendingMergeTerritories([]);
    setPendingMergeNodeId(null);
    setDontShowMergeDialogAgain(false);
  }, [pendingMergeCoord, pendingMergeNodeId, dontShowMergeDialogAgain, createTileAtCoord, updateTile]);

  // Handle merge dialog cancel
  const handleMergeCancel = useCallback(() => {
    // If this was a drag operation, revert to original position
    if (pendingMergeNodeId) {
      setNodes(tiles.map((tile) => tileToNode(tile, activeTileId)));
    }

    setMergeDialogOpen(false);
    setPendingMergeCoord(null);
    setPendingMergeTerritories([]);
    setPendingMergeNodeId(null);
    setDontShowMergeDialogAgain(false);
    setHoveredHex(null);
  }, [pendingMergeNodeId, tiles, activeTileId]);

  // Handle pane mouse move - detect hovered hex (only when not dragging)
  const handlePaneMouseMove = useCallback(
    (event: React.MouseEvent) => {
      // Don't show hover when dragging a node
      if (draggingNodeId) {
        setHoveredHex(null);
        return;
      }

      if (!reactFlowInstance) {
        setHoveredHex(null);
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const coord = getHexAtPoint(position.x, position.y, occupiedCoords);
      setHoveredHex(coord);
    },
    [reactFlowInstance, occupiedCoords, draggingNodeId]
  );

  // Handle pane mouse leave
  const handlePaneMouseLeave = useCallback(() => {
    setHoveredHex(null);
  }, []);

  // Throttle ref for drop preview updates
  const lastDropPreviewUpdate = useRef(0);

  // Handle nodes change - apply position changes for smooth dragging
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<MapTileNodeData, "tile">>[]) => {
      // Apply all changes including position updates during drag
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  // Handle node drag start
  const handleNodeDragStart = useCallback(
    (_: unknown, node: Node<MapTileNodeData, "tile">) => {
      isDraggingRef.current = true;
      setDraggingNodeId(node.id);
      setHoveredHex(null);
    },
    []
  );

  // Handle node drag - update drop preview (throttled)
  const handleNodeDrag = useCallback(
    (_: unknown, draggedNode: Node<MapTileNodeData, "tile">) => {
      // Throttle drop preview updates to reduce re-renders
      const now = Date.now();
      if (now - lastDropPreviewUpdate.current < 50) return;
      lastDropPreviewUpdate.current = now;

      const coord = mapPositionToCoord(draggedNode.position);

      // Check if coordinate is already occupied (excluding the dragged node)
      const occupiedKey = mapCoordKey(coord);
      const isOccupied = tiles.some(
        (tile) => tile.id !== draggedNode.id && mapCoordKey(tile.coord) === occupiedKey
      );

      // Only show preview on valid drop locations
      setDropPreviewCoord(isOccupied ? null : coord);
    },
    [tiles]
  );

  // Handle node drag stop - snap to hex grid
  const handleNodeDragStop = useCallback(
    (_: unknown, draggedNode: Node<MapTileNodeData, "tile">) => {
      const coord = mapPositionToCoord(draggedNode.position);

      // Check if coordinate is already occupied
      const occupiedKey = mapCoordKey(coord);
      const isOccupied = tiles.some(
        (tile) => tile.id !== draggedNode.id && mapCoordKey(tile.coord) === occupiedKey
      );

      // Clear drag state
      isDraggingRef.current = false;
      setDraggingNodeId(null);
      setDropPreviewCoord(null);

      if (isOccupied) {
        // Revert to original position - force sync from tiles
        setNodes(tiles.map((tile) => tileToNode(tile, activeTileId)));
        return;
      }

      // Check if this drop would merge territories
      if (!mergeDialogDismissed.current) {
        const draggedTileTerritory = getTileTerritory(draggedNode.id);
        const adjacentTerritories = getAdjacentTerritories(coord, draggedNode.id);

        // Check if there are multiple adjacent territories, or if the dragged tile's
        // territory is different from an adjacent territory
        const uniqueTerritoryIds = new Set<string>();
        if (draggedTileTerritory) {
          uniqueTerritoryIds.add(draggedTileTerritory.id);
        }
        adjacentTerritories.forEach((t) => uniqueTerritoryIds.add(t.id));

        // Build the list of territories that would be merged
        const mergeTerritories: ProjectTerritory[] = [];
        if (draggedTileTerritory && adjacentTerritories.some((t) => t.id !== draggedTileTerritory.id)) {
          mergeTerritories.push(draggedTileTerritory);
        }
        adjacentTerritories.forEach((t) => {
          if (!mergeTerritories.some((mt) => mt.id === t.id)) {
            mergeTerritories.push(t);
          }
        });

        if (mergeTerritories.length > 1) {
          // Show confirmation dialog
          setPendingMergeCoord(coord);
          setPendingMergeTerritories(mergeTerritories);
          setPendingMergeNodeId(draggedNode.id);
          setMergeDialogOpen(true);
          return;
        }
      }

      // Snap to grid by updating tile coord (this will trigger a tiles change which syncs nodes)
      updateTile(draggedNode.id, { coord });
    },
    [tiles, activeTileId, updateTile, getTileTerritory, getAdjacentTerritories]
  );

  // Helper to check if target is an editable element (input, textarea, or contenteditable)
  const isEditableElement = (target: HTMLElement): boolean => {
    return (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable ||
      !!target.closest("[contenteditable]")
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Command palette - Cmd/Ctrl+K works everywhere
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      // Skip all other shortcuts if in an editable element
      if (isEditableElement(target)) return;

      // Forward slash also opens command palette
      if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      // New tile
      if (event.key === "n" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        const newTile = createTile("Untitled");
        addTile(newTile);
        setActiveTileId(newTile.id);
        return;
      }

      // Tab - cycle through tiles
      if (event.key === "Tab" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();

        if (tiles.length === 0) return;

        const currentIndex = tiles.findIndex((t) => t.id === activeTileId);
        const direction = event.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + direction + tiles.length) % tiles.length;
        setActiveTileId(tiles[nextIndex].id);
        return;
      }

      // Enter - expand workspace panel
      if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
        if (activeTileId) {
          event.preventDefault();
          setExpandedTileId(activeTileId);
        }
        return;
      }

      // Escape - close workspace panel
      if (event.key === "Escape") {
        setExpandedTileId(null);
        return;
      }

      // 0 - fit view
      if (event.key === "0" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        reactFlowInstance?.fitView({ padding: 0.3, maxZoom: 1.2 });
        return;
      }

      // F - toggle full sidebar mode
      if (event.key === "f" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setSidebarMode(sidebarMode === "full" ? "expanded" : "full");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    tiles,
    activeTileId,
    sidebarMode,
    createTile,
    addTile,
    setActiveTileId,
    setExpandedTileId,
    setSidebarMode,
    reactFlowInstance,
  ]);

  // Handle command palette selection
  const handleSelectTile = useCallback(
    (tileId: string) => {
      setActiveTileId(tileId);
      const tile = tiles.find((t) => t.id === tileId);
      if (tile && reactFlowInstance) {
        const position = mapCoordToPosition(tile.coord);
        reactFlowInstance.setCenter(
          position.x + MAP_HEX_WIDTH / 2,
          position.y + MAP_HEX_HEIGHT / 2,
          { zoom: 1, duration: 300 }
        );
      }
    },
    [tiles, setActiveTileId, reactFlowInstance]
  );

  // Handle new tile creation
  const handleNewTile = useCallback(() => {
    const newTile = createTile("Untitled");
    addTile(newTile);
    setActiveTileId(newTile.id);
  }, [createTile, addTile, setActiveTileId]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Reset the entire map? This cannot be undone.");
      if (!confirmed) return;
    }
    resetMap();
  }, [resetMap]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-card">
      {/* Onboarding overlay for new users */}
      <MapOnboarding
        hasTiles={tiles.length > 0}
        forceShow={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Toolbar */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border bg-card/95 px-2 py-1.5 shadow-sm backdrop-blur-sm">
        <span className="px-1 text-xs font-medium text-muted-foreground">Map</span>
        <div className="h-4 w-px bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="ml-1 hidden rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:inline">
                /
              </kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Search and navigate between tiles</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleNewTile}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New</span>
              <kbd className="ml-1 hidden rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:inline">
                N
              </kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Create a new tile workspace</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Reset the entire map</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setShowHelp(true)}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Show help guide</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Command palette */}
      <MapCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        tiles={tiles}
        onSelectTile={handleSelectTile}
        onNewTile={handleNewTile}
      />

      {/* React Flow canvas */}
      <ReactFlow<Node<MapTileNodeData, "tile">>
        className="map-flow-v2"
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onInit={handleInit}
        onMoveEnd={handleMoveEnd}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        onPaneMouseMove={handlePaneMouseMove}
        onPaneMouseLeave={handlePaneMouseLeave}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        minZoom={0.15}
        maxZoom={2}
        fitView={!hasLoaded}
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        selectNodesOnDrag={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        noDragClassName="nodrag"
        noWheelClassName="nowheel"
        proOptions={{ hideAttribution: true }}
      >
        {/* Hex grid with hover interactions */}
        <MapHexGrid
          hoveredCoord={hoveredHex}
          isDragging={draggingNodeId !== null}
          dropPreviewCoord={dropPreviewCoord}
          draggingNodeId={draggingNodeId}
          territories={territories}
        />
        {/* Territory overlay - rendered on top of nodes */}
        <MapTerritoryOverlay />
        {/* Controls */}
        <Controls
          className={cn(
            "bg-card/95 backdrop-blur-sm shadow-sm rounded-lg border",
            "[&>button]:border-0 [&>button]:bg-transparent [&>button]:text-muted-foreground",
            "[&>button:hover]:bg-muted [&>button:hover]:text-foreground"
          )}
          showZoom
          showFitView
          showInteractive={false}
        />
      </ReactFlow>

      {/* Merge territory confirmation dialog */}
      <AlertDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-primary" />
              Merge Territories
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {pendingMergeNodeId
                    ? "Moving this tile here will merge these territories:"
                    : "This location is adjacent to multiple territories. Adding a tile here will merge these contexts:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendingMergeTerritories.map((territory) => (
                    <span
                      key={territory.id}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${territory.color}20`,
                        color: territory.color,
                        border: `1px solid ${territory.color}40`,
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: territory.color }}
                      />
                      {territory.name}
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  {pendingMergeNodeId
                    ? "This will combine the contexts of all connected territories."
                    : "The new tile will share context with all connected territories."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowMergeDialogAgain}
              onCheckedChange={(checked) => setDontShowMergeDialogAgain(checked === true)}
            />
            <Label
              htmlFor="dont-show-again"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Don&apos;t show this again
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleMergeCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMergeConfirm}>
              {pendingMergeNodeId ? "Move Tile" : "Create Tile"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
