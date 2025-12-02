"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserType } from "@/hooks/use-user-type";
import { useTeams } from "@/hooks/use-teams";
import { useMentorTeams } from "@/hooks/use-mentor-teams";
import { useCohortContext } from "@/contexts/cohort-context";
import { TeamCard } from "@/components/shared/team-card";
import { MentorTeamCard } from "@/components/teams/mentor-team-card";
import { InactiveTeamsSection } from "@/components/teams/inactive-teams-section";
import { Users2 } from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Users2 className="text-muted-foreground mb-4 h-12 w-12" />
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">No teams found</p>
          <p className="text-sm">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamsPage() {
  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { selectedCohortId } = useCohortContext();

  // Use selectedCohortId for staff, or user's own cohortId for others
  const cohortId = userType === "staff" ? selectedCohortId : userContext?.cohortId;
  const { teams: allTeams, isLoading: isAllTeamsLoading } = useTeams(cohortId);
  const { teams: mentorTeams, isLoading: isMentorTeamsLoading } = useMentorTeams();

  const isLoading = isUserLoading || isAllTeamsLoading || (userType === "mentor" && isMentorTeamsLoading);

  // Split teams into active and inactive
  const { activeAllTeams, inactiveAllTeams } = useMemo(() => {
    const active = allTeams.filter((t) => t.teamStatus === "Active");
    const inactive = allTeams.filter((t) => t.teamStatus !== "Active");
    return { activeAllTeams: active, inactiveAllTeams: inactive };
  }, [allTeams]);

  const { activeMentorTeams, inactiveMentorTeams } = useMemo(() => {
    const active = mentorTeams.filter((t) => t.teamStatus === "Active");
    const inactive = mentorTeams.filter((t) => t.teamStatus !== "Active");
    return { activeMentorTeams: active, inactiveMentorTeams: inactive };
  }, [mentorTeams]);

  // Mentor view with tabs
  if (userType === "mentor") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your mentored teams
          </p>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <Tabs defaultValue="my-teams" className="space-y-6">
            <TabsList>
              <TabsTrigger value="my-teams">My Teams</TabsTrigger>
              <TabsTrigger value="all-teams">All Teams</TabsTrigger>
            </TabsList>

            <TabsContent value="my-teams" className="space-y-4">
              {mentorTeams.length === 0 ? (
                <EmptyState message="You haven't had any sessions with teams yet" />
              ) : (
                <>
                  {activeMentorTeams.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {activeMentorTeams.map((team) => (
                        <MentorTeamCard
                          key={team.id}
                          team={team}
                          href={`/teams/${team.id}`}
                        />
                      ))}
                    </div>
                  )}

                  <InactiveTeamsSection count={inactiveMentorTeams.length}>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {inactiveMentorTeams.map((team) => (
                        <MentorTeamCard
                          key={team.id}
                          team={team}
                          href={`/teams/${team.id}`}
                        />
                      ))}
                    </div>
                  </InactiveTeamsSection>
                </>
              )}
            </TabsContent>

            <TabsContent value="all-teams" className="space-y-4">
              {allTeams.length === 0 ? (
                <EmptyState message="No teams in your cohort yet" />
              ) : (
                <>
                  {activeAllTeams.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {activeAllTeams.map((team) => (
                        <TeamCard
                          key={team.id}
                          team={team}
                          variant="detailed"
                          showStats
                          showMembers
                          showDescription
                          href={`/teams/${team.id}`}
                        />
                      ))}
                    </div>
                  )}

                  <InactiveTeamsSection count={inactiveAllTeams.length}>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {inactiveAllTeams.map((team) => (
                        <TeamCard
                          key={team.id}
                          team={team}
                          variant="detailed"
                          showStats
                          showMembers
                          showDescription
                          href={`/teams/${team.id}`}
                        />
                      ))}
                    </div>
                  </InactiveTeamsSection>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    );
  }

  // Staff and student view (no tabs)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
        <p className="text-muted-foreground mt-2">
          {selectedCohortId === "all"
            ? "View all teams across cohorts"
            : "View teams in your cohort"}
        </p>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : allTeams.length === 0 ? (
        <EmptyState message="Teams will appear here once they're created" />
      ) : (
        <>
          {activeAllTeams.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeAllTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  variant="detailed"
                  showStats
                  showMembers
                  showDescription
                  href={`/teams/${team.id}`}
                />
              ))}
            </div>
          )}

          <InactiveTeamsSection count={inactiveAllTeams.length}>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {inactiveAllTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  variant="detailed"
                  showStats
                  showMembers
                  showDescription
                  href={`/teams/${team.id}`}
                />
              ))}
            </div>
          </InactiveTeamsSection>
        </>
      )}
    </div>
  );
}
