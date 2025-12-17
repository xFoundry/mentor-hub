"use client";

import { useMemo } from "react";
import {
  TableProvider,
  TableHeader,
  TableHeaderGroup,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/kibo-ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, UserType } from "@/types/schema";
import { useTaskPermissions } from "@/hooks/use-task-permissions";
import { createTaskTableColumns } from "../items/task-table-columns";
import { isTaskOverdue } from "../task-transformers";

export interface TaskTableViewProps {
  tasks: Task[];
  userType: UserType;
  userEmail: string;
  isLoading?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskClick?: (task: Task) => void;
  onEditClick?: (task: Task) => void;
  onPostUpdateClick?: (task: Task) => void;
  showActions?: boolean;
  className?: string;
}

export function TaskTableView({
  tasks,
  userType,
  userEmail,
  isLoading = false,
  onTaskUpdate,
  onTaskClick,
  onEditClick,
  onPostUpdateClick,
  showActions = false,
  className,
}: TaskTableViewProps) {
  const { visibleColumns, canEditTask } = useTaskPermissions(userType, userEmail);

  // Create columns based on user permissions
  const columns = useMemo(() => {
    return createTaskTableColumns({
      userType,
      visibleColumns,
      onTaskUpdate,
      canEditTask,
      showActions,
      onEditClick,
      onPostUpdateClick,
      onTaskClick,
    });
  }, [userType, visibleColumns, onTaskUpdate, canEditTask, showActions, onEditClick, onPostUpdateClick, onTaskClick]);

  if (isLoading) {
    return <TaskTableViewSkeleton />;
  }

  if (tasks.length === 0) {
    return <TaskTableViewEmpty />;
  }

  return (
    <div className={cn("rounded-md border", className)}>
      <TableProvider columns={columns} data={tasks}>
        <TableHeader>
          {({ headerGroup }) => (
            <TableHeaderGroup key={headerGroup.id} headerGroup={headerGroup}>
              {({ header }) => <TableHead key={header.id} header={header} />}
            </TableHeaderGroup>
          )}
        </TableHeader>
        <TableBody>
          {({ row }) => (
            <TableRow
              key={row.id}
              row={row}
              className={cn(
                isTaskOverdue(row.original as Task) && "bg-destructive/5"
              )}
            >
              {({ cell }) => <TableCell key={cell.id} cell={cell} />}
            </TableRow>
          )}
        </TableBody>
      </TableProvider>
    </div>
  );
}

function TaskTableViewSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function TaskTableViewEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md">
      <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">No tasks to display</p>
    </div>
  );
}
