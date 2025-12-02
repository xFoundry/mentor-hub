// Session View Components
export { SessionView } from "./session-view";
export type { SessionViewProps, SessionViewVariant } from "./session-view";

// Session Edit Dialog
export { EditSessionDialog } from "./edit-session-dialog";

// Meeting Notes Dialogs
export { AddMeetingNotesDialog } from "./add-meeting-notes-dialog";
export { ViewMeetingNotesDialog } from "./view-meeting-notes-dialog";

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
