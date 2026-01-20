"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useUserType } from "@/hooks/use-user-type";
import { useSessions } from "@/hooks/use-sessions";
import { useCohortContext } from "@/contexts/cohort-context";
import { useLocalSessionViewState } from "@/hooks/use-session-view-state";
import { SessionView, CreateSessionDialog } from "@/components/sessions";
import { hasPermission } from "@/lib/permissions";
import { PageTourWrapper } from "@/components/onboarding";
import type { Session } from "@/types/schema";

function SessionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { selectedCohortId } = useCohortContext();
  const { sessions, isLoading: isSessionsLoading, mutate: mutateSessions } = useSessions(
    userContext?.email,
    selectedCohortId
  );

  // Create session dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(
    () => searchParams.get("create") === "true"
  );

  // Check for ?create=true param to auto-open dialog
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      // Remove the query param without navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

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

  // Handle create session - open dialog
  const handleCreateSession = () => {
    setShowCreateDialog(true);
  };

  // Handle session created successfully
  const handleSessionCreated = (session: Session) => {
    mutateSessions();
    router.push(`/sessions/${session.id}`);
  };

  // Wrap content with PageTourWrapper for students
  const content = (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between" data-tour="sessions-header">
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
          <Button onClick={handleCreateSession}>
            <Plus className="mr-2 h-4 w-4" />
            Create Session
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
        // Tour attributes for onboarding
        tourAttributes={{
          controls: "sessions-view-controls",
          list: "sessions-list",
        }}
      />

      {/* Create Session Dialog */}
      <CreateSessionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleSessionCreated}
      />
    </div>
  );

  // Wrap with tour for students
  if (userType === "student") {
    return (
      <PageTourWrapper userType="student" userName={userContext?.firstName}>
        {content}
      </PageTourWrapper>
    );
  }

  return content;
}

function SessionsPageFallback() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<SessionsPageFallback />}>
      <SessionsPageContent />
    </Suspense>
  );
}
