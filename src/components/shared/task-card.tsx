"use client";

import Link from "next/link";
import { format, parseISO, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckSquare, AlertCircle, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { parseAsLocalTime } from "@/components/sessions/session-transformers";
import type { Task } from "@/types/schema";
import type { UserType } from "@/lib/permissions";

interface TaskCardProps {
  task: Task;
  variant?: "compact" | "detailed";
  userType: UserType;
  showProvenance?: boolean;
  showAssignee?: boolean;
  onClick?: () => void;
}

export function TaskCard({
  task,
  variant = "compact",
  userType,
  showProvenance = false,
  showAssignee = true,
  onClick,
}: TaskCardProps) {
  const assignee = task.assignedTo?.[0];
  const session = task.session?.[0];
  const team = task.team?.[0];
  const latestUpdate = task.updates?.[0];

  const dueDate = task.due ? parseISO(task.due) : null;
  const isOverdue = dueDate && isPast(dueDate) && task.status !== "Completed";

  const getHealthBadge = () => {
    if (!latestUpdate?.health) return null;
    switch (latestUpdate.health) {
      case "On Track":
        return (
          <Badge variant="outline" className="border-green-400 bg-green-50 text-green-800 gap-1">
            <TrendingUp className="h-3 w-3" />
            On Track
          </Badge>
        );
      case "At Risk":
        return (
          <Badge variant="outline" className="border-yellow-400 bg-yellow-50 text-yellow-800 gap-1">
            <Minus className="h-3 w-3" />
            At Risk
          </Badge>
        );
      case "Off Track":
        return (
          <Badge variant="outline" className="border-red-400 bg-red-50 text-red-800 gap-1">
            <TrendingDown className="h-3 w-3" />
            Off Track
          </Badge>
        );
      case "Completed":
        return (
          <Badge variant="outline" className="border-green-400 bg-green-50 text-green-800 gap-1">
            <CheckSquare className="h-3 w-3" />
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (task.status) {
      case "Completed":
        return <Badge variant="outline" className="border-green-400 bg-green-50 text-green-800">Completed</Badge>;
      case "In Progress":
        return <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-800">In Progress</Badge>;
      case "Not Started":
        return <Badge variant="secondary">Not Started</Badge>;
      case "Cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case "Urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "High":
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case "Medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "Low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const content = (
    <div className="rounded-lg border p-3 transition-colors hover:bg-muted">
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{task.name}</span>
            </div>

            {/* Task provenance - where it came from */}
            {showProvenance && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {session ? (
                  <span>
                    From: {session.sessionType}
                    {session.scheduledStart && (
                      <span> ({format(parseAsLocalTime(session.scheduledStart), "MMM d")})</span>
                    )}
                  </span>
                ) : (
                  <span>Self-created</span>
                )}
              </div>
            )}

            {/* Assignee and team info */}
            {(showAssignee || team) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {showAssignee && assignee && (
                  <span>Assigned to: {assignee.fullName}</span>
                )}
                {team && (
                  <span className="text-muted-foreground">• {team.teamName}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {getHealthBadge()}
            {getPriorityBadge()}
            {getStatusBadge()}
          </div>
        </div>

        {variant === "detailed" && task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Due date */}
        {dueDate && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
            {isOverdue && <AlertCircle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            <span>Due: {format(dueDate, "MMM d, yyyy")}</span>
            {isOverdue && <span className="font-medium">(Overdue)</span>}
          </div>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link href="/tasks" className="block">
      {content}
    </Link>
  );
}
