/**
 * BaseQL Client Configuration
 *
 * This file sets up the BaseQL GraphQL client for querying Airtable.
 * BaseQL provides a GraphQL interface to Airtable data.
 */

import type {
  Participation,
  Session,
  Task,
  Update,
  SessionFeedback,
  Member,
  Contact,
  Team,
} from "@/types/schema";

/**
 * BaseQL Query Helper
 *
 * Routes requests through /api/graphql on client-side to keep API key server-side.
 * On server-side, calls BaseQL directly.
 */
class BaseQLClient {
  private isServer: boolean;

  constructor() {
    this.isServer = typeof window === "undefined";
  }

  /**
   * Get the appropriate endpoint and headers based on environment
   */
  private getConfig(): { url: string; headers: Record<string, string> } {
    if (this.isServer) {
      // Server-side: call BaseQL directly with server env vars
      const apiUrl = process.env.BASEQL_API_URL || "";
      const apiKey = process.env.BASEQL_API_KEY || "";

      if (!apiUrl || !apiKey) {
        throw new Error(
          "BaseQL not configured. Set BASEQL_API_URL and BASEQL_API_KEY."
        );
      }

      return {
        url: apiUrl,
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
      };
    } else {
      // Client-side: route through proxy (API key stays server-side)
      return {
        url: "/api/graphql",
        headers: {
          "Content-Type": "application/json",
        },
      };
    }
  }

  /**
   * Execute a GraphQL query against BaseQL
   */
  async query<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    try {
      const config = this.getConfig();

      const response = await fetch(config.url, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BaseQL] HTTP ${response.status}: ${errorText}`);
        throw new Error(`BaseQL query failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error("[BaseQL] GraphQL errors:", result.errors);
        throw new Error(result.errors[0]?.message || "GraphQL query error");
      }

      return result.data as T;
    } catch (error) {
      console.error("[BaseQL] Query error:", error);
      throw error;
    }
  }

  /**
   * Execute a GraphQL mutation against BaseQL
   */
  async mutate<T = any>(mutation: string, variables?: Record<string, any>): Promise<T> {
    // Mutations use the same endpoint as queries in GraphQL
    return this.query<T>(mutation, variables);
  }
}

// Export singleton instance
export const baseqlClient = new BaseQLClient();

/**
 * Execute a BaseQL GraphQL query
 */
export async function executeQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  return baseqlClient.query<T>(query, variables);
}

/**
 * Execute a BaseQL GraphQL mutation
 */
export async function executeMutation<T = any>(
  mutation: string,
  variables?: Record<string, any>
): Promise<T> {
  return baseqlClient.mutate<T>(mutation, variables);
}

// ====================
// Common Query Helpers
// ====================

/**
 * Get user's contact and participation records by email
 */
