"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, Flag, User, Users, GripVertical, TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanCardData, TaskPriority, TaskHealth } from "../task-transformers";
import { PRIORITY_CONFIG, formatDueDate } from "../task-transformers";
import type { UserType } from "@/types/schema";
import { TaskActions } from "./task-actions";

const HEALTH_CONFIG: Record<TaskHealth, { icon: typeof TrendingUp; color: string; bgColor: string }> = {
  "On Track": { icon: TrendingUp, color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
  "At Risk": { icon: Minus, color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200" },
  "Off Track": { icon: TrendingDown, color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
  "Completed": { icon: CheckCircle2, color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
};

export interface TaskKanbanCardProps {
  card: KanbanCardData;
  isDraggable?: boolean;
  showAssignee?: boolean;
  showDueDate?: boolean;
  showPriority?: boolean;
  showEffort?: boolean;
  showTeam?: boolean;
  showHealth?: boolean;
  showActions?: boolean;
  userType?: UserType;
  onClick?: () => void;
  onEditClick?: () => void;
  onPostUpdateClick?: () => void;
  className?: string;
}

export function TaskKanbanCard({
  card,
  isDraggable = true,
  showAssignee = true,
  showDueDate = true,
  showPriority = true,
  showEffort = true,
  showTeam = false,
  showHealth = true,
  showActions = false,
  userType,
  onClick,
  onEditClick,
  onPostUpdateClick,
  className,
}: TaskKanbanCardProps) {
  const priorityConfig = card.priority ? PRIORITY_CONFIG[card.priority] : null;
  const healthConfig = card.latestHealth ? HEALTH_CONFIG[card.latestHealth] : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Header with drag handle and title */}
      <div className="flex items-start gap-2">
        {isDraggable && (
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-0.5" />
        )}
        <p className="flex-1 font-medium text-sm leading-tight">{card.name}</p>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Priority */}
        {showPriority && card.priority && priorityConfig && (
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: priorityConfig.color }}
          >
            <Flag className="h-3 w-3" />
            <span className="font-medium">{card.priority}</span>
          </div>
        )}

        {/* Due date */}
        {showDueDate && card.dueDate && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground",
              card.isOverdue && "text-destructive font-medium"
            )}
          >
            <Calendar className="h-3 w-3" />
            <span>{formatDueDate(card.dueDate)}</span>
          </div>
        )}

        {/* Level of effort */}
        {showEffort && card.levelOfEffort && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
            {card.levelOfEffort}
          </Badge>
        )}

        {/* Health status */}
        {showHealth && healthConfig && (
          <Badge variant="outline" className={cn("text-xs px-1.5 py-0 h-5 gap-1", healthConfig.bgColor, healthConfig.color)}>
            <healthConfig.icon className="h-3 w-3" />
            {card.latestHealth}
          </Badge>
        )}
      </div>

      {/* Assignee */}
      {showAssignee && card.assigneeName && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="truncate">{card.assigneeName}</span>
        </div>
      )}

      {/* Team */}
      {showTeam && card.teamName && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span className="truncate">{card.teamName}</span>
        </div>
      )}

      {/* Overdue indicator */}
      {card.isOverdue && (
        <Badge variant="destructive" className="text-xs w-fit">
          Overdue
        </Badge>
      )}

      {/* Action buttons */}
      {showActions && userType && (
        <TaskActions
          userType={userType}
          onEditClick={onEditClick}
          onPostUpdateClick={onPostUpdateClick}
          compact
          className="mt-1"
        />
      )}
    </div>
  );
}

/**
 * Compact variant for smaller spaces
 */
export function TaskKanbanCardCompact({
  card,
  onClick,
  className,
}: Pick<TaskKanbanCardProps, "card" | "onClick" | "className">) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {card.priority && (
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: PRIORITY_CONFIG[card.priority]?.color }}
        />
      )}
      <span className="text-sm truncate flex-1">{card.name}</span>
      {card.isOverdue && (
        <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
          !
        </Badge>
      )}
    </div>
  );
}
