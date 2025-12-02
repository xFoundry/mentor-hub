"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, Flag, User, CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, UserType } from "@/types/schema";
import { PRIORITY_CONFIG, formatDueDate, isTaskOverdue, type TaskPriority, type TaskStatus } from "../task-transformers";
import { TaskActions } from "./task-actions";

export interface TaskListItemProps {
  task: Task;
  showAssignee?: boolean;
  showDueDate?: boolean;
  showPriority?: boolean;
  showStatus?: boolean;
  showEffort?: boolean;
  showActions?: boolean;
  userType?: UserType;
  onClick?: () => void;
  onEditClick?: () => void;
  onPostUpdateClick?: () => void;
  className?: string;
}

const STATUS_ICONS = {
  "Not Started": Circle,
  "In Progress": Clock,
  "Completed": CheckCircle2,
  "Cancelled": XCircle,
} as const;

const STATUS_COLORS = {
  "Not Started": "text-muted-foreground",
  "In Progress": "text-blue-500",
  "Completed": "text-green-500",
  "Cancelled": "text-red-500",
} as const;

export function TaskListItem({
  task,
  showAssignee = true,
  showDueDate = true,
  showPriority = true,
  showStatus = true,
  showEffort = true,
  showActions = false,
  userType,
  onClick,
  onEditClick,
  onPostUpdateClick,
  className,
}: TaskListItemProps) {
  const priority = task.priority as TaskPriority | undefined;
  const status = (task.status as TaskStatus) || "Not Started";
  const priorityConfig = priority ? PRIORITY_CONFIG[priority] : null;
  const isOverdue = isTaskOverdue(task);
  const StatusIcon = STATUS_ICONS[status] || Circle;

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2",
        onClick && "cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2",
        className
      )}
      onClick={onClick}
    >
      {/* Status icon */}
      {showStatus && (
        <StatusIcon className={cn("h-4 w-4 shrink-0", STATUS_COLORS[status])} />
      )}

      {/* Task name */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          status === "Completed" && "line-through text-muted-foreground"
        )}>
          {task.name || "Untitled Task"}
        </p>

        {/* Secondary info row */}
        <div className="flex items-center gap-2 mt-0.5">
          {showAssignee && task.assignedTo?.[0] && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assignedTo[0].fullName}
            </span>
          )}

          {task.team?.[0] && (
            <span className="text-xs text-muted-foreground">
              {task.team[0].teamName}
            </span>
          )}
        </div>
      </div>

      {/* Metadata badges */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Priority */}
        {showPriority && priority && priorityConfig && (
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: priorityConfig.color }}
          >
            <Flag className="h-3 w-3" />
            <span className="font-medium hidden sm:inline">{priority}</span>
          </div>
        )}

        {/* Due date */}
        {showDueDate && task.dueDate && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3" />
            <span className="hidden sm:inline">{formatDueDate(task.dueDate)}</span>
          </div>
        )}

        {/* Level of effort */}
        {showEffort && task.levelOfEffort && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
            {task.levelOfEffort}
          </Badge>
        )}

        {/* Overdue indicator */}
        {isOverdue && (
          <Badge variant="destructive" className="text-xs">
            Overdue
          </Badge>
        )}

        {/* Action buttons */}
        {showActions && userType && (
          <TaskActions
            userType={userType}
            onEditClick={onEditClick}
            onPostUpdateClick={onPostUpdateClick}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Compact variant for dashboard widgets
 */
export function TaskListItemCompact({
  task,
  onClick,
  className,
}: Pick<TaskListItemProps, "task" | "onClick" | "className">) {
  const priority = task.priority as TaskPriority | undefined;
  const status = (task.status as TaskStatus) || "Not Started";
  const isOverdue = isTaskOverdue(task);
  const StatusIcon = STATUS_ICONS[status] || Circle;

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1.5",
        onClick && "cursor-pointer hover:bg-muted/50 rounded px-1.5 -mx-1.5",
        className
      )}
      onClick={onClick}
    >
      <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", STATUS_COLORS[status])} />

      {priority && (
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: PRIORITY_CONFIG[priority]?.color }}
        />
      )}

      <span className={cn(
        "text-sm truncate flex-1",
        status === "Completed" && "line-through text-muted-foreground"
      )}>
        {task.name || "Untitled Task"}
      </span>

      {isOverdue && (
        <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
          !
        </Badge>
      )}
    </div>
  );
}
