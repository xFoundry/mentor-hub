"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session, UserType } from "@/types/schema";
import type {
  SessionViewMode,
  SessionFilter,
  SessionSort,
  SessionSortDirection,
  SessionGroupBy,
} from "./session-transformers";
import { useSessionPermissions } from "@/hooks/use-session-permissions";
import {
  filterSessions,
  sortSessions,
  searchSessions,
  getSessionStats,
} from "./session-transformers";
import { SessionViewControls } from "./session-view-controls";
import { SessionFeedbackBanner } from "./session-feedback-banner";
import { SessionTableView } from "./views/session-table-view";
import { SessionCardView } from "./views/session-card-view";

export type SessionViewVariant = "full" | "compact" | "embedded";

/** Tour attribute identifiers for onboarding */
export interface SessionViewTourAttributes {
  /** Attribute for the header section */
  header?: string;
  /** Attribute for the controls section */
  controls?: string;
  /** Attribute for the session list/grid section */
  list?: string;
}

export interface SessionViewProps {
  // Data
  sessions: Session[];
  isLoading?: boolean;

  // User context
  userType: UserType;
  userEmail: string;

  // View state
  view: SessionViewMode;
  filter: SessionFilter;
  sort: SessionSort;
  sortDirection: SessionSortDirection;
  groupBy: SessionGroupBy;
  search?: string;

  // View state handlers
  onViewChange: (view: SessionViewMode) => void;
  onFilterChange: (filter: SessionFilter) => void;
  onSortChange: (sort: SessionSort, direction?: SessionSortDirection) => void;
  onGroupByChange: (groupBy: SessionGroupBy) => void;
  onSearchChange?: (search: string) => void;

  // View configuration
  availableViews?: SessionViewMode[];
  variant?: SessionViewVariant;

  // Feature flags
  showHeader?: boolean;
  showStats?: boolean;
  showFeedbackBanner?: boolean;
  showControls?: boolean;
  showSearch?: boolean;
  showViewSwitcher?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
  showGroupBy?: boolean;
  showCreateButton?: boolean;
  showTeamName?: boolean;
  showMentorName?: boolean;
  showFeedbackStatus?: boolean;
  /** When true, only sessions where userEmail matches the mentor are interactive */
  restrictInteractionToUserSessions?: boolean;

  // Limits
  maxItems?: number;

  // Callbacks
  onSessionClick?: (session: Session) => void;
  onFeedbackClick?: (sessionId: string) => void;
  onCreateSession?: () => void;

  // Styling
  title?: string;
  description?: string;
  className?: string;

  // Tour/onboarding
  /** Data-tour attributes for onboarding tour steps */
  tourAttributes?: SessionViewTourAttributes;
}

