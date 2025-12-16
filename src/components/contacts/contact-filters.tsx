"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTACT_TYPE_OPTIONS,
  WEBFLOW_STATUS_OPTIONS,
  type ContactFilters,
} from "@/hooks/use-contacts";

interface ContactFiltersProps {
  filters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export function ContactFiltersComponent({
  filters,
  onFiltersChange,
}: ContactFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.searchTerm || "");
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search - update filters after user stops typing
  useEffect(() => {
    // Clear any existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout to update filters
    debounceRef.current = setTimeout(() => {
      if (searchValue !== (filters.searchTerm || "")) {
        onFiltersChange({ ...filters, searchTerm: searchValue || undefined });
      }
    }, SEARCH_DEBOUNCE_MS);

    // Cleanup on unmount or value change
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchValue]); // Only depend on searchValue to avoid infinite loops

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchValue("");
    onFiltersChange({ ...filters, searchTerm: undefined });
  }, [filters, onFiltersChange]);

  const handleTypeToggle = useCallback(
    (type: string) => {
      const currentTypes = filters.types || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];

      onFiltersChange({
        ...filters,
        types: newTypes.length > 0 ? newTypes : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleStatusToggle = useCallback(
    (status: string) => {
      const currentStatuses = filters.webflowStatuses || [];
      const newStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter((s) => s !== status)
        : [...currentStatuses, status];

      onFiltersChange({
        ...filters,
        webflowStatuses: newStatuses.length > 0 ? newStatuses : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleHasNameToggle = useCallback(
    (pressed: boolean) => {
      onFiltersChange({
        ...filters,
        hasName: pressed || undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleClearAll = useCallback(() => {
    setSearchValue("");
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.searchTerm ||
    (filters.types && filters.types.length > 0) ||
    (filters.webflowStatuses && filters.webflowStatuses.length > 0) ||
    filters.hasName;

  const selectedTypesCount = filters.types?.length || 0;
  const selectedStatusesCount = filters.webflowStatuses?.length || 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={handleClearSearch}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>

      {/* Type filter */}
      <Popover open={typeOpen} onOpenChange={setTypeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={typeOpen}
            className="justify-between min-w-[140px]"
          >
            <span className="truncate">
              {selectedTypesCount > 0
                ? `${selectedTypesCount} type${selectedTypesCount > 1 ? "s" : ""}`
                : "Type"}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search types..." />
            <CommandList>
              <CommandEmpty>No type found.</CommandEmpty>
              <CommandGroup>
                {CONTACT_TYPE_OPTIONS.map((type) => {
                  const isSelected = filters.types?.includes(type);
                  return (
                    <CommandItem
                      key={type}
                      value={type}
                      onSelect={() => handleTypeToggle(type)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      {type}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Status filter */}
      <Popover open={statusOpen} onOpenChange={setStatusOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={statusOpen}
            className="justify-between min-w-[140px]"
          >
            <span className="truncate">
              {selectedStatusesCount > 0
                ? `${selectedStatusesCount} status${selectedStatusesCount > 1 ? "es" : ""}`
                : "Status"}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandList>
              <CommandGroup>
                {WEBFLOW_STATUS_OPTIONS.map((status) => {
                  const isSelected = filters.webflowStatuses?.includes(status);
                  return (
                    <CommandItem
                      key={status}
                      value={status}
                      onSelect={() => handleStatusToggle(status)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      {status}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Has Name switch */}
      <div className="flex items-center gap-2">
        <Switch
          id="has-name-filter"
          checked={filters.hasName || false}
          onCheckedChange={handleHasNameToggle}
        />
        <Label htmlFor="has-name-filter" className="text-sm cursor-pointer">
          Has Name
        </Label>
      </div>

      {/* Clear all button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-9 px-3"
        >
          <X className="mr-1 h-4 w-4" />
          Clear all
        </Button>
      )}

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1 ml-2">
          {filters.types?.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => handleTypeToggle(type)}
            >
              {type}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          {filters.webflowStatuses?.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => handleStatusToggle(status)}
            >
              {status}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
