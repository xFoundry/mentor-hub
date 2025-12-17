"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, MessageSquare, CheckSquare } from "lucide-react";
import type { UserType } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { useCreateTaskDialog } from "@/contexts/create-task-dialog-context";

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "default" | "outline";
  href?: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  userType: UserType;
  className?: string;
}

export function QuickActions({ userType, className }: QuickActionsProps) {
  const { openDialog: openCreateTaskDialog } = useCreateTaskDialog();

  // Define actions based on user type and permissions
  const getActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];

    // Staff actions
    if (userType === "staff") {
      if (hasPermission(userType, "session", "create")) {
        actions.push({
          label: "Create Session",
          href: "/sessions/new",
          icon: Calendar,
          variant: "default",
        });
      }
      if (hasPermission(userType, "task", "create")) {
        actions.push({
          label: "Create Task",
          onClick: openCreateTaskDialog,
          icon: Plus,
          variant: "outline",
        });
      }
      actions.push({
        label: "View All Teams",
        href: "/teams",
        icon: Users,
        variant: "outline",
      });
      actions.push({
        label: "View All Tasks",
        href: "/tasks",
        icon: CheckSquare,
        variant: "outline",
      });
    }

    // Mentor actions
    if (userType === "mentor") {
      if (hasPermission(userType, "task", "create")) {
        actions.push({
          label: "Create Task",
          onClick: openCreateTaskDialog,
          icon: Plus,
          variant: "default",
        });
      }
      if (hasPermission(userType, "sessionFeedback", "create")) {
        actions.push({
          label: "Add Feedback",
          href: "/feedback",
          icon: MessageSquare,
          variant: "outline",
        });
      }
    }

    // Student actions
    if (userType === "student") {
      if (hasPermission(userType, "task", "create")) {
        actions.push({
          label: "Create Task",
          onClick: openCreateTaskDialog,
          icon: Plus,
          variant: "default",
        });
      }
      if (hasPermission(userType, "sessionFeedback", "create")) {
        actions.push({
          label: "Give Feedback",
          href: "/feedback",
          icon: MessageSquare,
          variant: "outline",
        });
      }
      actions.push({
        label: "View Sessions",
        href: "/sessions",
        icon: Calendar,
        variant: "outline",
      });
      actions.push({
        label: "View Tasks",
        href: "/tasks",
        icon: CheckSquare,
        variant: "outline",
      });
    }

    return actions;
  };

  const actions = getActions();

  if (actions.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {actions.map((action, index) => {
            const Icon = action.icon;

            if (action.onClick) {
              return (
                <Button
                  key={action.label}
                  variant={action.variant}
                  onClick={action.onClick}
                  className="justify-start"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              );
            }

            return (
              <Button
                key={action.href || index}
                variant={action.variant}
                asChild
                className="justify-start"
              >
                <Link href={action.href!}>
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
