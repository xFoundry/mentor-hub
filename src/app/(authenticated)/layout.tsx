"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { CohortProvider } from "@/contexts/cohort-context";
import { BreadcrumbProvider, useBreadcrumb } from "@/contexts/breadcrumb-context";
import { ImpersonationBanner } from "@/components/impersonation-banner";

/**
 * Layout Content (uses breadcrumb context)
 */
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { overrides } = useBreadcrumb();

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const defaultLabel = segment.charAt(0).toUpperCase() + segment.slice(1);
    const label = overrides[href] || defaultLabel;

    return {
      label,
      href,
      isLast: index === pathSegments.length - 1,
    };
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ImpersonationBanner />
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.flatMap((breadcrumb, index) => {
                const items = [];
                if (index > 0) {
                  items.push(
                    <BreadcrumbSeparator key={`sep-${breadcrumb.href}`} />
                  );
                }
                items.push(
                  <BreadcrumbItem
                    key={breadcrumb.href}
                    className={index === 0 ? "hidden md:block" : ""}
                  >
                    {breadcrumb.isLast ? (
                      <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={breadcrumb.href}>
                        {breadcrumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                );
                return items;
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

/**
 * Authenticated Layout
 *
 * Wraps all authenticated routes with:
 * - Sidebar navigation (role-based)
 * - Breadcrumb navigation
 * - Main content area
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CohortProvider>
      <BreadcrumbProvider>
        <LayoutContent>{children}</LayoutContent>
      </BreadcrumbProvider>
    </CohortProvider>
  );
}
