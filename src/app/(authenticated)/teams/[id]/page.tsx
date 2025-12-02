"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamDetail } from "@/hooks/use-team-detail";
import { useUserType } from "@/hooks/use-user-type";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { AlertCircle } from "lucide-react";
import {
  TeamDetailStudent,
  TeamDetailMentor,
  TeamDetailStaff,
} from "@/components/teams";

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.id as string;
  const { team, isLoading: isTeamLoading } = useTeamDetail(teamId);
  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { setOverride, clearOverride } = useBreadcrumb();

  const isLoading = isTeamLoading || isUserLoading;

  // Update breadcrumb when team loads
  useEffect(() => {
    if (team?.teamName) {
      setOverride(`/teams/${teamId}`, team.teamName);
    }

    return () => {
      clearOverride(`/teams/${teamId}`);
    };
  }, [team?.teamName, teamId, setOverride, clearOverride]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">Team not found</p>
            <p className="text-sm">The team you're looking for doesn't exist</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userContext) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">Unable to load user context</p>
            <p className="text-sm">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render role-specific view
  switch (userType) {
    case "student":
      return <TeamDetailStudent team={team} userContext={userContext} />;
    case "mentor":
      return <TeamDetailMentor team={team} userContext={userContext} />;
    case "staff":
      return <TeamDetailStaff team={team} userContext={userContext} />;
    default:
      // Fallback to student view if role is unknown
      return <TeamDetailStudent team={team} userContext={userContext} />;
  }
}
