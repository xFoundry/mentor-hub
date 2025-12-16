"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/schema";
import type { UserType } from "@/lib/permissions";

interface SessionTasksTabProps {
  tasks: Task[];
  sessionId: string;
  userType: UserType;
  /** Callback when a task is clicked */
  onTaskClick?: (task: Task) => void;
}

const STATUS_CONFIG = {
  "Not Started": {
    icon: Circle,
    color: "text-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
  "In Progress": {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
  },
  "Completed": {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/50",
  },
  "Cancelled": {
    icon: Circle,
    color: "text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900",
  },
  "Blocked": {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/50",
  },
};

export function SessionTasksTab({
  tasks,
  sessionId,
  userType,
  onTaskClick,
}: SessionTasksTabProps) {
  const isMentor = userType === "mentor";

  // Calculate stats
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === "Completed").length;
    const inProgress = tasks.filter(t => t.status === "In Progress").length;
    const notStarted = tasks.filter(t => t.status === "Not Started").length;
    const overdue = tasks.filter(t => {
      if (t.status === "Completed" || t.status === "Cancelled" || !t.due) return false;
      return isPast(new Date(t.due));
    }).length;

    return {
      total: tasks.length,
      completed,
      inProgress,
      notStarted,
      overdue,
      completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  // Sort tasks: overdue first, then by due date, then by status
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Completed tasks last
      if (a.status === "Completed" && b.status !== "Completed") return 1;
      if (b.status === "Completed" && a.status !== "Completed") return -1;

      // Overdue tasks first
      const aOverdue = a.due && isPast(new Date(a.due)) && a.status !== "Completed";
      const bOverdue = b.due && isPast(new Date(b.due)) && b.status !== "Completed";
      if (aOverdue && !bOverdue) return -1;
      if (bOverdue && !aOverdue) return 1;

      // Then by due date
      if (a.due && b.due) {
        return new Date(a.due).getTime() - new Date(b.due).getTime();
      }
      if (a.due) return -1;
      if (b.due) return 1;

      return 0;
    });
  }, [tasks]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="h-4 w-4" />
                Task Progress
              </CardTitle>
              {!isMentor && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/tasks/new?session=${sessionId}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Progress value={stats.completionRate} className="flex-1" />
              <span className="text-sm font-medium min-w-[3rem] text-right">
                {stats.completionRate}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              {stats.overdue > 0 && (
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      {sortedTasks.length > 0 ? (
        <div className="space-y-3">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">No action items yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tasks from this session will appear here
            </p>
            {!isMentor && (
              <Button size="sm" className="mt-4" asChild>
                <Link href={`/tasks/new?session=${sessionId}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Individual task card
 */
function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick?: () => void;
}) {
  const status = task.status as keyof typeof STATUS_CONFIG || "Not Started";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Not Started"];
  const StatusIcon = config.icon;

  const isOverdue = task.due &&
    task.status !== "Completed" &&
    task.status !== "Cancelled" &&
    isPast(new Date(task.due));

  const isDueToday = task.due && isToday(new Date(task.due));

  const assignee = task.assignedTo?.[0];

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-4 transition-all",
        "hover:bg-accent hover:border-accent-foreground/20",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isOverdue && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn("mt-0.5 rounded-full p-1", config.bgColor)}>
            <StatusIcon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className={cn(
              "font-medium truncate",
              task.status === "Completed" && "line-through text-muted-foreground"
            )}>
              {task.name}
            </p>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {task.due && (
                <Badge
                  variant={isOverdue ? "destructive" : isDueToday ? "default" : "outline"}
                  className="text-xs"
                >
                  <Calendar className="mr-1 h-3 w-3" />
                  {isOverdue
                    ? `Overdue by ${formatDistanceToNow(new Date(task.due))}`
                    : isDueToday
                    ? "Due today"
                    : format(new Date(task.due), "MMM d")}
                </Badge>
              )}
              {task.priority && task.priority !== "Medium" && (
                <Badge variant="outline" className={cn(
                  "text-xs",
                  task.priority === "High" && "border-amber-300 bg-amber-50 text-amber-700",
                  task.priority === "Urgent" && "border-red-300 bg-red-50 text-red-700"
                )}>
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {assignee && (
            <Avatar className="h-7 w-7">
              <AvatarImage src={assignee.headshot?.[0]?.url} alt={assignee.fullName} />
              <AvatarFallback className="text-xs">{getInitials(assignee.fullName)}</AvatarFallback>
            </Avatar>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}
