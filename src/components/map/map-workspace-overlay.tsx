"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  FileText,
  Table,
  Network,
  Pin,
  PinOff,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMap } from "@/contexts/map-context";
import type { TileArtifact } from "@/types/map";
import { STATUS_LABELS } from "@/types/map";

const ARTIFACT_ICONS = {
  document: FileText,
  table: Table,
  graph: Network,
};

function ArtifactCard({
  artifact,
  isPinned,
  onTogglePin,
  onDelete,
  onClick,
}: {
  artifact: TileArtifact;
  isPinned: boolean;
  onTogglePin: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const Icon = ARTIFACT_ICONS[artifact.type];

  const preview = useMemo(() => {
    if (artifact.summary) return artifact.summary;

    if (artifact.type === "document") {
      const content = artifact.content as { text?: string };
      return content?.text?.slice(0, 100) ?? "Document";
    }

    if (artifact.type === "table") {
      const content = artifact.content as { rows?: unknown[] };
      const rowCount = content?.rows?.length ?? 0;
      return `${rowCount} row${rowCount !== 1 ? "s" : ""}`;
    }

    if (artifact.type === "graph") {
      const content = artifact.content as {
        nodes?: unknown[];
        edges?: unknown[];
      };
      const nodeCount = content?.nodes?.length ?? 0;
      return `${nodeCount} node${nodeCount !== 1 ? "s" : ""}`;
    }

    return "Artifact";
  }, [artifact]);

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-3 transition-all cursor-pointer",
        "hover:border-primary/40 hover:shadow-sm"
      )}
      onClick={onClick}
    >
      {isPinned && (
        <div className="absolute -top-1.5 -right-1.5 rounded-full bg-primary p-1">
          <Pin className="h-2.5 w-2.5 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{artifact.title}</div>
          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {preview}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <span className="uppercase tracking-wide">{artifact.type}</span>
            <span>&middot;</span>
            <span>{new Date(artifact.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            title={isPinned ? "Unpin" : "Pin"}
          >
            {isPinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MapWorkspaceOverlay() {
  const {
    tiles,
    expandedTileId,
    setExpandedTileId,
    setSidebarMode,
    deleteArtifact,
    toggleArtifactPin,
  } = useMap();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null
  );

  const tile = useMemo(
    () => tiles.find((t) => t.id === expandedTileId),
    [tiles, expandedTileId]
  );

  const handleClose = useCallback(() => {
    setExpandedTileId(null);
    setSidebarMode("expanded");
    setSelectedArtifactId(null);
  }, [setExpandedTileId, setSidebarMode]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleDeleteArtifact = useCallback(
    (artifactId: string) => {
      if (!expandedTileId) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          "Delete this artifact? This cannot be undone."
        );
        if (!confirmed) return;
      }
      deleteArtifact(expandedTileId, artifactId);
      if (selectedArtifactId === artifactId) {
        setSelectedArtifactId(null);
      }
    },
    [expandedTileId, deleteArtifact, selectedArtifactId]
  );

  const handleTogglePin = useCallback(
    (artifactId: string) => {
      if (expandedTileId) {
        toggleArtifactPin(expandedTileId, artifactId);
      }
    },
    [expandedTileId, toggleArtifactPin]
  );

  const sortedArtifacts = useMemo(() => {
    if (!tile) return [];

    return [...tile.artifacts].sort((a, b) => {
      const aIsPinned = tile.pinnedArtifactIds.includes(a.id);
      const bIsPinned = tile.pinnedArtifactIds.includes(b.id);

      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;

      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [tile]);

  const recentActivity = useMemo(() => {
    if (!tile) return [];

    return tile.messages
      .filter((m) => m.role === "assistant" && m.content.trim())
      .slice(-5)
      .reverse()
      .map((m) => ({
        id: m.id,
        time: new Date(m.timestamp),
        preview: m.content.slice(0, 80),
      }));
  }, [tile]);

  if (!tile) return null;

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center animate-in fade-in duration-150"
      onClick={handleBackdropClick}
    >
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm pointer-events-auto"
        onClick={handleBackdropClick}
      />

      {/* Overlay content */}
      <div className="pointer-events-auto bg-card/95 backdrop-blur-xl border rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold truncate">{tile.title}</h2>
              <Badge variant="secondary" className="text-xs">
                {STATUS_LABELS[tile.status]}
              </Badge>
            </div>
            {tile.description && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {tile.description}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Two-column layout for larger screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Documents section */}
              <section className="md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Documents
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {tile.artifacts.length}
                  </Badge>
                </div>

                {sortedArtifacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sortedArtifacts.map((artifact) => (
                      <ArtifactCard
                        key={artifact.id}
                        artifact={artifact}
                        isPinned={tile.pinnedArtifactIds.includes(artifact.id)}
                        onTogglePin={() => handleTogglePin(artifact.id)}
                        onDelete={() => handleDeleteArtifact(artifact.id)}
                        onClick={() => setSelectedArtifactId(artifact.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <div className="text-sm text-muted-foreground">
                      No documents yet
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-1">
                      Documents created during chat will appear here
                    </div>
                  </div>
                )}
              </section>

              {/* Recent Activity section */}
              <section>
                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                    >
                      <span>Recent Activity</span>
                      {historyOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    {recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {recentActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-muted-foreground/70">
                                {activity.time.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div className="line-clamp-2">
                                {activity.preview}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground/70 text-center py-4">
                        No recent activity
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </section>

              {/* Quick stats */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Quick Stats
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-2xl font-semibold">
                      {tile.contentSummary.documentCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Documents
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-2xl font-semibold">
                      {tile.contentSummary.tableCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Tables
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-2xl font-semibold">
                      {tile.messages.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Messages
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span>
            Created{" "}
            {new Date(tile.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
