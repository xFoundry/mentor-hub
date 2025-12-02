"use client";

import { useMemo, useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  ListProvider,
  ListGroup,
  ListHeader,
  ListItems,
  ListItem,
} from "@/components/kibo-ui/list";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, UserType } from "@/types/schema";
import type { TaskGroupBy } from "@/hooks/use-task-view-state";
import { useTaskPermissions } from "@/hooks/use-task-permissions";
import {
  groupTasks,
  getGroupColor,
  columnIdToStatus,
  type TaskStatus,
} from "../task-transformers";
import { TaskListItem } from "../items/task-list-item";

export interface TaskListViewProps {
  tasks: Task[];
  userType: UserType;
  userEmail: string;
  groupBy?: TaskGroupBy;
  isLoading?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskClick?: (task: Task) => void;
  onEditClick?: (task: Task) => void;
  onPostUpdateClick?: (task: Task) => void;
  showAssignee?: boolean;
  showDueDate?: boolean;
  showPriority?: boolean;
  showActions?: boolean;
  className?: string;
}

export function TaskListView({
  tasks,
  userType,
  userEmail,
  groupBy = "status",
  isLoading = false,
  onTaskUpdate,
  onTaskClick,
  onEditClick,
  onPostUpdateClick,
  showAssignee = true,
  showDueDate = true,
  showPriority = true,
  showActions = false,
  className,
}: TaskListViewProps) {
  const { canDragTask } = useTaskPermissions(userType, userEmail);

  // Group tasks
  const groupedTasks = useMemo(() => {
    return groupTasks(tasks, groupBy);
  }, [tasks, groupBy]);

  // Convert Map to array for rendering
  const groups = useMemo(() => {
    return Array.from(groupedTasks.entries()).map(([name, tasks]) => ({
      name,
      tasks,
      color: getGroupColor(groupBy, name),
    }));
  }, [groupedTasks, groupBy]);

  // Handle drag end - update task group (status, priority, etc.)
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !onTaskUpdate) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);

    if (!task || !canDragTask(task)) return;

    // The target group ID (over.id is the group name)
    const targetGroup = over.id as string;

    // Only update if we're grouping by status (other groupings don't make sense for drag)
    if (groupBy === "status") {
      const newStatus = targetGroup as TaskStatus;
      if (task.status !== newStatus) {
        await onTaskUpdate(taskId, { status: newStatus });
      }
    } else if (groupBy === "priority") {
      const newPriority = targetGroup as Task["priority"];
      if (task.priority !== newPriority) {
        await onTaskUpdate(taskId, { priority: newPriority });
      }
    }
  }, [tasks, groupBy, onTaskUpdate, canDragTask]);

  if (isLoading) {
    return <TaskListViewSkeleton />;
  }

  if (tasks.length === 0) {
    return <TaskListViewEmpty />;
  }

  // If no grouping, render flat list
  if (groupBy === "none") {
    return (
      <div className={cn("space-y-1", className)}>
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            showAssignee={showAssignee}
            showDueDate={showDueDate}
            showPriority={showPriority}
            showActions={showActions}
            userType={userType}
            onClick={() => onTaskClick?.(task)}
            onEditClick={() => onEditClick?.(task)}
            onPostUpdateClick={() => onPostUpdateClick?.(task)}
          />
        ))}
      </div>
    );
  }

  // Enable drag-drop only for status grouping
  const enableDragDrop = groupBy === "status" && !!onTaskUpdate;

  if (!enableDragDrop) {
    // Render grouped list without drag-drop
    return (
      <div className={cn("space-y-4", className)}>
        {groups.map((group) => (
          <div key={group.name} className="space-y-1">
            <div className="flex items-center gap-2 py-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="font-semibold text-sm">{group.name}</span>
              <Badge variant="secondary" className="text-xs">
                {group.tasks.length}
              </Badge>
            </div>
            <div className="ml-4 border-l pl-4 space-y-1">
              {group.tasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  showAssignee={showAssignee}
                  showDueDate={showDueDate}
                  showPriority={showPriority}
                  showStatus={groupBy !== "status"}
                  showActions={showActions}
                  userType={userType}
                  onClick={() => onTaskClick?.(task)}
                  onEditClick={() => onEditClick?.(task)}
                  onPostUpdateClick={() => onPostUpdateClick?.(task)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render with drag-drop using Kibo UI List
  return (
    <ListProvider onDragEnd={handleDragEnd} className={className}>
      {groups.map((group) => (
        <ListGroup key={group.name} id={group.name}>
          <ListHeader name={group.name} color={group.color} />
          <ListItems>
            {group.tasks.map((task, index) => {
              const isDraggable = canDragTask(task);

              return (
                <ListItem
                  key={task.id}
                  id={task.id}
                  name={task.name || "Untitled Task"}
                  index={index}
                  parent={group.name}
                  className={cn(!isDraggable && "cursor-default opacity-75")}
                >
                  <TaskListItem
                    task={task}
                    showAssignee={showAssignee}
                    showDueDate={showDueDate}
                    showPriority={showPriority}
                    showStatus={false}
                    showActions={showActions}
                    userType={userType}
                    onClick={() => onTaskClick?.(task)}
                    onEditClick={() => onEditClick?.(task)}
                    onPostUpdateClick={() => onPostUpdateClick?.(task)}
                  />
                </ListItem>
              );
            })}
          </ListItems>
        </ListGroup>
      ))}
    </ListProvider>
  );
}

function TaskListViewSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <div className="ml-4 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskListViewEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">No tasks to display</p>
    </div>
  );
}
