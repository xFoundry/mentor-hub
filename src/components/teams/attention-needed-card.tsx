"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageSquare, CheckSquare, Clock, ArrowRight } from "lucide-react";
import type { Session, Task } from "@/types/schema";
import type { UserType } from "@/lib/permissions";
import { hasMentorFeedback, hasMenteeFeedback, isSessionEligibleForFeedback } from "@/components/sessions/session-transformers";

interface AttentionItem {
  type: "feedback" | "overdue" | "pending";
  count: number;
  label: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

interface AttentionNeededCardProps {
  sessions: Session[];
  tasks: Task[];
  userType: UserType;
  userEmail?: string;
  teamId?: string;
  onFeedbackClick?: (sessionId: string) => void;
  /** Callback when "View Tasks" is clicked - used to switch to tasks tab on team pages */
  onViewTasks?: () => void;
}

export function AttentionNeededCard({
  sessions,
  tasks,
  userType,
  userEmail,
  teamId,
  onFeedbackClick,
  onViewTasks,
}: AttentionNeededCardProps) {
  // Calculate attention items based on user type
  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    if (userType === "mentor") {
      // Mentor-specific: Sessions needing mentor feedback
      const sessionsNeedingFeedback = sessions.filter(
        (s) => isSessionEligibleForFeedback(s) && !hasMentorFeedback(s)
      );
      if (sessionsNeedingFeedback.length > 0) {
        items.push({
          type: "feedback",
          count: sessionsNeedingFeedback.length,
          label: `session${sessionsNeedingFeedback.length !== 1 ? "s" : ""} need${sessionsNeedingFeedback.length === 1 ? "s" : ""} your feedback`,
          actionLabel: "Add Feedback",
          actionHref: "/feedback",
        });
      }
    } else if (userType === "student") {
      // Student-specific: Sessions needing student feedback
      const sessionsNeedingFeedback = sessions.filter(
        (s) => isSessionEligibleForFeedback(s) && !hasMenteeFeedback(s)
      );
      if (sessionsNeedingFeedback.length > 0) {
        items.push({
          type: "feedback",
          count: sessionsNeedingFeedback.length,
          label: `session${sessionsNeedingFeedback.length !== 1 ? "s" : ""} need${sessionsNeedingFeedback.length === 1 ? "s" : ""} your feedback`,
          actionLabel: "Add Feedback",
          actionHref: "/feedback",
        });
      }
    }

    // Common: Overdue tasks
    const overdueTasks = tasks.filter((t: any) => {
      if (t.status === "Completed" || t.status === "Cancelled" || !t.due) return false;
      return new Date(t.due) < new Date();
    });
    if (overdueTasks.length > 0) {
      items.push({
        type: "overdue",
        count: overdueTasks.length,
        label: `task${overdueTasks.length !== 1 ? "s" : ""} overdue`,
        actionLabel: "View Tasks",
        // Use callback if provided (team page), otherwise navigate to /tasks
        ...(onViewTasks ? { onAction: onViewTasks } : { actionHref: "/tasks" }),
      });
    }

    // Staff/Mentor-specific: Pending tasks (not started)
    if (userType === "staff" || userType === "mentor") {
      const pendingTasks = tasks.filter((t: any) => t.status === "Not Started");
      if (pendingTasks.length > 0) {
        items.push({
          type: "pending",
          count: pendingTasks.length,
          label: `task${pendingTasks.length !== 1 ? "s" : ""} not started`,
          actionLabel: "View Tasks",
          // Use callback if provided (team page), otherwise navigate to /tasks
          ...(onViewTasks ? { onAction: onViewTasks } : { actionHref: "/tasks" }),
        });
      }
    }

    return items;
  }, [sessions, tasks, userType, onViewTasks]);

  // Don't render if there are no attention items
  if (attentionItems.length === 0) {
    return null;
  }

  const totalItems = attentionItems.reduce((sum, item) => sum + item.count, 0);
  const variant = userType === "mentor" ? "amber" : userType === "student" ? "blue" : "default";

  const bgClass = {
    amber: "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
    blue: "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
    default: "border-muted",
  }[variant];

  const iconClass = {
    amber: "text-amber-600",
    blue: "text-blue-600",
    default: "text-muted-foreground",
  }[variant];

  const badgeClass = {
    amber: "border-amber-400 bg-amber-100 text-amber-800",
    blue: "border-blue-400 bg-blue-100 text-blue-800",
    default: "",
  }[variant];

  return (
    <Card className={bgClass}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={`h-4 w-4 ${iconClass}`} />
          Needs Your Attention
          <Badge variant="outline" className={badgeClass}>
            {totalItems}
          </Badge>
        </CardTitle>
        <CardDescription>
          {userType === "mentor"
            ? "Items requiring your action"
            : userType === "student"
            ? "Things to complete for your mentorship"
            : "Items requiring attention across the team"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {attentionItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg border bg-background p-3"
          >
            <div className="flex items-center gap-3">
              {item.type === "feedback" && (
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              )}
              {item.type === "overdue" && (
                <Clock className="h-4 w-4 text-destructive" />
              )}
              {item.type === "pending" && (
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">
                <span className="font-medium">{item.count}</span> {item.label}
              </span>
            </div>
            {item.actionLabel && (
              item.onAction ? (
                <Button variant="ghost" size="sm" onClick={item.onAction}>
                  {item.actionLabel}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={item.actionHref || "#"}>
                    {item.actionLabel}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
