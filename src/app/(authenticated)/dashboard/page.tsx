"use client";

import { useUserType } from "@/hooks/use-user-type";
import { StudentDashboard } from "@/components/dashboards/student-dashboard";
import { MentorDashboard } from "@/components/dashboards/mentor-dashboard";
import { StaffDashboard } from "@/components/dashboards/staff-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { userType, userContext, isLoading } = useUserType();

  if (isLoading || !userContext) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Render the appropriate dashboard based on user type
  switch (userType) {
    case "student":
      return <StudentDashboard userContext={userContext} />;
    case "mentor":
      return <MentorDashboard userContext={userContext} />;
    case "staff":
      return <StaffDashboard userContext={userContext} />;
    default:
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Unable to determine user type</p>
        </div>
      );
  }
}
