"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TaskCard } from "./task-card";
import { EmptyState } from "./empty-state";
import { CheckSquare, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import type { Task } from "@/types/schema";
import type { UserType } from "@/lib/permissions";

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  userType: UserType;
  title?: string;
  description?: string;
  // Grouping
  groupBy?: "none" | "team" | "session" | "status";
  // Display
  variant?: "compact" | "detailed";
  showProvenance?: boolean;
  showAssignee?: boolean;
  emptyStateMessage?: string;
  maxItems?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
  onTaskClick?: (task: Task) => void;
}

export function TaskList({
  tasks,
  isLoading = false,
  userType,
  title,
  description,
  groupBy = "none",
  variant = "compact",
  showProvenance = false,
  showAssignee = false,
  emptyStateMessage = "No tasks found",
  maxItems,
  showViewAll = false,
  viewAllHref = "/tasks",
  onTaskClick,
}: TaskListProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Group tasks if needed
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") return null;

    const groups = new Map<string, { name: string; tasks: Task[] }>();

    tasks.forEach((task: Task) => {
      let groupId: string;
      let groupName: string;

      if (groupBy === "team") {
        const team = task.team?.[0];
        groupId = team?.id || "unassigned";
        groupName = team?.teamName || "Unassigned";
      } else if (groupBy === "session") {
        const session = task.session?.[0];
        groupId = session?.id || "manual";
        groupName = session?.sessionType || "Manually Created";
      } else if (groupBy === "status") {
        groupId = task.status || "unknown";
        groupName = task.status || "Unknown";
      } else {
        groupId = "all";
        groupName = "All Tasks";
      }

      const existing = groups.get(groupId);
      if (existing) {
        existing.tasks.push(task);
      } else {
        groups.set(groupId, { name: groupName, tasks: [task] });
      }
    });

    return Array.from(groups.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      tasks: data.tasks,
    }));
  }, [tasks, groupBy]);

  // Apply max items limit
  const displayTasks = maxItems ? tasks.slice(0, maxItems) : tasks;

  if (isLoading) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <EmptyState icon={CheckSquare} title={emptyStateMessage} />
        </CardContent>
      </Card>
    );
  }

  // Grouped view
  if (groupBy !== "none" && groupedTasks) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="space-y-2">
          {groupedTasks.map((group) => (
            <Collapsible
              key={group.id}
              open={openGroups.has(group.id)}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 py-2 h-auto"
                >
                  <span className="flex items-center gap-2">
                    {openGroups.has(group.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{group.name}</span>
                    <span className="text-muted-foreground text-sm">
                      ({group.tasks.length})
                    </span>
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-2 pt-2">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    variant={variant}
                    userType={userType}
                    showProvenance={showProvenance}
                    showAssignee={showAssignee}
                    onClick={onTaskClick ? () => onTaskClick(task) : undefined}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Flat list view
  return (
    <Card>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showViewAll && tasks.length > (maxItems || 0) && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={viewAllHref}>
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-2">
        {displayTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            variant={variant}
            userType={userType}
            showProvenance={showProvenance}
            showAssignee={showAssignee}
            onClick={onTaskClick ? () => onTaskClick(task) : undefined}
          />
        ))}
        {showViewAll && tasks.length > (maxItems || 0) && !title && (
          <Button variant="outline" className="w-full" asChild>
            <Link href={viewAllHref}>
              View all {tasks.length} tasks
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
