/**
 * Type Definitions for Airtable Schema via BaseQL
 *
 * Generated from actual BaseQL schema queries.
 * These types match the real Airtable structure as returned by BaseQL GraphQL.
 */

// ====================
// Core Entities
// ====================

export interface Contact {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  headshot?: any[];
  type?: "Student" | "Mentor" | "Staff" | "Faculty" | "External" | "Leadership";
  linkedIn?: string;
  gitHub?: string;
  websiteUrl?: string;
  expertise?: string[];
  profileVisible?: boolean;
  auth0Id?: string;
  // Relationships
  members?: Member[];
  participation?: Participation[];
  mentorshipSessionsMentor?: Session[];
  actionItemsAssignedTo?: Task[];
  sessionFeedback?: SessionFeedback[];
  updates?: Update[];
  created?: string;
  lastModified?: string;
}

export interface Cohort {
  id: string;
  shortName?: string;
  cohortNumber?: number;
  startDate?: string;
  endDate?: string;
  status?: "Closed" | "Applications Open" | "Applications Closed" | "In Progress" | "Complete";
  minimumTeamSize?: number;
  maximumTeamSize?: number;
  requirements?: string;
  skillsDeveloped?: string[];
  // Relationships
  initiative?: any[];
  topics?: any[];
  participation?: Participation[];
  teams?: Team[];
  mentorshipSessions?: Session[];
  created?: string;
  lastModified?: string;
}

export interface Participation {
  id: string;
  participationId?: string;
  capacity?: "Academic Council" | "Ambassador" | "Board of Advisors" | "Board of Directors" |
    "Corporate Partner" | "CXO" | "Horizons Council" | "Innovation Scholar" | "Judge" |
    "Mentor" | "Participant" | "Pioneer Circle" | "Speaker" | "Sponsor" | "Staff";
  status?: "Active" | "Inactive" | "Left" | "Removed" | "Duplicate" | "Pending";
  contactId?: string;
  // Relationships
  cohorts?: Cohort[];
  contacts?: Contact[];
  created?: string;
  lastModified?: string;
}

export interface Team {
  id: string;
  teamId?: string;
  teamName?: string;
  description?: string;
  teamPicture?: any[];
  image?: any[];
  teamStatus?: string;
  joinable?: boolean;
  activeCount?: string;
  inactiveCount?: string;
  countMembers?: string;
  memberEmails?: string;
  // Relationships
  members?: Member[];
  cohorts?: Cohort[];
  mentorshipSessions?: Session[];
  actionItems?: Task[];
  projects?: any[];
  sprints?: any[];
  created?: string;
  lastModified?: string;
}

export interface Member {
  id: string;
  memberId?: string;
  status?: "Active" | "Invited" | "Requested" | "Withdrawn" | "Left Team" | "Inactive" | "Denied";
  type?: "Member" | "Lead";
  contactId?: string;
  memberName?: string[];
  emailFromContact?: string[];
  // Relationships
  contact?: Contact[];
  team?: Team[];
  created?: string;
  lastModified?: string;
}

// ====================
// Mentorship Tables
// ====================

export interface Session {
  id: string;
  sessionId?: string;
  sessionType?: "Office Hours" | "Team Check-in" | "1-on-1" | "Guest Lecture" | "Judging" | "Workshop";
  scheduledStart?: string;
  duration?: number;
  meetingPlatform?: "Zoom" | "Google Meet" | "Teams" | "In-Person" | "Cal.com" | "Daily.co" | "Other";
  meetingUrl?: string;
  recordingUrl?: string;
  granolaNotesUrl?: string;
  summary?: string;
  fullTranscript?: string;
  agenda?: string;
  keyTopics?: string[];
  status?: "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "No-Show";
  // Relationships
  mentor?: Contact[];
  team?: Team[];
  cohort?: Cohort[];
  tasks?: Task[];
  attendance?: any[];
  feedback?: SessionFeedback[];
  created?: string;
  lastModified?: string;
}

export interface SessionFeedback {
  id: string;
  feedbackId?: string;
  role?: "Mentor" | "Mentee";
  rating?: number;
  contentRelevance?: number;
  actionabilityOfAdvice?: number;
  mentorPreparedness?: number;
  menteeEngagement?: number;
  whatWentWell?: string;
  areasForImprovement?: string;
  additionalNeeds?: string;
  requestFollowUp?: boolean;
  suggestedNextSteps?: string;
  privateNotes?: string;
  submitted?: string;
  // Relationships
  session?: Session[];
  respondant?: Contact[]; // Note: Airtable has typo "respondant" instead of "respondent"
}

export interface Task {
  id: string;
  taskId?: string;
  name?: string;
  description?: string;
  priority?: "Urgent" | "High" | "Medium" | "Low";
  status?: "Not Started" | "In Progress" | "Completed" | "Cancelled";
  levelOfEffort?: "XS" | "S" | "M" | "L" | "XL";
  source?: "Session" | "Linear" | "Manual" | "Mission Plan";
  dueDate?: string;
  // Relationships
  assignedTo?: Contact[];
  team?: Team[];
  sprint?: any[];
  project?: any[];
  deliverable?: any[];
  session?: Session[];
  updates?: Update[];
}

export interface Update {
  id: string;
  updateId?: string;
  health?: "On Track" | "At Risk" | "Off Track" | "Completed";
  message?: string;
  created?: string;
  // Relationships
  author?: Contact[];
  project?: any[];
  task?: Task[];
  gate?: any[];
}

// ====================
// Helper Types
// ====================

/**
 * User type derived from Participation.capacity
 */
export type UserType = "student" | "mentor" | "staff";

/**
 * User context with role and permissions
 */
export interface UserContext {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  headshot?: any[];
  type: UserType;
  participationId: string;
  cohortId: string;
  contactId: string;
  cohort?: Cohort;
}

/**
 * Pagination info for list queries
 */
export interface PaginationInfo {
  offset?: string;
  hasMore: boolean;
}

/**
 * List response with pagination
 */
export interface ListResponse<T> {
  records: T[];
  pagination?: PaginationInfo;
}

/**
 * Map Participation capacity to UserType
 */
export function mapCapacityToUserType(capacity?: string): UserType {
  if (capacity === "Participant") return "student";
  if (capacity === "Mentor") return "mentor";
  if (capacity === "Staff") return "staff";
  // Default to student for other capacities
  return "student";
}
