"use client";

import * as React from "react";
import { Check, ChevronsUpDown, User, Loader2 } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Assignee {
  id: string;
  fullName: string;
  email?: string;
  headshot?: string;
  isSelf?: boolean;
}

interface AssigneeCommandSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  assignees: Assignee[];
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}

export function AssigneeCommandSelect({
  value,
  onChange,
  assignees,
  isLoading = false,
  disabled = false,
  placeholder = "Assign to...",
  emptyMessage = "No members available",
}: AssigneeCommandSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedAssignee = assignees.find((a) => a.id === value);

  const filteredAssignees = React.useMemo(() => {
    if (!search) return assignees;
    const lowerSearch = search.toLowerCase();
    return assignees.filter(
      (a) =>
        a.fullName?.toLowerCase().includes(lowerSearch) ||
        a.email?.toLowerCase().includes(lowerSearch)
    );
  }, [assignees, search]);

  const getInitials = (name?: string): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
            {isLoading ? (
              <>
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Loading...</span>
              </>
            ) : selectedAssignee ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={selectedAssignee.headshot}
                    alt={selectedAssignee.fullName}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(selectedAssignee.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {selectedAssignee.fullName}
                  {selectedAssignee.isSelf && " (me)"}
                </span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{placeholder}</span>
              </>
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
            placeholder="Search members..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>
              {assignees.length === 0 ? emptyMessage : "No members found"}
            </CommandEmpty>
            <CommandGroup>
              {filteredAssignees.map((assignee) => (
                <CommandItem
                  key={assignee.id}
                  value={assignee.id}
                  onSelect={() => {
                    onChange(assignee.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={assignee.headshot}
                      alt={assignee.fullName}
                    />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(assignee.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">
                    {assignee.fullName}
                    {assignee.isSelf && " (me)"}
                  </span>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === assignee.id ? "opacity-100" : "opacity-0"
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
