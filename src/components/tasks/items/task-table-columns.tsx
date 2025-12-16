"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Flag, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, UserType } from "@/types/schema";
import {
  PRIORITY_CONFIG,
  formatDueDate,
  isTaskOverdue,
  type TaskPriority,
  type TaskStatus,
} from "../task-transformers";
import { TableColumnHeader } from "@/components/kibo-ui/table";
import { TaskActions } from "./task-actions";

const STATUS_OPTIONS: TaskStatus[] = ["Not Started", "In Progress", "Completed", "Cancelled"];
const PRIORITY_OPTIONS: TaskPriority[] = ["Urgent", "High", "Medium", "Low"];
const EFFORT_OPTIONS = ["XS", "S", "M", "L", "XL"];

interface CreateColumnsOptions {
  userType: UserType;
  visibleColumns: string[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  canEditTask?: (task: Task) => boolean;
  showActions?: boolean;
  onEditClick?: (task: Task) => void;
  onPostUpdateClick?: (task: Task) => void;
}

export function createTaskTableColumns({
  userType,
  visibleColumns,
  onTaskUpdate,
  canEditTask,
  showActions = false,
  onEditClick,
  onPostUpdateClick,
}: CreateColumnsOptions): ColumnDef<Task>[] {
  const columns: ColumnDef<Task>[] = [];

  // Name column (always visible)
  if (visibleColumns.includes("name")) {
    columns.push({
      accessorKey: "name",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Task" />
      ),
      cell: ({ row }) => {
        const task = row.original;
        const isOverdue = isTaskOverdue(task);

        return (
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium",
              task.status === "Completed" && "line-through text-muted-foreground"
            )}>
              {task.name || "Untitled Task"}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                Overdue
              </Badge>
            )}
          </div>
        );
      },
    });
  }

  // Status column
  if (visibleColumns.includes("status")) {
    columns.push({
      accessorKey: "status",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const task = row.original;
        const canEdit = canEditTask?.(task) ?? false;

        if (canEdit && onTaskUpdate) {
          return (
            <Select
              value={task.status || "Not Started"}
              onValueChange={(value) => onTaskUpdate(task.id, { status: value as TaskStatus })}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        return (
          <Badge variant="outline">
            {task.status || "Not Started"}
          </Badge>
        );
      },
    });
  }

  // Priority column
  if (visibleColumns.includes("priority")) {
    columns.push({
      accessorKey: "priority",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => {
        const task = row.original;
        const priority = task.priority as TaskPriority | undefined;
        const canEdit = canEditTask?.(task) ?? false;

        if (canEdit && onTaskUpdate) {
          return (
            <Select
              value={task.priority || "Medium"}
              onValueChange={(value) => onTaskUpdate(task.id, { priority: value as TaskPriority })}
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    <div className="flex items-center gap-2">
                      <Flag
                        className="h-3 w-3"
                        style={{ color: PRIORITY_CONFIG[p].color }}
                      />
                      {p}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        if (!priority) return <span className="text-muted-foreground">-</span>;

        return (
          <div
            className="flex items-center gap-1 text-sm"
            style={{ color: PRIORITY_CONFIG[priority].color }}
          >
            <Flag className="h-3 w-3" />
            <span>{priority}</span>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const orderA = PRIORITY_CONFIG[rowA.original.priority as TaskPriority]?.order ?? 4;
        const orderB = PRIORITY_CONFIG[rowB.original.priority as TaskPriority]?.order ?? 4;
        return orderA - orderB;
      },
    });
  }

  // Due date column
  if (visibleColumns.includes("due")) {
    columns.push({
      accessorKey: "due",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Due Date" />
      ),
      cell: ({ row }) => {
        const task = row.original;
        const isOverdue = isTaskOverdue(task);

        if (!task.due) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}>
            <Calendar className="h-3 w-3" />
            <span>{formatDueDate(task.due)}</span>
          </div>
        );
      },
    });
  }

  // Assignee column
  if (visibleColumns.includes("assignee")) {
    columns.push({
      accessorKey: "assignedTo",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Assignee" />
      ),
      cell: ({ row }) => {
        const assignee = row.original.assignedTo?.[0];

        if (!assignee) {
          return <span className="text-muted-foreground">Unassigned</span>;
        }

        return (
          <div className="flex items-center gap-1 text-sm">
            <User className="h-3 w-3 text-muted-foreground" />
            <span>{assignee.fullName}</span>
          </div>
        );
      },
    });
  }

  // Team column
  if (visibleColumns.includes("team")) {
    columns.push({
      accessorKey: "team",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Team" />
      ),
      cell: ({ row }) => {
        const team = row.original.team?.[0];

        if (!team) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <div className="flex items-center gap-1 text-sm">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span>{team.teamName}</span>
          </div>
        );
      },
    });
  }

  // Level of effort column
  if (visibleColumns.includes("levelOfEffort")) {
    columns.push({
      accessorKey: "levelOfEffort",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Effort" />
      ),
      cell: ({ row }) => {
        const task = row.original;
        const canEdit = canEditTask?.(task) ?? false;

        if (canEdit && onTaskUpdate) {
          return (
            <Select
              value={task.levelOfEffort || "M"}
              onValueChange={(value) => onTaskUpdate(task.id, { levelOfEffort: value as Task["levelOfEffort"] })}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EFFORT_OPTIONS.map((effort) => (
                  <SelectItem key={effort} value={effort}>
                    {effort}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        if (!task.levelOfEffort) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <Badge variant="outline" className="text-xs">
            {task.levelOfEffort}
          </Badge>
        );
      },
    });
  }

  // Session column
  if (visibleColumns.includes("session")) {
    columns.push({
      accessorKey: "session",
      header: "Source",
      cell: ({ row }) => {
        const session = row.original.session?.[0];

        if (!session) {
          return <span className="text-muted-foreground">Manual</span>;
        }

        return (
          <Badge variant="secondary" className="text-xs">
            {session.sessionType}
          </Badge>
        );
      },
    });
  }

  // Actions column
  if (showActions) {
    columns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const task = row.original;
        return (
          <TaskActions
            userType={userType}
            onEditClick={() => onEditClick?.(task)}
            onPostUpdateClick={() => onPostUpdateClick?.(task)}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    });
  }

  return columns;
}
