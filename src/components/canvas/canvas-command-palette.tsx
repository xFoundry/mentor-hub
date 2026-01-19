"use client";

import { useMemo } from "react";
import { MessageSquare, FileText, Table, Network } from "lucide-react";
import type { CanvasNode } from "@/types/canvas";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface CanvasCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: CanvasNode[];
  onSelectNode: (node: CanvasNode) => void;
}

function getNodeTitle(node: CanvasNode) {
  const dataTitle = (node.data as { title?: string })?.title;
  return dataTitle || "Untitled";
}

export function CanvasCommandPalette({
  open,
  onOpenChange,
  nodes,
  onSelectNode,
}: CanvasCommandPaletteProps) {
  const groups = useMemo(() => {
    return {
      Zones: nodes.filter((node) => node.type === "zone" || node.type === "chatBlock"),
      Documents: nodes.filter((node) => node.type === "documentArtifact"),
      Tables: nodes.filter((node) => node.type === "tableArtifact"),
      Graph: nodes.filter((node) => node.type === "graphEntity"),
    };
  }, [nodes]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search map..." />
      <CommandList>
        <CommandEmpty>No nodes found.</CommandEmpty>
        {Object.entries(groups).map(([label, items]) => {
          if (!items.length) return null;
          const Icon = label === "Zones"
            ? MessageSquare
            : label === "Documents"
              ? FileText
              : label === "Tables"
                ? Table
                : Network;
          return (
            <CommandGroup key={label} heading={label}>
              {items.map((node) => (
                <CommandItem
                  key={node.id}
                  onSelect={() => {
                    onSelectNode(node);
                    onOpenChange(false);
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {getNodeTitle(node)}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
