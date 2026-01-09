"use client";

/**
 * Citation display component.
 * Shows sources used in assistant responses.
 */

import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CitationData } from "@/types/chat";

interface ChatCitationProps {
  citations: CitationData[];
}

/**
 * Get a friendly name for a citation source.
 */
function getSourceName(source: string): string {
  if (source.startsWith("cognee:")) {
    const type = source.replace("cognee:", "");
    switch (type) {
      case "chunks":
        return "Document";
      case "summaries":
        return "Summary";
      case "graph":
        return "Knowledge Graph";
      case "rag_completion":
        return "RAG";
      case "natural_language":
        return "NL Query";
      default:
        return type;
    }
  }
  if (source === "graphiti") {
    return "Memory";
  }
  return source;
}

/**
 * Get a color variant for a citation source.
 */
function getSourceVariant(
  source: string
): "default" | "secondary" | "outline" {
  if (source.includes("chunks") || source.includes("summaries")) {
    return "default";
  }
  if (source.includes("graph") || source === "graphiti") {
    return "secondary";
  }
  return "outline";
}

export function ChatCitation({ citations }: ChatCitationProps) {
  if (!citations.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <TooltipProvider>
        {citations.map((citation, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Badge
                variant={getSourceVariant(citation.source)}
                className="cursor-help gap-1 text-xs"
              >
                <FileText className="h-3 w-3" />
                {getSourceName(citation.source)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{citation.content}</p>
              {citation.confidence < 1 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Confidence: {Math.round(citation.confidence * 100)}%
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
