"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
  type KanbanColumnProps,
} from "@/components/kibo-ui/kanban";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task, UserType } from "@/types/schema";
import {
  KANBAN_COLUMNS,
  transformTasksToKanbanData,
  columnIdToStatus,
  type KanbanCardData,
} from "../task-transformers";
import { TaskKanbanCard } from "../items/task-kanban-card";
import { useTaskPermissions } from "@/hooks/use-task-permissions";

export interface TaskKanbanViewProps {
  tasks: Task[];
  userType: UserType;
  userEmail: string;
  isLoading?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskClick?: (task: Task) => void;
  onEditClick?: (task: Task) => void;
  onPostUpdateClick?: (task: Task) => void;
  showAssignee?: boolean;
  showDueDate?: boolean;
  showPriority?: boolean;
  showTeam?: boolean;
  showActions?: boolean;
  /** Disable all drag-and-drop functionality */
  disableDrag?: boolean;
  className?: string;
}

export function TaskKanbanView({
  tasks,
  userType,
  userEmail,
  isLoading = false,
  onTaskUpdate,
  onTaskClick,
  onEditClick,
  onPostUpdateClick,
  showAssignee = true,
  showDueDate = true,
  showPriority = true,
  showTeam = false,
  showActions = false,
  disableDrag = false,
  className,
}: TaskKanbanViewProps) {
  const { canDragTask: baseCanDragTask } = useTaskPermissions(userType, userEmail);

  // Override drag permission if disableDrag is true
  const canDragTask = disableDrag ? () => false : baseCanDragTask;

  // Transform tasks to kanban card data - use state to allow visual updates during drag
  const serverKanbanData = useMemo(() => transformTasksToKanbanData(tasks), [tasks]);
  const [kanbanData, setKanbanData] = useState<KanbanCardData[]>(serverKanbanData);

  // Sync local state with server data when tasks change
  useEffect(() => {
    setKanbanData(serverKanbanData);
  }, [serverKanbanData]);

  // Column type with color extension
  type KanbanColumn = KanbanColumnProps & { color: string };

  // Create column definitions for Kibo UI
  const columns = useMemo<KanbanColumn[]>(() =>
    KANBAN_COLUMNS.map(col => ({
      id: col.id,
      name: col.name,
      color: col.color,
    })),
    []
  );

  // Count tasks per column for badges
  const columnCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const col of KANBAN_COLUMNS) {
      counts[col.id] = kanbanData.filter(card => card.column === col.id).length;
    }
    return counts;
  }, [kanbanData]);

  // Handle drag end - update task status
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !onTaskUpdate) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);

    if (!task) return;

    // Check if user can drag this task
    if (!canDragTask(task)) {
      // Reset to server state if drag not allowed
      setKanbanData(serverKanbanData);
      return;
    }

    // Find the target column from the current kanban data state
    // Over could be a card (move to same column as card) or a column itself
    const overCard = kanbanData.find(card => card.id === over.id);
    const targetColumnId = overCard?.column || (over.id as string);

    // Convert column ID to status
    const newStatus = columnIdToStatus(targetColumnId);

    // Only update if status actually changed
    if (task.status !== newStatus) {
      await onTaskUpdate(taskId, { status: newStatus });
    } else {
      // Reset to server state if no change needed
      setKanbanData(serverKanbanData);
    }
  }, [tasks, kanbanData, serverKanbanData, onTaskUpdate, canDragTask]);

  // Handle data change from Kibo UI - update local state for visual feedback during drag
  const handleDataChange = useCallback((newData: KanbanCardData[]) => {
    setKanbanData(newData);
  }, []);

  if (isLoading) {
    return <TaskKanbanViewSkeleton />;
  }

  return (
    <div className={cn("h-full min-h-[400px]", className)}>
      <KanbanProvider
        columns={columns}
        data={kanbanData}
        onDragEnd={handleDragEnd}
        onDataChange={handleDataChange}
        className="h-full"
      >
        {(column) => (
          <KanbanBoard key={column.id} id={column.id}>
            <KanbanHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <span className="font-semibold">{column.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {columnCounts[column.id] || 0}
              </Badge>
            </KanbanHeader>
            <KanbanCards<KanbanCardData> id={column.id}>
              {(card) => {
                const isDraggable = canDragTask(card.originalTask);

                return (
                  <KanbanCard
                    key={card.id}
                    id={card.id}
                    name={card.name}
                    column={card.column}
                    className={cn(
                      !isDraggable && "cursor-default opacity-75",
                      card.isOverdue && "border-destructive/50"
                    )}
                  >
                    <TaskKanbanCard
                      card={card}
                      isDraggable={isDraggable}
                      showAssignee={showAssignee}
                      showDueDate={showDueDate}
                      showPriority={showPriority}
                      showTeam={showTeam}
                      showActions={showActions}
                      userType={userType}
                      onClick={() => onTaskClick?.(card.originalTask)}
                      onEditClick={() => onEditClick?.(card.originalTask)}
                      onPostUpdateClick={() => onPostUpdateClick?.(card.originalTask)}
                    />
                  </KanbanCard>
                );
              }}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>
    </div>
  );
}

function TaskKanbanViewSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4 h-full min-h-[400px]">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
