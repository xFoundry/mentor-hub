"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table2,
  LayoutGrid,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SessionViewMode,
  SessionFilter,
  SessionSort,
  SessionSortDirection,
  SessionGroupBy,
} from "./session-transformers";

export interface SessionViewControlsProps {
  // Current state
  view: SessionViewMode;
  filter: SessionFilter;
  sort: SessionSort;
  sortDirection: SessionSortDirection;
  groupBy: SessionGroupBy;
  search: string;

  // Available options
  availableViews?: SessionViewMode[];
  allowedGroupings?: string[];

  // Event handlers
  onViewChange: (view: SessionViewMode) => void;
  onFilterChange: (filter: SessionFilter) => void;
  onSortChange: (sort: SessionSort, direction?: SessionSortDirection) => void;
  onGroupByChange: (groupBy: SessionGroupBy) => void;
  onSearchChange: (search: string) => void;

  // Feature flags
  showViewSwitcher?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
  showGroupBy?: boolean;
  showCreateButton?: boolean;

  // Actions
  onCreateSession?: () => void;

  // Styling
  className?: string;

  // Tour/onboarding
  /** Data-tour attribute for the controls container */
  tourAttrControls?: string;
}

const VIEW_ICONS = {
  table: Table2,
  cards: LayoutGrid,
} as const;

const VIEW_LABELS = {
  table: "Table",
  cards: "Cards",
} as const;

const FILTER_OPTIONS: { value: SessionFilter; label: string }[] = [
  { value: "all", label: "All Sessions" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "needsFeedback", label: "Needs Feedback" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS: { value: SessionSort; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "type", label: "Type" },
  { value: "status", label: "Status" },
  { value: "team", label: "Team" },
  { value: "mentor", label: "Mentor" },
];

const GROUP_OPTIONS: { value: SessionGroupBy; label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "status", label: "By Status" },
  { value: "type", label: "By Type" },
  { value: "team", label: "By Team" },
  { value: "month", label: "By Month" },
];

export function SessionViewControls({
  view,
  filter,
  sort,
  sortDirection,
  groupBy,
  search,
  availableViews = ["table", "cards"],
  allowedGroupings = ["none", "status", "type", "month"],
  onViewChange,
  onFilterChange,
  onSortChange,
  onGroupByChange,
  onSearchChange,
  showViewSwitcher = true,
  showSearch = true,
  showFilter = true,
  showSort = true,
  showGroupBy = true,
  showCreateButton = false,
  onCreateSession,
  className,
  tourAttrControls,
}: SessionViewControlsProps) {
  // Local search state for debouncing
  const [localSearch, setLocalSearch] = useState(search);

  // Sync local search with external search prop
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const handleSearchClear = useCallback(() => {
    setLocalSearch("");
    onSearchChange("");
  }, [onSearchChange]);

  const filteredGroupOptions = GROUP_OPTIONS.filter(opt =>
    allowedGroupings.includes(opt.value)
  );

  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}
      data-tour={tourAttrControls}
    >
      {/* Left side: View switcher + Search */}
      <div className="flex items-center gap-2 flex-1">
        {showViewSwitcher && availableViews.length > 1 && (
          <Tabs value={view} onValueChange={(v) => onViewChange(v as SessionViewMode)}>
            <TabsList>
              {availableViews.map((v) => {
                const Icon = VIEW_ICONS[v];
                return (
                  <TabsTrigger key={v} value={v}>
                    <Icon className="h-4 w-4" />
                    <span className="ml-1.5 hidden sm:inline">{VIEW_LABELS[v]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        )}

        {/* Search input */}
        {showSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search sessions..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-8 pr-8 h-9"
            />
            {localSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={handleSearchClear}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Right side: Filters, Sort, Group, Create */}
      <div className="flex items-center gap-2">
        {/* Filter dropdown */}
        {showFilter && (
          <Select value={filter} onValueChange={(v) => onFilterChange(v as SessionFilter)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort dropdown */}
        {showSort && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(v) => onSortChange(v as SessionSort)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Direction</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortDirection}
                onValueChange={(v) => onSortChange(sort, v as SessionSortDirection)}
              >
                <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Group dropdown */}
        {showGroupBy && filteredGroupOptions.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Group</span>
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                  {GROUP_OPTIONS.find(opt => opt.value === groupBy)?.label.replace("By ", "").replace("No Grouping", "None") || groupBy}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Group by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={groupBy}
                onValueChange={(v) => onGroupByChange(v as SessionGroupBy)}
              >
                {filteredGroupOptions.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Create button */}
        {showCreateButton && onCreateSession && (
          <Button onClick={onCreateSession} size="sm" className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </Button>
        )}
      </div>
    </div>
  );
}
