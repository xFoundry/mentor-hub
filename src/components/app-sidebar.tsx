"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/role-badge";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNavItems } from "@/components/nav-items";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { CohortHeaderDropdown } from "@/components/cohort-header-dropdown";
import { SidebarMeetingBanner } from "@/components/sidebar/sidebar-meeting-banner";
import { HelpToggle } from "@/components/onboarding";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { userType, userContext, isLoading, realUserType, isImpersonated } = useEffectiveUser();

  if (isLoading || !userType || !userContext) {
    return (
      <Sidebar {...props}>
        <SidebarContent>
          <div className="flex items-center justify-center p-4">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const navGroups = getNavItems(userType);

  // Get initials for avatar from firstName and lastName if available
  const initials = userContext.firstName && userContext.lastName
    ? `${userContext.firstName[0]}${userContext.lastName[0]}`.toUpperCase()
    : userContext.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  // Get display name (prefer fullName from database)
  const displayName = userContext.fullName || userContext.name || userContext.email;

  // Get avatar URL from headshot
  const avatarUrl = userContext.headshot?.[0]?.url;

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white dark:bg-transparent p-1.5">
                  <Image
                    src="/x-icon-blue.png"
                    alt="xFoundry Logo"
                    width={20}
                    height={20}
                  />
                </div>
                <span className="font-semibold">Mentor Hub</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Cohort Selector - Only visible for staff when NOT impersonating */}
          {realUserType === "staff" && !isImpersonated && <CohortHeaderDropdown />}
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.url;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.url}>
                          <Icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Meeting banner for students and mentors */}
      {(userType === "student" || userType === "mentor") && userContext?.email && (
        <SidebarMeetingBanner userEmail={userContext.email} />
      )}

      {/* Changelog link */}
      <div className="mt-auto px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/changelog"}>
              <Link href="/changelog">
                <Sparkles className="size-4" />
                <span>What&apos;s New</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="text-muted-foreground truncate text-xs">{userContext.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <RoleBadge role={userType} />
                <ThemeToggle />
              </div>
              {/* Help toggle for tips and onboarding */}
              <div className="border-t pt-2 mt-1">
                <HelpToggle />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                asChild
              >
                <a href="/auth/logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </a>
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
