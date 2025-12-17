"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Calendar, Loader2 } from "lucide-react";
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
import { format, parseISO } from "date-fns";

interface Session {
  id: string;
  sessionId?: string;
  sessionType?: string;
  startTime?: string;
}

interface SessionCommandSelectProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  sessions: Session[];
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function SessionCommandSelect({
  value,
  onChange,
  sessions,
  isLoading = false,
  disabled = false,
  placeholder = "Link to session (optional)",
}: SessionCommandSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedSession = sessions.find((s) => s.id === value);

  const filteredSessions = React.useMemo(() => {
    if (!search) return sessions;
    const lowerSearch = search.toLowerCase();
    return sessions.filter(
      (s) =>
        s.sessionType?.toLowerCase().includes(lowerSearch) ||
        s.sessionId?.toLowerCase().includes(lowerSearch)
    );
  }, [sessions, search]);

  const formatSessionDate = (startTime?: string) => {
    if (!startTime) return "";
    try {
      return format(parseISO(startTime), "MMM d, yyyy");
    } catch {
      return "";
    }
  };

  const getSessionLabel = (session: Session) => {
    const type = session.sessionType || "Session";
    const date = formatSessionDate(session.startTime);
    return date ? `${type} - ${date}` : type;
  };

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
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            {isLoading ? (
              <span className="text-muted-foreground">Loading sessions...</span>
            ) : selectedSession ? (
              <span className="truncate">{getSessionLabel(selectedSession)}</span>
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
            placeholder="Search sessions..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>
              {sessions.length === 0 ? "No sessions available" : "No sessions found"}
            </CommandEmpty>
            <CommandGroup>
              {/* Option to clear selection */}
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(undefined);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="text-muted-foreground"
                >
                  <span className="flex-1">No session</span>
                </CommandItem>
              )}
              {filteredSessions.map((session) => (
                <CommandItem
                  key={session.id}
                  value={session.id}
                  onSelect={() => {
                    onChange(session.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">
                      {session.sessionType || "Session"}
                    </span>
                    {session.startTime && (
                      <span className="text-xs text-muted-foreground truncate block">
                        {formatSessionDate(session.startTime)}
                      </span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === session.id ? "opacity-100" : "opacity-0"
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
