"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, MessageSquare, CheckSquare } from "lucide-react";
import type { UserType } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

interface QuickActionsProps {
  userType: UserType;
  className?: string;
}

export function QuickActions({ userType, className }: QuickActionsProps) {
  // Define actions based on user type and permissions
  const getActions = () => {
    const actions = [];

    // Staff actions
    if (userType === "staff") {
      if (hasPermission(userType, "session", "create")) {
        actions.push({
          label: "Create Session",
          href: "/sessions/new",
          icon: Calendar,
          variant: "default" as const,
        });
      }
      actions.push({
        label: "View All Teams",
        href: "/teams",
        icon: Users,
        variant: "outline" as const,
      });
      actions.push({
        label: "View All Tasks",
        href: "/tasks",
        icon: CheckSquare,
        variant: "outline" as const,
      });
    }

    // Mentor actions
    if (userType === "mentor") {
      if (hasPermission(userType, "task", "create")) {
        actions.push({
          label: "Create Task",
          href: "/tasks/new",
          icon: Plus,
          variant: "default" as const,
        });
      }
      if (hasPermission(userType, "sessionFeedback", "create")) {
        actions.push({
          label: "Add Feedback",
          href: "/feedback",
          icon: MessageSquare,
          variant: "outline" as const,
        });
      }
    }

    // Student actions
    if (userType === "student") {
      if (hasPermission(userType, "task", "create")) {
        actions.push({
          label: "Create Task",
          href: "/tasks/new",
          icon: Plus,
          variant: "default" as const,
        });
      }
      if (hasPermission(userType, "sessionFeedback", "create")) {
        actions.push({
          label: "Give Feedback",
          href: "/feedback",
          icon: MessageSquare,
          variant: "outline" as const,
        });
      }
      actions.push({
        label: "View Sessions",
        href: "/sessions",
        icon: Calendar,
        variant: "outline" as const,
      });
      actions.push({
        label: "View Tasks",
        href: "/tasks",
        icon: CheckSquare,
        variant: "outline" as const,
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
          {actions.map((action) => (
            <Button
              key={action.href}
              variant={action.variant}
              asChild
              className="justify-start"
            >
              <Link href={action.href}>
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
