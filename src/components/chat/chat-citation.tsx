"use client";

/**
 * Citation display component with grouping support.
 * Shows sources used in assistant responses with entity-specific icons and names.
 *
 * Features:
 * - Single item: Shows badge with entity name
 * - Multiple items: Shows grouped badge with count (e.g., "Tasks (3)") + expandable popover
 * - Entity-specific icons and styling
 * - Metadata shown in tooltips
 */

import { useState } from "react";
import {
  FileText,
  Calendar,
  Users,
  User,
  BookOpen,
  Database,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RichCitationData, CitationGroup } from "@/types/chat";
import { cn } from "@/lib/utils";

interface ChatCitationProps {
  citations: RichCitationData[];
}

/**
 * Transform snake_case citation from backend to camelCase for frontend.
 * Backend sends: entity_type, display_name, group_key
 * Frontend uses: entityType, displayName, groupKey
 */
function normalizeCitation(citation: RichCitationData | Record<string, unknown>): RichCitationData {
  // Cast to any to handle snake_case from backend
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
 * Group citations by groupKey.
 */
function groupCitations(citations: RichCitationData[]): CitationGroup[] {
  const groups: Record<string, RichCitationData[]> = {};

  for (const rawCitation of citations) {
    const citation = normalizeCitation(rawCitation);
    const key = citation.groupKey || "other";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(citation);
  }

  // Convert to array with display labels
  const labelMap: Record<string, string> = {
    tasks: "Tasks",
    sessions: "Sessions",
    teams: "Teams",
    mentors: "Mentors",
    documents: "Documents",
    entities: "Knowledge Base",
    other: "Sources",
  };

  // Sort by relevance: live data first, then documents
  const sortOrder = ["tasks", "sessions", "teams", "mentors", "entities", "documents", "other"];

  return Object.entries(groups)
    .map(([key, cites]) => ({
      groupKey: key,
      displayLabel: labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1),
      citations: cites,
    }))
    .sort((a, b) => {
      const aIndex = sortOrder.indexOf(a.groupKey);
      const bIndex = sortOrder.indexOf(b.groupKey);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
}

/**
 * Get icon component for entity type.
 */
function getEntityIcon(entityType: string) {
  switch (entityType) {
    case "task":
      return FileText;
    case "session":
      return Calendar;
    case "team":
      return Users;
    case "mentor":
      return User;
    case "document":
      return BookOpen;
    case "entity":
      return Database;
    default:
      return FileText;
  }
}

/**
 * Get badge variant based on entity type.
 */
function getBadgeVariant(
  entityType: string
): "default" | "secondary" | "outline" {
  switch (entityType) {
    case "task":
    case "session":
      return "default";
    case "team":
    case "mentor":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Single citation badge with tooltip.
 */
function CitationBadge({ citation }: { citation: RichCitationData }) {
  const normalized = normalizeCitation(citation);
  const Icon = getEntityIcon(normalized.entityType);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={getBadgeVariant(normalized.entityType)}
          className="cursor-help gap-1 text-xs"
        >
          <Icon className="h-3 w-3" />
          <span className="max-w-[200px] truncate">{normalized.displayName}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs font-medium">{normalized.displayName}</p>
        {normalized.content && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
            {normalized.content}
          </p>
        )}
        {normalized.metadata && (
          <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
            {normalized.metadata.status && (
              <p>Status: {normalized.metadata.status}</p>
            )}
            {normalized.metadata.dueDate && (
              <p>Due: {normalized.metadata.dueDate}</p>
            )}
            {normalized.metadata.assignee && (
              <p>Assigned: {normalized.metadata.assignee}</p>
            )}
            {normalized.metadata.mentor && (
              <p>Mentor: {normalized.metadata.mentor}</p>
            )}
            {normalized.metadata.team && (
              <p>Team: {normalized.metadata.team}</p>
            )}
            {normalized.metadata.memberCount && (
              <p>Members: {normalized.metadata.memberCount}</p>
            )}
          </div>
        )}
        {normalized.confidence < 1 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Confidence: {Math.round(normalized.confidence * 100)}%
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Grouped citation badge with expandable popover.
 */
function GroupedCitationBadge({ group }: { group: CitationGroup }) {
  const [open, setOpen] = useState(false);
  const firstCitation = normalizeCitation(group.citations[0] || {});
  const Icon = getEntityIcon(firstCitation.entityType);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant={getBadgeVariant(firstCitation.entityType)}
          className="cursor-pointer gap-1 text-xs"
        >
          <Icon className="h-3 w-3" />
          {group.displayLabel} ({group.citations.length})
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
            {group.displayLabel}
          </p>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {group.citations.map((citation, idx) => {
              const normalized = normalizeCitation(citation);
              const ItemIcon = getEntityIcon(normalized.entityType);
              return (
                <div
                  key={normalized.source || idx}
                  className="flex items-start gap-2 p-2 rounded hover:bg-muted transition-colors"
                >
                  <ItemIcon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {normalized.displayName}
                    </p>
                    {normalized.content && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {normalized.content}
                      </p>
                    )}
                    {normalized.metadata?.status && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Status: {normalized.metadata.status}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Main citation display component.
 */
export function ChatCitation({ citations }: ChatCitationProps) {
  if (!citations.length) return null;

  const groups = groupCitations(citations);

  return (
    <div className="flex flex-wrap gap-1.5">
      <TooltipProvider>
        {groups.map((group) =>
          group.citations.length === 1 ? (
            <CitationBadge
              key={group.citations[0].source || group.groupKey}
              citation={group.citations[0]}
            />
          ) : (
            <GroupedCitationBadge key={group.groupKey} group={group} />
          )
        )}
      </TooltipProvider>
    </div>
  );
}
