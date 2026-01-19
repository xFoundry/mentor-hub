"use client";

import { useCallback } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { Minus, Plus, Maximize, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MapControlsProps {
  className?: string;
  showMinimap?: boolean;
  onToggleMinimap?: () => void;
}

export function MapControls({
  className,
  showMinimap,
  onToggleMinimap,
}: MapControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const viewport = useViewport();

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.3, duration: 300, maxZoom: 1.2 });
  }, [fitView]);

  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-card/95 backdrop-blur-sm px-1.5 py-1 shadow-sm",
        className
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomOut}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom out</TooltipContent>
      </Tooltip>

      <div className="w-12 text-center text-xs text-muted-foreground tabular-nums">
        {zoomPercent}%
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomIn}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom in</TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-border mx-0.5" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleFitView}
          >
            <Maximize className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Fit view (0)</TooltipContent>
      </Tooltip>

      {onToggleMinimap && (
        <>
          <div className="h-4 w-px bg-border mx-0.5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showMinimap ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={onToggleMinimap}
              >
                <Map className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Toggle minimap (M)</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
