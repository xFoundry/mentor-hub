"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { SessionView } from "@/components/sessions";
import { useLocalSessionViewState } from "@/hooks/use-session-view-state";
import type { TeamTabBaseProps } from "./types";

interface TeamSessionsTabProps extends TeamTabBaseProps {
  /** Handler for feedback action */
  onFeedbackClick?: (sessionId: string) => void;
}

export function TeamSessionsTab({
  team,
  userContext,
  userType,
}: TeamSessionsTabProps) {
  const router = useRouter();
  const sessions = team.mentorshipSessions || [];

  // Local view state for embedded session view
  const {
    viewState,
    setView,
    setFilter,
    setSort,
    setGroupBy,
    setSearch,
  } = useLocalSessionViewState();

  const isStaff = userType === "staff";
  const isMentor = userType === "mentor";

  // Navigation handlers
  const handleSessionClick = useCallback((session: { id: string }) => {
    router.push(`/sessions/${session.id}`);
  }, [router]);

  const handleFeedbackClick = useCallback((sessionId: string) => {
    router.push(`/sessions/${sessionId}?tab=feedback`);
  }, [router]);

  const handleCreateSession = useCallback(() => {
    router.push(`/sessions/new?team=${team.id}`);
  }, [router, team.id]);

  return (
    <SessionView
      sessions={sessions}
      isLoading={false}
      userType={userType}
      userEmail={userContext.email}
      // View state
      view={viewState.view}
      filter={viewState.filter}
      sort={viewState.sort}
      sortDirection={viewState.sortDirection}
      groupBy={viewState.groupBy}
      search={viewState.search}
      // View state handlers
      onViewChange={setView}
      onFilterChange={setFilter}
      onSortChange={setSort}
      onGroupByChange={setGroupBy}
      onSearchChange={setSearch}
      // Configuration
      availableViews={["cards", "table"]}
      variant="embedded"
      showHeader={true}
      showStats={false}
      showFeedbackBanner={true}
      showControls={true}
      showSearch={true}
      showViewSwitcher={true}
      showFilter={true}
      showSort={true}
      showGroupBy={true}
      showCreateButton={isStaff}
      showTeamName={false}
      showMentorName={true}
      showFeedbackStatus={true}
      // Mentors only interact with their own sessions
      restrictInteractionToUserSessions={isMentor}
      // Callbacks
      onSessionClick={handleSessionClick}
      onFeedbackClick={handleFeedbackClick}
      onCreateSession={handleCreateSession}
      // Text
      title="Sessions"
      description="Mentorship sessions for this team"
    />
  );
}
