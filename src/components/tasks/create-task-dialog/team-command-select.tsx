"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Team {
  id: string;
  teamName?: string;
  teamId?: string;
}

interface TeamCommandSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  teams: Team[];
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function TeamCommandSelect({
  value,
  onChange,
  teams,
  isLoading = false,
  disabled = false,
  placeholder = "Select team...",
}: TeamCommandSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedTeam = teams.find((t) => t.id === value);

  const filteredTeams = React.useMemo(() => {
    if (!search) return teams;
    const lowerSearch = search.toLowerCase();
    return teams.filter(
      (t) =>
        t.teamName?.toLowerCase().includes(lowerSearch) ||
        t.teamId?.toLowerCase().includes(lowerSearch)
    );
  }, [teams, search]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between font-normal"
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            {isLoading ? (
              <span className="text-muted-foreground">Loading teams...</span>
            ) : selectedTeam ? (
              <span className="truncate">{selectedTeam.teamName}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search teams..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>
              {teams.length === 0 ? "No teams available" : "No teams found"}
            </CommandEmpty>
            <CommandGroup>
              {filteredTeams.map((team) => (
                <CommandItem
                  key={team.id}
                  value={team.id}
                  onSelect={() => {
                    onChange(team.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{team.teamName}</span>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === team.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