export async function getUserParticipation(
  email: string
): Promise<{ participation: Participation[]; contact?: Contact }> {
  const query = `
    query GetUserParticipation($email: String!) {
      contacts(
        _filter: {
          email: {_eq: $email}
        }
      ) {
        id
        fullName
        firstName
        lastName
        email
        headshot
        participation {
          id
          participationId
          capacity
          status
          cohorts {
            id
            shortName
            startDate
            endDate
            status
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ contacts: any[] }>(query, { email });

  // Extract contact and participation records
  const contact = result.contacts?.[0];
  const participation = contact?.participation || [];

  // Attach contact info to each participation record
  const enrichedParticipation = participation.map((p: Participation) => ({
    ...p,
    contacts: result.contacts || [],
  }));

  return {
    participation: enrichedParticipation,
    contact,
  };
}

/**
 * Get all mentors (across all cohorts)
 */
export async function getAllMentors(): Promise<{ participation: Participation[] }> {
  const query = `
    query GetAllMentors {
      participation(
        capacity: "Mentor"
        status: "Active"
      ) {
        id
        contacts {
          id
          fullName
          email
          bio
          linkedIn
          expertise
          headshot
        }
        cohorts {
          id
          shortName
          topics {
            id
            name
          }
          initiative {
            id
            name
          }
        }
      }
    }
  `;

  return executeQuery(query);
}

/**
 * Get mentors in a specific cohort
 * Query from cohort side since nested filter on participation doesn't work properly in BaseQL
 */
export async function getMentorsInCohort(
  cohortId: string
): Promise<{ participation: Participation[] }> {
  const query = `
    query GetMentorsInCohort($cohortId: String!) {
      cohorts(
        _filter: { id: {_eq: $cohortId} }
      ) {
        id
        shortName
        topics {
          id
          name
        }
        initiative {
          id
          name
        }
        participation(
          _filter: {
            capacity: {_eq: "Mentor"}
            status: {_eq: "Active"}
          }
        ) {
          id
          contacts {
            id
            fullName
            email
            bio
            linkedIn
            expertise
            headshot
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ cohorts: any[] }>(query, { cohortId });

  // Transform to match expected format - attach cohort info to each participation
  const cohort = result.cohorts?.[0];
  if (!cohort) {
    return { participation: [] };
  }

  const participation = (cohort.participation || []).map((p: any) => ({
    ...p,
    cohorts: [{
      id: cohort.id,
      shortName: cohort.shortName,
      topics: cohort.topics,
      initiative: cohort.initiative,
    }],
  }));

  return { participation };
}

/**
 * Get all teams (for staff users)
 */
export async function getAllTeams(): Promise<{ teams: any[] }> {
  const query = `
    query GetAllTeams {
      teams(
        _order_by: { teamName: "asc" }
      ) {
        id
        teamId
        teamName
        teamStatus
        description
        teamPicture
        cohorts {
          id
          shortName
        }
        members(
          _filter: {
            status: {_eq: "Active"}
          }
        ) {
          id
          status
          contact {
            id
            fullName
            email
            headshot
          }
        }
        mentorshipSessions {
          id
          sessionId
          status
        }
        actionItems {
          id
          taskId
          status
        }
      }
    }
  `;

  const result = await executeQuery<{ teams: any[] }>(query);
  return { teams: result.teams || [] };
}

/**
 * Get teams in a specific cohort
 */
export async function getTeamsInCohort(cohortId: string): Promise<{ teams: any[] }> {
  // Query from cohort side to get teams (nested filter on teams doesn't work properly)
  const query = `
    query GetTeamsInCohort($cohortId: String!) {
      cohorts(
        _filter: { id: {_eq: $cohortId} }
      ) {
        id
        shortName
        teams(
          _order_by: { teamName: "asc" }
        ) {
          id
          teamId
          teamName
          teamStatus
          description
          teamPicture
          cohorts {
            id
            shortName
          }
          members(
            _filter: {
              status: {_eq: "Active"}
            }
          ) {
            id
            status
            contact {
              id
              fullName
              email
              headshot
            }
          }
          mentorshipSessions {
            id
            sessionId
            status
          }
          actionItems {
            id
            taskId
            status
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ cohorts: any[] }>(query, { cohortId });

  // Extract teams from the cohort result
  const teams = result.cohorts?.[0]?.teams || [];

  return { teams };
}

/**
 * Get team detail by ID
 */
export async function getTeamDetail(teamId: string): Promise<{ teams: any[] }> {
  const query = `
    query GetTeamDetail($teamId: String!) {
      teams(
        _filter: {
          id: {_eq: $teamId}
        }
      ) {
        id
        teamId
        teamName
        teamStatus
        description
        teamPicture
        created
        cohorts {
          id
          shortName
        }
        members(
          _filter: {
            status: {_eq: "Active"}
          }
        ) {
          id
          status
          contact {
            id
            fullName
            email
            headshot
            bio
            linkedIn
          }
        }
        mentorshipSessions(
          _order_by: { scheduledStart: "desc" }
        ) {
          id
          sessionId
          sessionType
          scheduledStart
          duration
          status
          meetingPlatform
          meetingUrl
          recordingUrl
          granolaNotesUrl
          summary
          fullTranscript
          agenda
          keyTopics
          mentor {
            id
            fullName
            email
            headshot
            bio
            linkedIn
          }
          tasks {
            id
            taskId
            name
            description
            status
            priority
            levelOfEffort
            dueDate
            assignedTo {
              id
              fullName
              email
            }
          }
          feedback {
            id
            role
            whatWentWell
            areasForImprovement
            additionalNeeds
            suggestedNextSteps
            rating
            actionabilityOfAdvice
            contentRelevance
            mentorPreparedness
            respondant {
              id
              fullName
              email
              headshot
            }
          }
        }
        actionItems(
          _order_by: { dueDate: "asc" }
        ) {
          id
          taskId
          name
          description
          status
          priority
          levelOfEffort
          dueDate
          assignedTo {
            id
            fullName
            email
          }
          session {
            id
            sessionId
            sessionType
            scheduledStart
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ teams: any[] }>(query, { teamId });
  return { teams: result.teams || [] };
}

/**
 * Get all sessions (for staff users)
 */
export async function getAllSessions(): Promise<{ sessions: Session[] }> {
  const query = `
    query GetAllSessions {
      sessions(
        _order_by: { scheduledStart: "desc" }
      ) {
        id
        sessionId
        sessionType
        scheduledStart
        duration
        status
        meetingPlatform
        meetingUrl
        recordingUrl
        granolaNotesUrl
        summary
        fullTranscript
        agenda
        keyTopics
        mentor {
          id
          fullName
          email
          headshot
        }
        team {
          id
          teamName
          cohorts {
            id
            shortName
          }
          members(
            _filter: {
              status: {_eq: "Active"}
            }
          ) {
            id
            contact {
              id
              fullName
              email
              headshot
            }
          }
        }
        tasks {
          id
          taskId
          name
          description
          status
          priority
          dueDate
          assignedTo {
            id
            fullName
          }
        }
        feedback {
          id
          role
          whatWentWell
          areasForImprovement
          additionalNeeds
          suggestedNextSteps
          rating
          actionabilityOfAdvice
          contentRelevance
          mentorPreparedness
          respondant {
            id
            fullName
            email
            headshot
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ sessions: any[] }>(query);

  // Transform sessions to add students from team members
  const sessions = result.sessions.map((session: any) => {
    const students = session.team?.[0]?.members
      ?.map((member: any) => member.contact?.[0])
      .filter(Boolean) || [];

    return {
      ...session,
      students,
      actionItems: session.tasks,
      sessionFeedback: session.feedback,
    };
  });

  return { sessions };
}

/**
 * Get sessions for a user (works for both students and mentors)
 */
export async function getStudentSessions(
  email: string
): Promise<{ members: Member[]; mentorSessions?: Session[] }> {
  const query = `
    query GetUserSessions($email: String!) {
      contacts(
        _filter: {
          email: {_eq: $email}
        }
      ) {
        id
        fullName
        email
        members(
          _filter: {
            status: {_eq: "Active"}
          }
        ) {
          id
          status
          team {
            id
            teamName
            cohorts {
              id
              shortName
            }
            mentorshipSessions {
              id
              sessionId
              sessionType
              scheduledStart
              duration
              status
              meetingPlatform
              meetingUrl
              recordingUrl
              granolaNotesUrl
              summary
              fullTranscript
              agenda
              keyTopics
              mentor {
                id
                fullName
                email
                headshot
              }
              team {
                id
                teamName
                cohorts {
                  id
                  shortName
                }
                members(
                  _filter: {
                    status: {_eq: "Active"}
                  }
                ) {
                  id
                  contact {
                    id
                    fullName
                    email
                    headshot
                  }
                }
              }
              tasks {
                id
                taskId
                name
                description
                status
                priority
                dueDate
                assignedTo {
                  id
                  fullName
                }
              }
              feedback {
                id
                role
                whatWentWell
                areasForImprovement
                additionalNeeds
                suggestedNextSteps
                rating
                actionabilityOfAdvice
                contentRelevance
                mentorPreparedness
                respondant {
                  id
                  fullName
                  email
                  headshot
                }
              }
            }
          }
        }
        mentorshipSessionsMentor {
          id
          sessionId
          sessionType
          scheduledStart
          duration
          status
          meetingPlatform
          meetingUrl
          recordingUrl
          granolaNotesUrl
          summary
          fullTranscript
          agenda
          keyTopics
          team {
            id
            teamName
            cohorts {
              id
              shortName
            }
            members(
              _filter: {
                status: {_eq: "Active"}
              }
            ) {
              id
              contact {
                id
                fullName
                email
                headshot
              }
            }
          }
          tasks {
            id
            taskId
            name
            description
            status
            priority
            dueDate
            assignedTo {
              id
              fullName
            }
          }
          feedback {
            id
            role
            whatWentWell
            areasForImprovement
            additionalNeeds
            suggestedNextSteps
            rating
            actionabilityOfAdvice
            contentRelevance
            mentorPreparedness
            respondant {
              id
              fullName
              email
              headshot
            }
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ contacts: any[] }>(query, { email });

  // Extract members and mentor sessions from the contact
  const members = result.contacts?.[0]?.members || [];
  const mentorSessions = result.contacts?.[0]?.mentorshipSessionsMentor || [];

  // Transform mentor sessions to add students from team members
  const transformedMentorSessions = mentorSessions.map((session: any) => {
    const students = session.team?.[0]?.members
      ?.map((member: any) => member.contact?.[0])
      .filter(Boolean) || [];

    return {
      ...session,
      students,
      actionItems: session.tasks,
      sessionFeedback: session.feedback,
    };
  });

  return { members, mentorSessions: transformedMentorSessions };
}

/**
 * Get session detail by ID
 */
export async function getSessionDetail(
  sessionId: string
): Promise<{ sessions: Session[] }> {
  const query = `
    query GetSessionDetail($sessionId: String!) {
      sessions(
        _filter: {
          id: {_eq: $sessionId}
        }
      ) {
        id
        sessionId
        sessionType
        scheduledStart
        duration
        status
        meetingPlatform
        meetingUrl
        recordingUrl
        granolaNotesUrl
        summary
        fullTranscript
        agenda
        keyTopics
        mentor {
          id
          fullName
          email
          headshot
        }
        team {
          id
          teamName
          members(
            _filter: {
              status: {_eq: "Active"}
            }
          ) {
            id
            contact {
              id
              fullName
              email
              headshot
            }
          }
        }
        cohort {
          id
          shortName
        }
        tasks {
          id
          taskId
          name
          description
          status
          priority
          levelOfEffort
          dueDate
          assignedTo {
            id
            fullName
          }
        }
        feedback {
          id
          role
          whatWentWell
          areasForImprovement
          additionalNeeds
          suggestedNextSteps
          rating
          actionabilityOfAdvice
          contentRelevance
          mentorPreparedness
          respondant {
            id
            fullName
            email
            headshot
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ sessions: any[] }>(query, { sessionId });

  // Transform sessions to add students from team members
  const sessions = result.sessions.map((session: any) => {
    // Extract students from team members
    const students = session.team?.[0]?.members
      ?.map((member: any) => member.contact?.[0])
      .filter(Boolean) || [];

    return {
      ...session,
      students, // Add virtual students field
      actionItems: session.tasks, // Alias for backward compatibility
      sessionFeedback: session.feedback, // Alias for backward compatibility
    };
  });

  return { sessions };
}

/**
 * Get all tasks (for staff users)
 */
export async function getAllTasks(): Promise<{ tasks: Task[] }> {
  const query = `
    query GetAllTasks {
      tasks(
        _order_by: { dueDate: "asc" }
      ) {
        id
        taskId
        name
        description
        status
        priority
        levelOfEffort
        dueDate
        assignedTo {
          id
          fullName
          email
        }
        session {
          id
          sessionId
          sessionType
          scheduledStart
        }
        team {
          id
          teamName
          cohorts {
            id
            shortName
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ tasks: Task[] }>(query);
  return { tasks: result.tasks || [] };
}

/**
 * Get tasks assigned to a user
 */
export async function getUserTasks(
  email: string
): Promise<{ tasks: Task[] }> {
  const query = `
    query GetUserTasks($email: String!) {
      contacts(
        _filter: {
          email: {_eq: $email}
        }
      ) {
        id
        fullName
        email
        actionItemsAssignedTo {
          id
          taskId
          name
          description
          status
          priority
          levelOfEffort
          dueDate
          assignedTo {
            id
            fullName
            email
          }
          session {
            id
            sessionId
            sessionType
            scheduledStart
          }
          team {
            id
            teamName
            cohorts {
              id
              shortName
            }
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ contacts: any[] }>(query, { email });

  // Extract tasks from the contact
  const tasks = result.contacts?.[0]?.actionItemsAssignedTo || [];

  return { tasks };
}

/**
 * Get all tasks for a student's team (not just assigned to them)
 */
export async function getStudentTeamTasks(
  email: string
): Promise<{ tasks: Task[] }> {
  const query = `
    query GetStudentTeamTasks($email: String!) {
      contacts(
        _filter: {
          email: {_eq: $email}
        }
      ) {
        id
        members(
          _filter: { status: {_eq: "Active"} }
        ) {
          id
          team {
            id
            teamName
            actionItems {
              id
              taskId
              name
              description
              status
              priority
              levelOfEffort
              dueDate
              assignedTo {
                id
                fullName
                email
              }
              session {
                id
                sessionId
                sessionType
                scheduledStart
                mentor {
                  id
                  fullName
                  email
                }
              }
              team {
                id
                teamName
                cohorts {
                  id
                  shortName
                }
              }
              updates(
                _order_by: { created: "desc" }
              ) {
                id
                health
                message
                created
                author {
                  id
                  fullName
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ contacts: any[] }>(query, { email });

  // Extract tasks from the user's team
  const team = result.contacts?.[0]?.members?.[0]?.team?.[0];
  const tasks = team?.actionItems || [];

  return { tasks };
}

/**
 * Create a new task (action item)
 */
export async function createTask(input: {
  name: string;
  description?: string;
  assignedToId: string;
  teamId?: string;
  sessionId?: string;
  priority?: string;
  levelOfEffort?: string;
  dueDate?: string;
  status?: string;
}): Promise<{ insert_tasks: Task }> {
  const mutation = `
    mutation CreateTask(
      $name: String!
      $description: String
      $assignedTo: [String!]!
      $team: [String!]
      $session: [String!]
      $priority: String
      $levelOfEffort: String
      $dueDate: String
      $status: String
    ) {
      insert_tasks(
        name: $name
        description: $description
        assignedTo: $assignedTo
        team: $team
        session: $session
        priority: $priority
        levelOfEffort: $levelOfEffort
        dueDate: $dueDate
        status: $status
      ) {
        id
        taskId
        name
        description
        status
        priority
        levelOfEffort
        dueDate
      }
    }
  `;

  return executeMutation(mutation, {
    name: input.name,
    description: input.description,
    assignedTo: [input.assignedToId],
    team: input.teamId ? [input.teamId] : undefined,
    session: input.sessionId ? [input.sessionId] : undefined,
    priority: input.priority,
    levelOfEffort: input.levelOfEffort,
    dueDate: input.dueDate,
    status: input.status,
  });
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<{ update_tasks: Task }> {
  const mutation = `
    mutation UpdateTask($id: String!, $status: String, $priority: String, $levelOfEffort: String, $dueDate: String, $name: String, $description: String, $assignedTo: [String!]) {
      update_tasks(
        id: $id
        status: $status
        priority: $priority
        levelOfEffort: $levelOfEffort
        dueDate: $dueDate
        name: $name
        description: $description
        assignedTo: $assignedTo
      ) {
        id
        taskId
        name
        description
        status
        priority
        levelOfEffort
        dueDate
        assignedTo {
          id
          fullName
          email
        }
      }
    }
  `;

  // Flatten the updates into individual variables for BaseQL
  const variables: Record<string, any> = { id: taskId };
  if (updates.status !== undefined) variables.status = updates.status;
  if (updates.priority !== undefined) variables.priority = updates.priority;
  if (updates.levelOfEffort !== undefined) variables.levelOfEffort = updates.levelOfEffort;
  if (updates.dueDate !== undefined) variables.dueDate = updates.dueDate;
  if (updates.name !== undefined) variables.name = updates.name;
  if (updates.description !== undefined) variables.description = updates.description;
  if (updates.assignedTo !== undefined) variables.assignedTo = updates.assignedTo;

  return executeMutation(mutation, variables);
}

/**
 * Create session feedback (supports role-specific fields)
 */
export async function createSessionFeedback(input: {
  session: string[];
  respondant?: string[]; // Contact ID of submitter
  role?: "Mentor" | "Mentee";
  // Common fields
  whatWentWell?: string;
  areasForImprovement?: string;
  additionalNeeds?: string;
  // Mentor-specific fields
  menteeEngagement?: number;
  suggestedNextSteps?: string;
  privateNotes?: string;
  // Student-specific fields
  rating?: number;
  contentRelevance?: number;
  actionabilityOfAdvice?: number;
  mentorPreparedness?: number;
  requestFollowUp?: boolean;
}): Promise<{ insert_sessionFeedback: SessionFeedback }> {
  const mutation = `
    mutation CreateSessionFeedback(
      $session: [String!]!
      $respondant: [String!]
      $role: String
      $whatWentWell: String
      $areasForImprovement: String
      $additionalNeeds: String
      $menteeEngagement: Float
      $suggestedNextSteps: String
      $privateNotes: String
      $rating: Float
      $contentRelevance: Float
      $actionabilityOfAdvice: Float
      $mentorPreparedness: Float
      $requestFollowUp: Boolean
    ) {
      insert_sessionFeedback(
        session: $session
        respondant: $respondant
        role: $role
        whatWentWell: $whatWentWell
        areasForImprovement: $areasForImprovement
        additionalNeeds: $additionalNeeds
        menteeEngagement: $menteeEngagement
        suggestedNextSteps: $suggestedNextSteps
        privateNotes: $privateNotes
        rating: $rating
        contentRelevance: $contentRelevance
        actionabilityOfAdvice: $actionabilityOfAdvice
        mentorPreparedness: $mentorPreparedness
        requestFollowUp: $requestFollowUp
      ) {
        id
        feedbackId
        role
        rating
        contentRelevance
        actionabilityOfAdvice
        mentorPreparedness
        menteeEngagement
        whatWentWell
        areasForImprovement
        additionalNeeds
        requestFollowUp
        suggestedNextSteps
        privateNotes
        submitted
      }
    }
  `;

  return executeMutation(mutation, input);
}

/**
 * Update existing session feedback
 */
export async function updateSessionFeedback(input: {
  id: string;
  // Common fields
  whatWentWell?: string;
  areasForImprovement?: string;
  additionalNeeds?: string;
  // Mentor-specific fields
  menteeEngagement?: number;
  suggestedNextSteps?: string;
  privateNotes?: string;
  // Student-specific fields
  rating?: number;
  contentRelevance?: number;
  actionabilityOfAdvice?: number;
  mentorPreparedness?: number;
  requestFollowUp?: boolean;
}): Promise<{ update_sessionFeedback: SessionFeedback }> {
  const mutation = `
    mutation UpdateSessionFeedback(
      $id: String!
      $whatWentWell: String
      $areasForImprovement: String
      $additionalNeeds: String
      $menteeEngagement: Float
      $suggestedNextSteps: String
      $privateNotes: String
      $rating: Float
      $contentRelevance: Float
      $actionabilityOfAdvice: Float
      $mentorPreparedness: Float
      $requestFollowUp: Boolean
    ) {
      update_sessionFeedback(
        id: $id
        whatWentWell: $whatWentWell
        areasForImprovement: $areasForImprovement
        additionalNeeds: $additionalNeeds
        menteeEngagement: $menteeEngagement
        suggestedNextSteps: $suggestedNextSteps
        privateNotes: $privateNotes
        rating: $rating
        contentRelevance: $contentRelevance
        actionabilityOfAdvice: $actionabilityOfAdvice
        mentorPreparedness: $mentorPreparedness
        requestFollowUp: $requestFollowUp
      ) {
        id
        feedbackId
        role
        rating
        contentRelevance
        actionabilityOfAdvice
        mentorPreparedness
        menteeEngagement
        whatWentWell
        areasForImprovement
        additionalNeeds
        requestFollowUp
        suggestedNextSteps
        privateNotes
        submitted
      }
    }
  `;

  return executeMutation(mutation, input);
}

/**
 * Create a progress update
 */
export async function createUpdate(input: {
  taskId?: string;
  authorId: string;
  health: string;
  message: string;
}): Promise<{ insert_updates: Update }> {
  const mutation = `
    mutation CreateUpdate(
      $task: [String!]
      $author: [String!]!
      $health: String!
      $message: String!
    ) {
      insert_updates(
        task: $task
        author: $author
        health: $health
        message: $message
      ) {
        id
        updateId
        health
        message
        created
      }
    }
  `;

  return executeMutation(mutation, {
    task: input.taskId ? [input.taskId] : undefined,
    author: [input.authorId],
    health: input.health,
    message: input.message,
  });
}

/**
 * Create a new session (staff only)
 */
export async function createSession(input: {
  sessionType: string;
  scheduledStart: string;
  duration?: number;
  mentorId: string;
  teamId: string;
  cohortId?: string;
  meetingPlatform?: string;
  meetingUrl?: string;
  agenda?: string;
  status?: string;
}): Promise<{ insert_sessions: Session }> {
  const mutation = `
    mutation CreateSession(
      $sessionType: String!
      $scheduledStart: String!
      $duration: Float
      $mentor: [String!]!
      $team: [String!]!
      $cohort: [String!]
      $meetingPlatform: String
      $meetingUrl: String
      $agenda: String
      $status: String
    ) {
      insert_sessions(
        sessionType: $sessionType
        scheduledStart: $scheduledStart
        duration: $duration
        mentor: $mentor
        team: $team
        cohort: $cohort
        meetingPlatform: $meetingPlatform
        meetingUrl: $meetingUrl
        agenda: $agenda
        status: $status
      ) {
        id
        sessionId
        sessionType
        scheduledStart
        duration
        status
        meetingUrl
        mentor {
          id
          fullName
        }
        team {
          id
          teamName
        }
      }
    }
  `;

  // BaseQL expects linked records as arrays of IDs
  const variables = {
    sessionType: input.sessionType,
    scheduledStart: input.scheduledStart,
    duration: input.duration,
    mentor: [input.mentorId],
    team: [input.teamId],
    cohort: input.cohortId ? [input.cohortId] : undefined,
    meetingPlatform: input.meetingPlatform,
    meetingUrl: input.meetingUrl,
    agenda: input.agenda,
    status: input.status || "Scheduled",
  };

  return executeMutation(mutation, variables);
}

/**
 * Update a session (staff only)
 */
export async function updateSession(
  sessionId: string,
  updates: {
    sessionType?: string;
    scheduledStart?: string;
    duration?: number;
    status?: string;
    meetingPlatform?: string;
    meetingUrl?: string;
    agenda?: string;
    granolaNotesUrl?: string;
    summary?: string;
    fullTranscript?: string;
  }
): Promise<{ update_sessions: Session }> {
  const mutation = `
    mutation UpdateSession(
      $id: String!
      $sessionType: String
      $scheduledStart: String
      $duration: Float
      $status: String
      $meetingPlatform: String
      $meetingUrl: String
      $agenda: String
      $granolaNotesUrl: String
      $summary: String
      $fullTranscript: String
    ) {
      update_sessions(
        id: $id
        sessionType: $sessionType
        scheduledStart: $scheduledStart
        duration: $duration
        status: $status
        meetingPlatform: $meetingPlatform
        meetingUrl: $meetingUrl
        agenda: $agenda
        granolaNotesUrl: $granolaNotesUrl
        summary: $summary
        fullTranscript: $fullTranscript
      ) {
        id
        sessionId
        sessionType
        scheduledStart
        duration
        status
        meetingPlatform
        meetingUrl
        agenda
        granolaNotesUrl
        summary
        fullTranscript
        mentor {
          id
          fullName
        }
        team {
          id
          teamName
        }
      }
    }
  `;

  const variables: Record<string, any> = { id: sessionId };
  if (updates.sessionType !== undefined) variables.sessionType = updates.sessionType;
  if (updates.scheduledStart !== undefined) variables.scheduledStart = updates.scheduledStart;
  if (updates.duration !== undefined) variables.duration = updates.duration;
  if (updates.status !== undefined) variables.status = updates.status;
  if (updates.meetingPlatform !== undefined) variables.meetingPlatform = updates.meetingPlatform;
  if (updates.meetingUrl !== undefined) variables.meetingUrl = updates.meetingUrl;
  if (updates.agenda !== undefined) variables.agenda = updates.agenda;
  if (updates.granolaNotesUrl !== undefined) variables.granolaNotesUrl = updates.granolaNotesUrl;
  if (updates.summary !== undefined) variables.summary = updates.summary;
  if (updates.fullTranscript !== undefined) variables.fullTranscript = updates.fullTranscript;

  return executeMutation(mutation, variables);
}

/**
 * Get team members for task assignment
 */
export async function getTeamMembers(teamId: string): Promise<{ teams: any[] }> {
  const query = `
    query GetTeamMembers($teamId: String!) {
      teams(
        _filter: { id: {_eq: $teamId} }
      ) {
        id
        teamName
        members(
          _filter: { status: {_eq: "Active"} }
        ) {
          id
          status
          type
          contact {
            id
            fullName
            firstName
            lastName
            email
            headshot
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ teams: any[] }>(query, { teamId });
  return { teams: result.teams || [] };
}

/**
 * Get user's team with full details (for students to see their team on dashboard)
 */
export async function getUserTeam(email: string): Promise<{ team: any | null }> {
  const query = `
    query GetUserTeam($email: String!) {
      contacts(
        _filter: { email: {_eq: $email} }
      ) {
        id
        members(
          _filter: { status: {_eq: "Active"} }
        ) {
          id
          team {
            id
            teamId
            teamName
            teamStatus
            description
            cohorts {
              id
              shortName
            }
            members(
              _filter: { status: {_eq: "Active"} }
            ) {
              id
              type
              contact {
                id
                fullName
                email
                headshot
              }
            }
            mentorshipSessions {
              id
              status
            }
            actionItems {
              id
              status
            }
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ contacts: any[] }>(query, { email });
  const team = result.contacts?.[0]?.members?.[0]?.team?.[0] || null;
  return { team };
}

/**
 * Get sessions grouped by team (for staff dashboard)
 */
export async function getSessionsGroupedByTeam(cohortId?: string): Promise<{ teams: any[] }> {
  const query = cohortId ? `
    query GetSessionsGroupedByTeam($cohortId: String!) {
      cohorts(
        _filter: { id: {_eq: $cohortId} }
      ) {
        id
        shortName
        teams(
          _order_by: { teamName: "asc" }
        ) {
          id
          teamId
          teamName
          teamStatus
          cohorts {
            id
            shortName
          }
          members(
            _filter: { status: {_eq: "Active"} }
          ) {
            id
            contact {
              id
              fullName
              email
              headshot
            }
          }
          mentorshipSessions(
            _order_by: { scheduledStart: "desc" }
          ) {
            id
            sessionId
            sessionType
            scheduledStart
            duration
            status
            granolaNotesUrl
            summary
            fullTranscript
            mentor {
              id
              fullName
              email
              headshot
            }
            tasks {
              id
              taskId
              name
              status
            }
            feedback {
              id
              role
              whatWentWell
              areasForImprovement
              additionalNeeds
              suggestedNextSteps
              rating
              contentRelevance
              mentorPreparedness
              respondant {
                id
                fullName
                email
                headshot
              }
            }
          }
        }
      }
    }
  ` : `
    query GetAllSessionsGroupedByTeam {
      teams(
        _order_by: { teamName: "asc" }
      ) {
        id
        teamId
        teamName
        teamStatus
        cohorts {
          id
          shortName
        }
        members(
          _filter: { status: {_eq: "Active"} }
        ) {
          id
          contact {
            id
            fullName
            email
            headshot
          }
        }
        mentorshipSessions(
          _order_by: { scheduledStart: "desc" }
        ) {
          id
          sessionId
          sessionType
          scheduledStart
          duration
          status
          granolaNotesUrl
          summary
          fullTranscript
          mentor {
            id
            fullName
            email
            headshot
          }
          tasks {
            id
            taskId
            name
            status
          }
          feedback {
            id
            role
            whatWentWell
            areasForImprovement
            additionalNeeds
            suggestedNextSteps
            rating
            contentRelevance
            mentorPreparedness
            respondant {
              id
              fullName
              email
              headshot
            }
          }
        }
      }
    }
  `;

  if (cohortId) {
    const result = await executeQuery<{ cohorts: any[] }>(query, { cohortId });
    const teams = result.cohorts?.[0]?.teams || [];
    // Transform mentorshipSessions to sessions alias
    return {
      teams: teams.map((team: any) => ({
        ...team,
        sessions: team.mentorshipSessions || [],
      })),
    };
  } else {
    const result = await executeQuery<{ teams: any[] }>(query);
    // Transform mentorshipSessions to sessions alias
    return {
      teams: (result.teams || []).map((team: any) => ({
        ...team,
        sessions: team.mentorshipSessions || [],
      })),
    };
  }
}

/**
 * Get mentor's teams (teams they mentor via sessions)
 */
export async function getMentorTeams(email: string): Promise<{ teams: any[] }> {
  const query = `
    query GetMentorTeams($email: String!) {
      contacts(
        _filter: { email: {_eq: $email} }
      ) {
        id
        fullName
        mentorshipSessionsMentor(
          _order_by: { scheduledStart: "desc" }
        ) {
          id
          sessionId
          sessionType
          scheduledStart
          status
          team {
            id
            teamId
            teamName
            teamStatus
            cohorts {
              id
              shortName
            }
            members(
              _filter: { status: {_eq: "Active"} }
            ) {
              id
              contact {
                id
                fullName
                email
                headshot
              }
            }
            actionItems(
              _filter: { status: {_in: ["Not Started", "In Progress"]} }
            ) {
              id
              taskId
              status
            }
          }
          feedback {
            id
            role
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ contacts: any[] }>(query, { email });
  const sessions = result.contacts?.[0]?.mentorshipSessionsMentor || [];

  // Extract unique teams and group sessions by team
  const teamMap = new Map<string, any>();
  sessions.forEach((session: any) => {
    const team = session.team?.[0];
    if (team) {
      if (!teamMap.has(team.id)) {
        teamMap.set(team.id, {
          ...team,
          openTaskCount: team.actionItems?.length || 0,
          memberCount: team.members?.length || 0,
          mentorSessions: [],
        });
      }
      // Add session to the team's sessions list
      const teamData = teamMap.get(team.id);
      teamData.mentorSessions.push({
        id: session.id,
        sessionId: session.sessionId,
        sessionType: session.sessionType,
        scheduledStart: session.scheduledStart,
        status: session.status,
        feedback: session.feedback || [],
      });
    }
  });

  return { teams: Array.from(teamMap.values()) };
}

// ====================
// Team Management Mutations
// ====================

/**
 * Update a team's details (staff only)
 * Note: teamStatus is a computed field - to change it, update member statuses instead
 */
export async function updateTeam(
  teamId: string,
  updates: {
    teamName?: string;
    description?: string;
  }
): Promise<{ update_teams: Team }> {
  const mutation = `
    mutation UpdateTeam(
      $id: String!
      $teamName: String
      $description: String
    ) {
      update_teams(
        id: $id
        teamName: $teamName
        description: $description
      ) {
        id
        teamId
        teamName
        teamStatus
        description
      }
    }
  `;

  return executeMutation(mutation, {
    id: teamId,
    teamName: updates.teamName,
    description: updates.description,
  });
}

// Note: deleteTeam removed - teamStatus is a computed field.
// To archive a team, update all its members' statuses to "Archived" instead.
// See useTeamMutations hook for the proper implementation.

/**
 * Create a new team member (staff only)
 */
export async function createMember(input: {
  teamId: string;
  contactId: string;
  type?: string;
  status?: string;
}): Promise<{ insert_members: Member }> {
  const mutation = `
    mutation CreateMember(
      $team: [String!]!
      $contact: [String!]!
      $type: String
      $status: String
    ) {
      insert_members(
        team: $team
        contact: $contact
        type: $type
        status: $status
      ) {
        id
        status
        type
        contact {
          id
          fullName
          email
          headshot
        }
        team {
          id
          teamName
        }
      }
    }
  `;

  return executeMutation(mutation, {
    team: [input.teamId],
    contact: [input.contactId],
    type: input.type || "Member",
    status: input.status || "Active",
  });
}

/**
 * Update a team member (staff only)
 */
export async function updateMember(
  memberId: string,
  updates: {
    status?: string;
    type?: string;
  }
): Promise<{ update_members: Member }> {
  const mutation = `
    mutation UpdateMember(
      $id: String!
      $status: String
      $type: String
    ) {
      update_members(
        id: $id
        status: $status
        type: $type
      ) {
        id
        status
        type
        contact {
          id
          fullName
          email
        }
      }
    }
  `;

  return executeMutation(mutation, {
    id: memberId,
    status: updates.status,
    type: updates.type,
  });
}

/**
 * Remove a member from a team (soft delete - sets status to Inactive)
 */
export async function removeMember(memberId: string): Promise<{ update_members: Member }> {
  return updateMember(memberId, { status: "Inactive" });
}

/**
 * Get available contacts that can be added to a team
 * Optionally filter by cohort
 */
export async function getAvailableContacts(
  cohortId?: string
): Promise<{ contacts: Contact[] }> {
  // If cohortId is provided, get contacts from that cohort's participants
  const query = cohortId ? `
    query GetAvailableContactsInCohort($cohortId: String!) {
      cohorts(
        _filter: { id: {_eq: $cohortId} }
      ) {
        id
        participation(
          _filter: {
            capacity: {_eq: "Participant"}
            status: {_eq: "Active"}
          }
        ) {
          id
          contacts {
            id
            fullName
            firstName
            lastName
            email
            headshot
            members {
              id
              status
              team {
                id
                teamName
              }
            }
          }
        }
      }
    }
  ` : `
    query GetAllAvailableContacts {
      contacts(
        _order_by: { fullName: "asc" }
        _limit: 100
      ) {
        id
        fullName
        firstName
        lastName
        email
        headshot
        members {
          id
          status
          team {
            id
            teamName
          }
        }
      }
    }
  `;

  if (cohortId) {
    const result = await executeQuery<{ cohorts: any[] }>(query, { cohortId });
    // Extract contacts from participation records
    const participation = result.cohorts?.[0]?.participation || [];
    const contacts = participation
      .map((p: any) => p.contacts?.[0])
      .filter(Boolean);
    return { contacts };
  } else {
    const result = await executeQuery<{ contacts: Contact[] }>(query);
    return { contacts: result.contacts || [] };
  }
}

/**
 * Search contacts by name or email (for add member dialog)
 */
export async function searchContacts(
  searchTerm: string
): Promise<{ contacts: Contact[] }> {
  // Note: BaseQL may not support full-text search, so we fetch all and filter
  // For better performance, this could be optimized with a dedicated search endpoint
  const query = `
    query SearchContacts {
      contacts(
        _order_by: { fullName: "asc" }
        _limit: 100
      ) {
        id
        fullName
        firstName
        lastName
        email
        headshot
        members {
          id
          status
          team {
            id
            teamName
          }
        }
      }
    }
  `;

  const result = await executeQuery<{ contacts: Contact[] }>(query);

  // Client-side filtering by search term
  const term = searchTerm.toLowerCase();
  const filteredContacts = (result.contacts || []).filter((contact) => {
    const fullName = contact.fullName?.toLowerCase() || "";
    const email = contact.email?.toLowerCase() || "";
    return fullName.includes(term) || email.includes(term);
  });

  return { contacts: filteredContacts };
}

/**
 * Get all contacts that can be impersonated (mentors and students)
 * Returns contacts with their participation records for role determination
 */
export async function getImpersonatableContacts(): Promise<{
  contacts: Array<Contact & { participationRole?: string }>;
}> {
  const query = `
    query GetImpersonatableContacts {
      participation(
        _filter: {
          _or: [
            { capacity: {_eq: "Mentor"} }
            { capacity: {_eq: "Participant"} }
          ]
          status: {_eq: "Active"}
        }
        _order_by: { lastModified: "desc" }
      ) {
        id
        capacity
        status
        contacts {
          id
          fullName
          firstName
          lastName
          email
          headshot
        }
        cohorts {
          id
          shortName
          status
        }
      }
    }
  `;

  const result = await executeQuery<{ participation: Array<{
    id: string;
    capacity: string;
    status: string;
    contacts: Contact[];
    cohorts: Array<{ id: string; shortName: string; status: string }>;
  }> }>(query);

  // Transform participation records into contacts with role info
  const contactMap = new Map<string, Contact & { participationRole?: string; cohortName?: string }>();

  for (const p of result.participation || []) {
    const contact = p.contacts?.[0];
    if (contact && contact.email) {
      // Only add if not already in map (keep first/most recent)
      if (!contactMap.has(contact.email)) {
        contactMap.set(contact.email, {
          ...contact,
          participationRole: p.capacity === "Participant" ? "Student" : p.capacity,
          cohortName: p.cohorts?.[0]?.shortName,
        });
      }
    }
  }

  // Convert to array and sort by name
  const contacts = Array.from(contactMap.values()).sort((a, b) => {
    const nameA = a.fullName || a.email || "";
    const nameB = b.fullName || b.email || "";
    return nameA.localeCompare(nameB);
  });

  return { contacts };
}
