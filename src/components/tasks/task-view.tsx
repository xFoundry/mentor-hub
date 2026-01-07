"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, UserType } from "@/types/schema";
import type {
  TaskViewMode,
  TaskFilter,
  TaskSort,
  TaskSortDirection,
  TaskGroupBy,
} from "@/hooks/use-task-view-state";
import { useTaskPermissions } from "@/hooks/use-task-permissions";
import { filterTasks, sortTasks, getTaskStats } from "./task-transformers";
import { TaskViewControls } from "./task-view-controls";
import { TaskKanbanView } from "./views/task-kanban-view";
import { TaskListView } from "./views/task-list-view";
import { TaskTableView } from "./views/task-table-view";

export type TaskViewVariant = "full" | "compact" | "embedded";

/** Tour attribute identifiers for onboarding */
export interface TaskViewTourAttributes {
  /** Attribute for the header section */
  header?: string;
  /** Attribute for the controls section */
  controls?: string;
  /** Attribute for the stats section */
  stats?: string;
  /** Attribute for the create button */
  createButton?: string;
}

export interface TaskViewProps {
  // Data
  tasks: Task[];
  isLoading?: boolean;

  // User context
  userType: UserType;
  userEmail: string;

  // View state
  view: TaskViewMode;
  filter: TaskFilter;
  sort: TaskSort;
  sortDirection: TaskSortDirection;
  groupBy: TaskGroupBy;

  // View state handlers
  onViewChange: (view: TaskViewMode) => void;
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort, direction?: TaskSortDirection) => void;
  onGroupByChange: (groupBy: TaskGroupBy) => void;

  // View configuration
  availableViews?: TaskViewMode[];
  variant?: TaskViewVariant;

  // Feature flags
  showHeader?: boolean;
  showStats?: boolean;
  showControls?: boolean;
  showViewSwitcher?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
  showGroupBy?: boolean;
  showCreateButton?: boolean;
  showAssignee?: boolean;
  showProvenance?: boolean;
  /** Show team name in views */
  showTeam?: boolean;
  /** Show action buttons (Edit/Post Update) on each task */
  showActions?: boolean;
  /** Disable drag-and-drop in kanban view */
  disableDrag?: boolean;

  // Limits
  maxItems?: number;

  // Callbacks
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskClick?: (task: Task) => void;
  onEditClick?: (task: Task) => void;
  onPostUpdateClick?: (task: Task) => void;
  onCreateTask?: () => void;

  // Styling
  title?: string;
  description?: string;
  className?: string;

  // Tour/onboarding
  /** Data-tour attributes for onboarding tour steps */
  tourAttributes?: TaskViewTourAttributes;
}

