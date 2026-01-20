"use client";

import { FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArtifactData } from "@/types/chat";

interface ChatArtifactCardProps {
  artifact: ArtifactData;
  onOpen?: (artifact: ArtifactData) => void;
}

export function ChatArtifactCard({ artifact, onOpen }: ChatArtifactCardProps) {
  const payload = artifact.payload as { path?: string } | undefined;
  const path = payload?.path || artifact.summary;

  return (
    <div className="max-w-[85%] rounded-xl border bg-card/80 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {artifact.title || "New artifact"}
            </p>
            {path ? (
              <p className="text-xs text-muted-foreground truncate">{path}</p>
            ) : null}
          </div>
        </div>
        {onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(artifact)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            )}
          >
            Open
            <ExternalLink className="h-3 w-3" />
          </button>
        ) : null}
      </div>
      {artifact.summary && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
          {artifact.summary}
        </p>
      )}
    </div>
  );
}
