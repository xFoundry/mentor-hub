"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  LayoutGrid,
  List,
  Table2,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  TaskViewMode,
  TaskFilter,
  TaskSort,
  TaskSortDirection,
  TaskGroupBy,
} from "@/hooks/use-task-view-state";

export interface TaskViewControlsProps {
  // Current state
  view: TaskViewMode;
  filter: TaskFilter;
  sort: TaskSort;
  sortDirection: TaskSortDirection;
  groupBy: TaskGroupBy;

  // Available options
  availableViews?: TaskViewMode[];
  allowedGroupings?: string[];

  // Event handlers
  onViewChange: (view: TaskViewMode) => void;
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort, direction?: TaskSortDirection) => void;
  onGroupByChange: (groupBy: TaskGroupBy) => void;

  // Feature flags
  showViewSwitcher?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
  showGroupBy?: boolean;
  showCreateButton?: boolean;

  // Actions
  onCreateTask?: () => void;

  // Styling
  className?: string;
}

const VIEW_ICONS = {
  kanban: LayoutGrid,
  list: List,
  table: Table2,
} as const;

const VIEW_LABELS = {
  kanban: "Kanban",
  list: "List",
  table: "Table",
} as const;

const FILTER_OPTIONS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "All Tasks" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
];

const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "dueDate", label: "Due Date" },
  { value: "status", label: "Status" },
  { value: "created", label: "Created" },
];

const GROUP_OPTIONS: { value: TaskGroupBy; label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "status", label: "By Status" },
  { value: "priority", label: "By Priority" },
  { value: "team", label: "By Team" },
  { value: "assignee", label: "By Assignee" },
];

export function TaskViewControls({
  view,
  filter,
  sort,
  sortDirection,
  groupBy,
  availableViews = ["kanban", "list", "table"],
  allowedGroupings = ["none", "status", "priority"],
  onViewChange,
  onFilterChange,
  onSortChange,
  onGroupByChange,
  showViewSwitcher = true,
  showFilter = true,
  showSort = true,
  showGroupBy = true,
  showCreateButton = false,
  onCreateTask,
  className,
}: TaskViewControlsProps) {
  const filteredGroupOptions = GROUP_OPTIONS.filter(opt =>
    allowedGroupings.includes(opt.value)
  );

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Left side: View switcher */}
      <div className="flex items-center gap-2">
        {showViewSwitcher && availableViews.length > 1 && (
          <Tabs value={view} onValueChange={(v) => onViewChange(v as TaskViewMode)}>
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
      </div>

      {/* Right side: Filters, Sort, Group, Create */}
      <div className="flex items-center gap-2">
        {/* Filter dropdown */}
        {showFilter && (
          <Select value={filter} onValueChange={(v) => onFilterChange(v as TaskFilter)}>
            <SelectTrigger className="w-32">
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
                onValueChange={(v) => onSortChange(v as TaskSort)}
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
                onValueChange={(v) => onSortChange(sort, v as TaskSortDirection)}
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
                onValueChange={(v) => onGroupByChange(v as TaskGroupBy)}
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
        {showCreateButton && onCreateTask && (
          <Button onClick={onCreateTask} size="sm" className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Create Task</span>
          </Button>
        )}
      </div>
    </div>
  );
}
