"use client";

/**
 * Citation Node Extension for Tiptap
 *
 * A proper inline node extension that renders citations as interactive
 * React components with tooltips. Uses NodeViewRenderer for full React
 * integration within the Tiptap document.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Calendar,
  Users,
  User,
  BookOpen,
  Database,
} from "lucide-react";
import type { RichCitationData } from "@/types/chat";

// Global citation context - set by the parent component
let citationLookup: Map<number, RichCitationData> = new Map();

export function setCitationContext(citations: RichCitationData[]) {
  citationLookup = new Map();
  for (const citation of citations) {
    // Handle both camelCase and snake_case from backend
    const c = citation as unknown as Record<string, unknown>;
    const sourceNumber = c.sourceNumber ?? c.source_number;
    if (typeof sourceNumber === "number") {
      citationLookup.set(sourceNumber, citation);
    }
  }
}

export function clearCitationContext() {
  citationLookup = new Map();
}

const CITATION_ICON_BY_TYPE = {
  task: FileText,
  session: Calendar,
  team: Users,
  mentor: User,
  document: BookOpen,
  entity: Database,
} as const;

/**
 * Normalize citation from backend (snake_case to camelCase).
 */
function normalizeCitation(
  citation: RichCitationData | Record<string, unknown>
): RichCitationData {
  const c = citation as Record<string, unknown>;
  return {
    source: (c.source as string) || "",
    entityType: ((c.entityType || c.entity_type || "entity") as string),
    displayName: ((c.displayName || c.display_name || c.source || "Unknown") as string),
    content: (c.content as string) || "",
    confidence: (c.confidence as number) || 1.0,
    groupKey: ((c.groupKey || c.group_key || "other") as string),
    sourceNumber: (c.sourceNumber || c.source_number) as number | undefined,
    metadata: (c.metadata as RichCitationData["metadata"]) || undefined,
  };
}

/**
 * React component for rendering the citation node.
 */
function CitationNodeView({ node }: NodeViewProps) {
  const sourceNumber = (node.attrs.sourceNumber as number) || 1;
  const rawCitation = citationLookup.get(sourceNumber);
  const citation = rawCitation ? normalizeCitation(rawCitation) : null;
  const Icon = citation
    ? (CITATION_ICON_BY_TYPE[citation.entityType as keyof typeof CITATION_ICON_BY_TYPE] ||
        FileText)
    : FileText;

  if (!citation) {
    // Fallback for citations without data
    return (
      <NodeViewWrapper as="span" className="citation-node-wrapper">
        <span className="citation-badge citation-badge-fallback">
          {sourceNumber}
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="citation-node-wrapper">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="citation-badge">
              <Icon className="citation-badge-icon" />
              <span>{sourceNumber}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="citation-tooltip">
            <div className="citation-tooltip-content">
              <div className="citation-tooltip-header">
                <Icon className="citation-tooltip-icon" />
                <span className="citation-tooltip-title">
                  {citation.displayName}
                </span>
              </div>
              {citation.content && (
                <p className="citation-tooltip-description">
                  {citation.content}
                </p>
              )}
              {citation.metadata && (
                <div className="citation-tooltip-metadata">
                  {citation.metadata.status && (
                    <p>Status: {citation.metadata.status}</p>
                  )}
                  {citation.metadata.scheduledStart && (
                    <p>
                      Date:{" "}
                      {new Date(
                        citation.metadata.scheduledStart
                      ).toLocaleDateString()}
                    </p>
                  )}
                  {citation.metadata.mentor && (
                    <p>Mentor: {citation.metadata.mentor}</p>
                  )}
                  {citation.metadata.team && (
                    <p>Team: {citation.metadata.team}</p>
                  )}
                  {citation.metadata.memberCount && (
                    <p>Members: {citation.metadata.memberCount}</p>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </NodeViewWrapper>
  );
}

/**
 * Citation Node Extension
 */
export const CitationNode = Node.create({
  name: "citation",

  group: "inline",

  inline: true,

  atom: true, // Cannot be edited directly

  addAttributes() {
    return {
      sourceNumber: {
        default: 1,
        parseHTML: (element) => {
          return parseInt(element.getAttribute("data-source") || "1", 10);
        },
        renderHTML: (attributes) => {
          return {
            "data-source": attributes.sourceNumber,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-citation="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-citation": "true" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationNodeView);
  },
});

/**
 * Transform [source:N] patterns in text to citation nodes.
 * This runs when content is set on the editor.
 */
export function transformCitationsInContent(content: string): string {
  // Convert [source:N] to HTML that Tiptap can parse as citation nodes
  return content.replace(
    /\[source:(\d+)\]/gi,
    '<span data-citation="true" data-source="$1"></span>'
  );
}

export default CitationNode;