export function SessionView({
  sessions,
  isLoading = false,
  userType,
  userEmail,
  view,
  filter,
  sort,
  sortDirection,
  groupBy,
  search = "",
  onViewChange,
  onFilterChange,
  onSortChange,
  onGroupByChange,
  onSearchChange,
  availableViews = ["cards", "table"],
  variant = "full",
  showHeader = true,
  showStats = false,
  showFeedbackBanner = true,
  showControls = true,
  showSearch = true,
  showViewSwitcher = true,
  showFilter = true,
  showSort = true,
  showGroupBy = true,
  showCreateButton = false,
  showTeamName = false,
  showMentorName = false,
  showFeedbackStatus = true,
  restrictInteractionToUserSessions = false,
  maxItems,
  onSessionClick,
  onFeedbackClick,
  onCreateSession,
  title = "Sessions",
  description,
  className,
  tourAttributes,
}: SessionViewProps) {
  const { allowedGroupings, canCreate, showFeedbackStatus: shouldShowFeedback } = useSessionPermissions(userType, userEmail);

  // Process sessions: search, filter, sort, limit
  const processedSessions = useMemo(() => {
    let result = searchSessions(sessions, search);
    result = filterSessions(result, filter, userType, userEmail);
    result = sortSessions(result, sort, sortDirection);
    if (maxItems && maxItems > 0) {
      result = result.slice(0, maxItems);
    }
    return result;
  }, [sessions, search, filter, sort, sortDirection, maxItems, userType, userEmail]);

  // Calculate stats from unfiltered sessions
  const stats = useMemo(() => getSessionStats(sessions, userType, userEmail), [sessions, userType, userEmail]);

  // Determine if we should show the create button
  const shouldShowCreate = showCreateButton && canCreate;

  // Determine if we should show the feedback banner
  const shouldShowFeedbackBanner = showFeedbackBanner && stats.needsFeedback > 0 && (userType === "mentor" || userType === "staff");

  // Variant checks
  const isCompact = variant === "compact";
  const isEmbedded = variant === "embedded";

  if (isLoading) {
    return <SessionViewSkeleton variant={variant} />;
  }

  // Handle search change with noop fallback
  const handleSearchChange = onSearchChange ?? (() => {});

  // Handle filter to "needs feedback"
  const handleShowFeedbackSessions = () => {
    onFilterChange("needsFeedback");
  };

  // Handle clearing the feedback filter
  const handleClearFeedbackFilter = () => {
    onFilterChange("all");
  };

  // Check if the "needsFeedback" filter is currently active
  const isFeedbackFilterActive = filter === "needsFeedback";

  // Render the appropriate view
  const renderView = () => {
    const commonProps = {
      sessions: processedSessions,
      userType,
      userEmail,
      isLoading,
      onSessionClick,
      onFeedbackClick,
      showTeamName: showTeamName || userType === "mentor" || userType === "staff",
      showMentorName: showMentorName || userType === "student",
      showFeedbackStatus: showFeedbackStatus && shouldShowFeedback,
      restrictInteractionToUserSessions,
    };

    switch (view) {
      case "table":
        return <SessionTableView {...commonProps} />;
      case "cards":
        return <SessionCardView {...commonProps} groupBy={groupBy} />;
      default:
        return <SessionTableView {...commonProps} />;
    }
  };

  // Empty state
  if (sessions.length === 0 && !isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {showHeader && (
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && (
              <p className="text-muted-foreground text-sm">{description}</p>
            )}
          </div>
        )}
        <SessionViewEmpty onCreateSession={shouldShowCreate ? onCreateSession : undefined} />
      </div>
    );
  }

  // Full variant with all features
  if (variant === "full") {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        {showHeader && (
          <div
            className="flex items-center justify-between"
            data-tour={tourAttributes?.header}
          >
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Total" value={stats.total} />
            <StatCard title="Upcoming" value={stats.upcoming} />
            <StatCard title="Completed" value={stats.completed} />
            <StatCard
              title="Needs Feedback"
              value={stats.needsFeedback}
              variant={stats.needsFeedback > 0 ? "warning" : "default"}
            />
          </div>
        )}

        {/* Feedback Banner */}
        {(shouldShowFeedbackBanner || isFeedbackFilterActive) && (
          <SessionFeedbackBanner
            count={isFeedbackFilterActive ? processedSessions.length : stats.needsFeedback}
            isFilterActive={isFeedbackFilterActive}
            onShowFeedbackSessions={handleShowFeedbackSessions}
            onClearFilter={handleClearFeedbackFilter}
          />
        )}

        {/* Controls */}
        {showControls && (
          <SessionViewControls
            view={view}
            filter={filter}
            sort={sort}
            sortDirection={sortDirection}
            groupBy={groupBy}
            search={search}
            availableViews={availableViews}
            allowedGroupings={allowedGroupings}
            onViewChange={onViewChange}
            onFilterChange={onFilterChange}
            onSortChange={onSortChange}
            onGroupByChange={onGroupByChange}
            onSearchChange={handleSearchChange}
            showViewSwitcher={showViewSwitcher}
            showSearch={showSearch}
            showFilter={showFilter}
            showSort={showSort}
            showGroupBy={showGroupBy && view === "cards"}
            showCreateButton={shouldShowCreate}
            onCreateSession={onCreateSession}
            tourAttrControls={tourAttributes?.controls}
          />
        )}

        {/* View */}
        <div data-tour={tourAttributes?.list}>
          {renderView()}
        </div>
      </div>
    );
  }

  // Compact variant (for dashboard widgets)
  if (variant === "compact") {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            {showControls && availableViews.length > 1 && (
              <SessionViewControls
                view={view}
                filter={filter}
                sort={sort}
                sortDirection={sortDirection}
                groupBy={groupBy}
                search={search}
                availableViews={availableViews}
                allowedGroupings={allowedGroupings}
                onViewChange={onViewChange}
                onFilterChange={onFilterChange}
                onSortChange={onSortChange}
                onGroupByChange={onGroupByChange}
                onSearchChange={handleSearchChange}
                showViewSwitcher={showViewSwitcher}
                showSearch={false}
                showFilter={false}
                showSort={false}
                showGroupBy={false}
                showCreateButton={false}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>{renderView()}</CardContent>
      </Card>
    );
  }

  // Embedded variant (no card wrapper)
  return (
    <div className={cn("space-y-4", className)}>
      {/* Feedback Banner (even in embedded) */}
      {(shouldShowFeedbackBanner || isFeedbackFilterActive) && (
        <SessionFeedbackBanner
          count={isFeedbackFilterActive ? processedSessions.length : stats.needsFeedback}
          isFilterActive={isFeedbackFilterActive}
          onShowFeedbackSessions={handleShowFeedbackSessions}
          onClearFilter={handleClearFeedbackFilter}
        />
      )}

      {showControls && (
        <SessionViewControls
          view={view}
          filter={filter}
          sort={sort}
          sortDirection={sortDirection}
          groupBy={groupBy}
          search={search}
          availableViews={availableViews}
          allowedGroupings={allowedGroupings}
          onViewChange={onViewChange}
          onFilterChange={onFilterChange}
          onSortChange={onSortChange}
          onGroupByChange={onGroupByChange}
          onSearchChange={handleSearchChange}
          showViewSwitcher={showViewSwitcher}
          showSearch={showSearch}
          showFilter={showFilter}
          showSort={showSort}
          showGroupBy={showGroupBy && view === "cards"}
          showCreateButton={shouldShowCreate}
          onCreateSession={onCreateSession}
        />
      )}
      {renderView()}
    </div>
  );
}

function SessionViewSkeleton({ variant }: { variant: SessionViewVariant }) {
  if (variant === "compact") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

function SessionViewEmpty({ onCreateSession }: { onCreateSession?: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No sessions found</p>
        <p className="text-sm text-muted-foreground mb-4">
          {onCreateSession ? "Schedule a session to get started" : "No sessions to display"}
        </p>
        {onCreateSession && (
          <button
            onClick={onCreateSession}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Schedule Session
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  variant = "default",
}: {
  title: string;
  value: number;
  variant?: "default" | "warning" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className={cn(
          "text-2xl font-bold",
          variant === "warning" && value > 0 && "text-yellow-600 dark:text-yellow-500",
          variant === "destructive" && value > 0 && "text-destructive"
        )}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
