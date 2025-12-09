// Session Detail Components (role-specific)
export {
  SessionDetailStudent,
  SessionDetailMentor,
  SessionDetailStaff,
  SessionDetailHeader,
  SessionPhaseIndicator,
  SessionPhaseBadge,
  SessionCountdown,
  SessionLifecycleProgress,
  SessionOverviewTab,
  SessionPreparationTab,
  SessionFeedbackTab,
  SessionTasksTab,
  SessionNotesTab,
} from "./detail";

// Session View Components
export { SessionView } from "./session-view";
export type { SessionViewProps, SessionViewVariant } from "./session-view";

// Recurring Sessions
export { RecurrenceToggle, RecurrenceConfigComponent } from "./recurrence-config";
export { SeriesIndicator, SeriesInfoCompact } from "./series-indicator";
export { SeriesScopeDialog, useSeriesScopeDialog } from "./series-scope-dialog";

// Session Edit Dialog
export { EditSessionDialog } from "./edit-session-dialog";

// Edit Agenda Dialog
export { EditAgendaDialog } from "./edit-agenda-dialog";

// Create Session Dialog
export { CreateSessionDialog } from "./create-session-dialog";

// Delete Session Dialog
export { DeleteSessionDialog } from "./delete-session-dialog";

// Session Update Confirmation Dialog
export { SessionUpdateConfirmationDialog } from "./session-update-confirmation-dialog";

// Meeting Notes Dialogs
export { AddMeetingNotesDialog } from "./add-meeting-notes-dialog";
export { ViewMeetingNotesDialog } from "./view-meeting-notes-dialog";

// Location Selector
export { LocationSelector } from "./location-selector";

// Pre-Meeting Components
export { PreMeetingWizard } from "./pre-meeting-wizard";
export { PreMeetingCard, PreMeetingSubmissionsList } from "./pre-meeting-card";

export { SessionViewControls } from "./session-view-controls";
export type { SessionViewControlsProps } from "./session-view-controls";

export { SessionFeedbackBanner } from "./session-feedback-banner";
export type { SessionFeedbackBannerProps } from "./session-feedback-banner";

// View implementations
export { SessionTableView } from "./views/session-table-view";
export type { SessionTableViewProps } from "./views/session-table-view";

export { SessionCardView } from "./views/session-card-view";
export type { SessionCardViewProps } from "./views/session-card-view";

// Utilities and transformers
export {
  filterSessions,
  sortSessions,
  groupSessions,
  searchSessions,
  getSessionStats,
  isSessionUpcoming,
  isSessionPast,
  sessionNeedsFeedback,
  formatSessionDate,
  formatSessionTime,
  getGroupColor,
  SESSION_STATUS_CONFIG,
  SESSION_TYPE_CONFIG,
} from "./session-transformers";

export type {
  SessionViewMode,
  SessionFilter,
  SessionSort,
  SessionSortDirection,
  SessionGroupBy,
  SessionStats,
} from "./session-transformers";