export function TaskView({
  tasks,
  isLoading = false,
  userType,
  userEmail,
  view,
  filter,
  sort,
  sortDirection,
  groupBy,
  onViewChange,
  onFilterChange,
  onSortChange,
  onGroupByChange,
  availableViews = ["table", "kanban", "list"],
  variant = "full",
  showHeader = true,
  showStats = false,
  showControls = true,
  showViewSwitcher = true,
  showFilter = true,
  showSort = true,
  showGroupBy = true,
  showCreateButton = false,
  showAssignee = true,
  showProvenance = false,
  showTeam = false,
  showActions = false,
  disableDrag = false,
  maxItems,
  onTaskUpdate,
  onTaskClick,
  onEditClick,
  onPostUpdateClick,
  onCreateTask,
  title = "Tasks",
  description,
  className,
  tourAttributes,
}: TaskViewProps) {
  const { allowedGroupings, canCreate } = useTaskPermissions(userType, userEmail);

  // Process tasks: filter, sort, limit
  const processedTasks = useMemo(() => {
    let result = filterTasks(tasks, filter);
    result = sortTasks(result, sort, sortDirection);
    if (maxItems && maxItems > 0) {
      result = result.slice(0, maxItems);
    }
    return result;
  }, [tasks, filter, sort, sortDirection, maxItems]);

  // Calculate stats
  const stats = useMemo(() => getTaskStats(tasks), [tasks]);

  // Determine if we should show the create button
  const shouldShowCreate = showCreateButton && canCreate;

  // Compact variant styling
  const isCompact = variant === "compact";
  const isEmbedded = variant === "embedded";

  if (isLoading) {
    return <TaskViewSkeleton variant={variant} />;
  }

  // Render the appropriate view
  const renderView = () => {
    const commonProps = {
      tasks: processedTasks,
      userType,
      userEmail,
      isLoading,
      onTaskUpdate,
      onTaskClick,
      onEditClick,
      onPostUpdateClick,
      showAssignee,
      showActions,
    };

    switch (view) {
      case "kanban":
        return (
          <TaskKanbanView
            {...commonProps}
            showDueDate={!isCompact}
            showPriority={!isCompact}
            showTeam={showTeam}
            disableDrag={disableDrag}
          />
        );
      case "list":
        return (
          <TaskListView
            {...commonProps}
            groupBy={groupBy}
            showDueDate={!isCompact}
            showPriority={!isCompact}
          />
        );
      case "table":
        return <TaskTableView {...commonProps} />;
      default:
        return <TaskListView {...commonProps} groupBy={groupBy} />;
    }
  };

  // Empty state
  if (tasks.length === 0 && !isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {showHeader && (
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && (
              <p className="text-muted-foreground text-sm">{description}</p>
            )}
          </div>
        )}
        <TaskViewEmpty onCreateTask={shouldShowCreate ? onCreateTask : undefined} />
      </div>
    );
  }

  // Full variant with all features
  if (variant === "full") {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        {showHeader && (
          <div
            className="flex items-center justify-between"
            data-tour={tourAttributes?.header}
          >
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div
            className="grid gap-4 md:grid-cols-4"
            data-tour={tourAttributes?.stats}
          >
            <StatCard title="Total" value={stats.total} />
            <StatCard title="Open" value={stats.open} />
            <StatCard title="Completed" value={stats.completed} />
            <StatCard title="Overdue" value={stats.overdue} variant={stats.overdue > 0 ? "destructive" : "default"} />
          </div>
        )}

        {/* Controls */}
        {showControls && (
          <TaskViewControls
            view={view}
            filter={filter}
            sort={sort}
            sortDirection={sortDirection}
            groupBy={groupBy}
            availableViews={availableViews}
            allowedGroupings={allowedGroupings}
            onViewChange={onViewChange}
            onFilterChange={onFilterChange}
            onSortChange={onSortChange}
            onGroupByChange={onGroupByChange}
            showViewSwitcher={showViewSwitcher}
            showFilter={showFilter}
            showSort={showSort}
            showGroupBy={showGroupBy && view !== "kanban"}
            showCreateButton={shouldShowCreate}
            onCreateTask={onCreateTask}
            tourAttrControls={tourAttributes?.controls}
            tourAttrCreateButton={tourAttributes?.createButton}
          />
        )}

        {/* View */}
        {renderView()}
      </div>
    );
  }

  // Compact variant (for dashboard widgets)
  if (variant === "compact") {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            {showControls && availableViews.length > 1 && (
              <TaskViewControls
                view={view}
                filter={filter}
                sort={sort}
                sortDirection={sortDirection}
                groupBy={groupBy}
                availableViews={availableViews}
                allowedGroupings={allowedGroupings}
                onViewChange={onViewChange}
                onFilterChange={onFilterChange}
                onSortChange={onSortChange}
                onGroupByChange={onGroupByChange}
                showViewSwitcher={showViewSwitcher}
                showFilter={false}
                showSort={false}
                showGroupBy={false}
                showCreateButton={false}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>{renderView()}</CardContent>
      </Card>
    );
  }

  // Embedded variant (no card wrapper)
  return (
    <div className={cn("space-y-2", className)}>
      {showControls && (
        <TaskViewControls
          view={view}
          filter={filter}
          sort={sort}
          sortDirection={sortDirection}
          groupBy={groupBy}
          availableViews={availableViews}
          allowedGroupings={allowedGroupings}
          onViewChange={onViewChange}
          onFilterChange={onFilterChange}
          onSortChange={onSortChange}
          onGroupByChange={onGroupByChange}
          showViewSwitcher={showViewSwitcher}
          showFilter={showFilter}
          showSort={showSort}
          showGroupBy={showGroupBy && view !== "kanban"}
          showCreateButton={shouldShowCreate}
          onCreateTask={onCreateTask}
        />
      )}
      {renderView()}
    </div>
  );
}

function TaskViewSkeleton({ variant }: { variant: TaskViewVariant }) {
  if (variant === "compact") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

function TaskViewEmpty({ onCreateTask }: { onCreateTask?: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
        <p className="text-sm text-muted-foreground mb-4">
          {onCreateTask ? "Create a task to get started" : "You're all caught up!"}
        </p>
        {onCreateTask && (
          <button
            onClick={onCreateTask}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Task
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  variant = "default",
}: {
  title: string;
  value: number;
  variant?: "default" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className={cn(
          "text-2xl font-bold",
          variant === "destructive" && value > 0 && "text-destructive"
        )}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
