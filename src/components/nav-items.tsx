import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  MessageSquare,
  Users2,
  UserCircle,
  Mail,
  Terminal,
  BookUser,
  Bot,
  Zap,
  LayoutGrid,
} from "lucide-react";
import type { UserType } from "@/types/schema";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Get navigation items based on user role
 */
export function getNavItems(userType: UserType): NavGroup[] {
  switch (userType) {
    case "student":
      return [
        {
          title: "Main",
          items: [
            {
              title: "Dashboard",
              url: "/dashboard",
              icon: LayoutDashboard,
            },
            {
              title: "Mentors",
              url: "/mentors",
              icon: Users,
            },
            {
              title: "Sessions",
              url: "/sessions",
              icon: Calendar,
            },
            {
              title: "Action Items",
              url: "/tasks",
              icon: CheckSquare,
            },
            {
              title: "Feedback",
              url: "/feedback",
              icon: MessageSquare,
            },
          ],
        },
      ];

    case "mentor":
      return [
        {
          title: "Main",
          items: [
            {
              title: "Dashboard",
              url: "/dashboard",
              icon: LayoutDashboard,
            },
            {
              title: "Sessions",
              url: "/sessions",
              icon: Calendar,
            },
            {
              title: "Teams",
              url: "/teams",
              icon: Users2,
            },
            {
              title: "Action Items",
              url: "/tasks",
              icon: CheckSquare,
            },
            {
              title: "Feedback",
              url: "/feedback",
              icon: MessageSquare,
            },
          ],
        },
      ];

    case "staff":
      return [
        {
          title: "Main",
          items: [
            {
              title: "Dashboard",
              url: "/dashboard",
              icon: LayoutDashboard,
            },
          ],
        },
        {
          title: "Management",
          items: [
            {
              title: "Sessions",
              url: "/sessions",
              icon: Calendar,
            },
            {
              title: "Teams",
              url: "/teams",
              icon: Users2,
            },
            {
              title: "Mentors",
              url: "/mentors",
              icon: Users,
            },
            {
              title: "Contacts",
              url: "/contacts",
              icon: BookUser,
            },
            {
              title: "Action Items",
              url: "/tasks",
              icon: CheckSquare,
            },
            {
              title: "Feedback",
              url: "/feedback",
              icon: MessageSquare,
            },
          ],
        },
        {
          title: "Settings",
          items: [
            {
              title: "Email Management",
              url: "/admin/emails",
              icon: Mail,
            },
            {
              title: "API Tools",
              url: "/admin/api-tools",
              icon: Terminal,
            },
            {
              title: "Chat",
              url: "/chat",
              icon: Bot,
            },
            {
              title: "Chat v2",
              url: "/chat-v2",
              icon: Zap,
            },
            {
              title: "Map",
              url: "/canvas",
              icon: LayoutGrid,
            },
            {
              title: "Map v2",
              url: "/map-v2",
              icon: LayoutGrid,
            },
            {
              title: "Impersonate User",
              url: "/impersonate",
              icon: UserCircle,
            },
          ],
        },
      ];

    default:
      return [];
  }
}
