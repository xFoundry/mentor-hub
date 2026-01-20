"use client";

import { useCallback, useState } from "react";
import { Hexagon, Plus } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { TileData } from "@/types/map";
import { STATUS_LABELS } from "@/types/map";

interface MapCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiles: TileData[];
  onSelectTile: (tileId: string) => void;
  onNewTile: () => void;
}

export function MapCommandPalette({
  open,
  onOpenChange,
  tiles,
  onSelectTile,
  onNewTile,
}: MapCommandPaletteProps) {
  const [search, setSearch] = useState("");

  const handleSelect = useCallback(
    (tileId: string) => {
      onSelectTile(tileId);
      onOpenChange(false);
      setSearch("");
    },
    [onSelectTile, onOpenChange]
  );

  const handleNewTile = useCallback(() => {
    onNewTile();
    onOpenChange(false);
    setSearch("");
  }, [onNewTile, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search tiles..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No tiles found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleNewTile}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create new tile</span>
            <kbd className="ml-auto rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              N
            </kbd>
          </CommandItem>
        </CommandGroup>

        {tiles.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tiles">
              {tiles.map((tile) => (
                <CommandItem
                  key={tile.id}
                  value={`${tile.title} ${tile.id}`}
                  onSelect={() => handleSelect(tile.id)}
                >
                  <Hexagon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium">{tile.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {tile.artifacts.length} files &middot;{" "}
                        {tile.messages.length} messages
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {STATUS_LABELS[tile.status]}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
