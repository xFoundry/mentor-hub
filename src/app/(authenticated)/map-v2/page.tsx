"use client";

import { useMemo, useState, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ShieldAlert } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { MapProvider, useMap } from "@/contexts/map-context";
import { MapSurface } from "@/components/map/map-surface";
import { MapSidebar } from "@/components/map/map-sidebar";
import { MapWorkspacePanel } from "@/components/map/map-workspace-panel";
import { MapWorkspaceOverlay } from "@/components/map/map-workspace-overlay";
import { MapMinimap } from "@/components/map/map-minimap";
import { MapControls } from "@/components/map/map-controls";

import "@xyflow/react/dist/style.css";

function MapV2Content() {
  const { expandedTileId, sidebarMode, workspaceDisplayMode } = useMap();
  const [showMinimap, setShowMinimap] = useState(false);

  // Storage key for canvas ID
  const {
    realUserContext,
    userContext,
  } = useEffectiveUser();

  const canvasId = useMemo(() => {
    const identity =
      realUserContext?.auth0Id ??
      realUserContext?.email ??
      userContext?.auth0Id ??
      userContext?.email ??
      "anonymous";
    return `map_v2_${identity}`;
  }, [realUserContext, userContext]);

  // Keyboard shortcut for minimap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "m" && !event.metaKey && !event.ctrlKey) {
        const target = event.target as HTMLElement;
        // Skip if in editable element (input, textarea, or contenteditable)
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest("[contenteditable]")
        ) {
          return;
        }
        event.preventDefault();
        setShowMinimap((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isWorkspaceOpen = expandedTileId !== null;

  const isFull = sidebarMode === "full";

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Flex container for normal layout */}
      <div className="flex h-full w-full">
        {/* Main map area */}
        <div className="flex-1 min-w-0 relative">
          <ReactFlowProvider>
            <MapSurface />

            {/* Minimap */}
            {showMinimap && (
              <div className="absolute bottom-4 left-4 z-10">
                <MapMinimap />
              </div>
            )}

            {/* Custom controls */}
            <div className="absolute bottom-4 right-4 z-10">
              <MapControls
                showMinimap={showMinimap}
                onToggleMinimap={() => setShowMinimap((prev) => !prev)}
              />
            </div>
          </ReactFlowProvider>

          {/* Workspace overlay mode - renders over map only */}
          {isWorkspaceOpen && workspaceDisplayMode === "overlay" && (
            <MapWorkspaceOverlay />
          )}
        </div>

        {/* Workspace panel (slides in from right when tile is expanded) - only in panel mode */}
        {isWorkspaceOpen && workspaceDisplayMode === "panel" && (
          <MapWorkspacePanel width={480} />
        )}

        {/* Chat sidebar - in flex when not full, absolute when full */}
        {/* Show chat when: workspace closed, OR workspace in overlay mode */}
        {(!isWorkspaceOpen || workspaceDisplayMode === "overlay") &&
          sidebarMode !== "hidden" &&
          !isFull && <MapSidebar canvasId={canvasId} />}
      </div>

      {/* Full mode sidebar - overlays the map */}
      {/* Show chat when: workspace closed, OR workspace in overlay mode */}
      {(!isWorkspaceOpen || workspaceDisplayMode === "overlay") && isFull && (
        <div className="absolute inset-y-0 right-0 z-20">
          <MapSidebar canvasId={canvasId} />
        </div>
      )}
    </div>
  );
}

export default function MapV2Page() {
  const {
    userType,
    userContext,
    realUserContext,
    isLoading: isUserLoading,
  } = useEffectiveUser();

  const storageKey = useMemo(() => {
    const identity =
      realUserContext?.auth0Id ??
      realUserContext?.email ??
      userContext?.auth0Id ??
      userContext?.email ??
      "anonymous";
    return `map_v2_state_${identity}`;
  }, [realUserContext, userContext]);

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (userType !== "staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm">
          You don&apos;t have permission to access the Map v2 page.
          This feature is only available to staff members.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-0 h-full w-full overflow-hidden">
        <MapProvider storageKey={storageKey}>
          <MapV2Content />
        </MapProvider>
      </div>
    </TooltipProvider>
  );
}
