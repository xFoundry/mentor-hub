"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useUserType } from "@/hooks/use-user-type";
import { useSessions } from "@/hooks/use-sessions";
import { useCohortContext } from "@/contexts/cohort-context";
import { useLocalSessionViewState } from "@/hooks/use-session-view-state";
import { SessionView } from "@/components/sessions";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";

export default function SessionsPage() {
  const router = useRouter();
  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { selectedCohortId } = useCohortContext();
  const { sessions, isLoading: isSessionsLoading } = useSessions(
    userContext?.email,
    selectedCohortId
  );

  // Local view state (for now, until URL sync is debugged)
  const {
    viewState,
    setView,
    setFilter,
    setSort,
    setGroupBy,
    setSearch,
  } = useLocalSessionViewState();

  const isLoading = isUserLoading || isSessionsLoading;
  const isMentor = userType === "mentor";
  const isStaff = userType === "staff";
  const canCreateSession = userType && hasPermission(userType, "session", "create");

  // Handle session click - navigate to detail page
  const handleSessionClick = (session: { id: string }) => {
    router.push(`/sessions/${session.id}`);
  };

  // Handle feedback click - navigate to feedback page
  const handleFeedbackClick = (sessionId: string) => {
    router.push(`/feedback?session=${sessionId}`);
  };

  // Handle create session
  const handleCreateSession = () => {
    router.push("/sessions/new");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground mt-2">
            {isMentor
              ? "Manage your mentorship sessions"
              : isStaff
                ? "View and manage all mentorship sessions"
                : "View your mentorship sessions"}
          </p>
        </div>
        {canCreateSession && (
          <Button asChild>
            <Link href="/sessions/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Session
            </Link>
          </Button>
        )}
      </div>

      {/* Session View */}
      <SessionView
        sessions={sessions}
        isLoading={isLoading}
        userType={userType ?? "student"}
        userEmail={userContext?.email ?? ""}
        view={viewState.view}
        filter={viewState.filter}
        sort={viewState.sort}
        sortDirection={viewState.sortDirection}
        groupBy={viewState.groupBy}
        search={viewState.search}
        onViewChange={setView}
        onFilterChange={setFilter}
        onSortChange={setSort}
        onGroupByChange={setGroupBy}
        onSearchChange={setSearch}
        onSessionClick={handleSessionClick}
        onFeedbackClick={handleFeedbackClick}
        onCreateSession={handleCreateSession}
        showHeader={false}
        showStats={isStaff || isMentor}
        showFeedbackBanner={true}
        showControls={true}
        showSearch={true}
        showViewSwitcher={true}
        showFilter={true}
        showSort={true}
        showGroupBy={true}
        showCreateButton={false} // Already in page header
        showTeamName={isMentor || isStaff}
        showMentorName={userType === "student"}
        showFeedbackStatus={true}
      />
    </div>
  );
}
