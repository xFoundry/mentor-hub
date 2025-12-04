/**
 * Shared types for team detail tab components
 */

import type { Session, Task, Contact } from "@/types/schema";
import type { UserType } from "@/lib/permissions";
import type { UserContext } from "@/types/schema";

/**
 * Team data structure passed to tabs
 */
export interface TeamDetail {
  id: string;
  teamId?: string;
  teamName: string;
  teamStatus?: string;
  description?: string;
  cohorts?: Array<{ id: string; shortName: string }>;
  members?: TeamMemberData[];
  mentorshipSessions?: Session[];
  actionItems?: Task[];
}

/**
 * Raw member data from API
 */
export interface TeamMemberData {
  id: string;
  status?: string;
  type?: string;
  contact?: Contact[];
}

// Note: For TaskDetailSheet compatibility, use TeamMember from @/hooks/use-team-members

/**
 * Calculated team statistics
 */
export interface TeamStats {
  memberCount: number;
  mentorCount: number;
  sessionCount: number;
  upcomingSessions: number;
  completedSessions: number;
  openTasks: number;
  overdueTasks: number;
  feedbackCount: number;
  needsFeedback: number;
}

/**
 * Base props shared by all team tabs
 */
export interface TeamTabBaseProps {
  team: TeamDetail;
  userContext: UserContext;
  userType: UserType;
}

/**
 * Mentor with session count (derived from sessions)
 */
export interface TeamMentor {
  id: string;
  fullName?: string;
  email?: string;
  headshot?: Array<{ url: string }>;
  sessionCount: number;
}

/**
 * Feedback item with session context
 */
export interface FeedbackWithSession {
  id: string;
  role?: string;
  whatWentWell?: string;
  areasForImprovement?: string;
  additionalNeeds?: string;
  respondant?: Contact[];
  session: {
    id: string;
    sessionType?: string;
    scheduledStart?: string;
  };
}
