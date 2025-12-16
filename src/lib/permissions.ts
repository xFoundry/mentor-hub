/**
 * Permission System
 *
 * Defines what actions each user type can perform on different entities.
 */

import type { UserType as SchemaUserType } from "@/types/schema";

// Re-export UserType for convenience
export type UserType = SchemaUserType;

export type Action = "create" | "read" | "update" | "delete";
export type Entity =
  | "session"
  | "sessionFeedback"
  | "task"
  | "update"
  | "contact"
  | "team"
  | "cohort";

/**
 * Permission rules for each user type
 */
const permissionRules: Record<
  UserType,
  Record<Entity, Partial<Record<Action, boolean | string[]>>>
> = {
  student: {
    session: {
      read: true, // Can read own team's sessions
      create: false,
      update: false,
      delete: false,
    },
    sessionFeedback: {
      read: true, // Can read feedback (except private notes)
      create: true, // Can create own feedback as mentee
      update: ["own"], // Can update own feedback
      delete: false,
    },
    task: {
      read: true, // Can read tasks assigned to them
      create: true, // Can create tasks for team members
      update: ["status", "priority", "levelOfEffort", "due", "name", "description", "assignedTo"], // Can update specific fields including reassigning to team members
      delete: false,
    },
    update: {
      read: true, // Can read updates on own tasks
      create: true, // Can create updates on own tasks
      update: ["own"],
      delete: ["own"],
    },
    contact: {
      read: true, // Can read mentors in cohort
      create: false,
      update: false,
      delete: false,
    },
    team: {
      read: true, // Can read own team
      create: false,
      update: false,
      delete: false,
    },
    cohort: {
      read: true, // Can read own cohort
      create: false,
      update: false,
      delete: false,
    },
  },

  mentor: {
    session: {
      read: true, // Can read own sessions
      create: false, // Cannot create sessions (staff does this)
      update: false,
      delete: false,
    },
    sessionFeedback: {
      read: true, // Can read all feedback for own sessions
      create: true, // Can create feedback as mentor
      update: ["own"],
      delete: false,
    },
    task: {
      read: true, // Can read tasks from own sessions
      create: false, // Cannot create tasks (staff creates during sessions)
      update: ["own"], // Can update tasks they created
      delete: false,
    },
    update: {
      read: true, // Can read updates on session tasks
      create: true, // Can create updates
      update: ["own"],
      delete: ["own"],
    },
    contact: {
      read: true, // Can read students in assigned teams
      create: false,
      update: false,
      delete: false,
    },
    team: {
      read: true, // Can read assigned teams
      create: false,
      update: false,
      delete: false,
    },
    cohort: {
      read: true, // Can read cohort info
      create: false,
      update: false,
      delete: false,
    },
  },

  staff: {
    session: {
      read: true, // Can read all sessions
      create: true, // Can create sessions
      update: true, // Can update all fields
      delete: true, // Can delete sessions
    },
    sessionFeedback: {
      read: true, // Can read all feedback including private notes
      create: true, // Can create feedback
      update: true, // Can update any feedback
      delete: true, // Can delete feedback
    },
    task: {
      read: true, // Can read all tasks
      create: true, // Can create tasks
      update: true, // Can update any task
      delete: true, // Can delete tasks
    },
    update: {
      read: true, // Can read all updates
      create: true, // Can create updates
      update: true, // Can update any update
      delete: true, // Can delete updates
    },
    contact: {
      read: true, // Can read all contacts
      create: true, // Can create contacts
      update: true, // Can update contacts
      delete: true, // Can delete contacts
    },
    team: {
      read: true, // Can read all teams
      create: true, // Can create teams
      update: true, // Can update teams
      delete: true, // Can delete teams
    },
    cohort: {
      read: true, // Can read all cohorts
      create: true, // Can create cohorts
      update: true, // Can update cohorts
      delete: true, // Can delete cohorts
    },
  },
};

/**
 * Check if a user type has permission for a specific action on an entity
 */
export function hasPermission(
  userType: UserType,
  entity: Entity,
  action: Action
): boolean {
  const entityPermissions = permissionRules[userType]?.[entity];
  if (!entityPermissions) return false;

  const permission = entityPermissions[action];

  // If permission is boolean, return it directly
  if (typeof permission === "boolean") {
    return permission;
  }

  // If permission is an array (field-level or ownership), return true
  // (specific field/ownership checks should be done at component level)
  if (Array.isArray(permission)) {
    return permission.length > 0;
  }

  return false;
}

/**
 * Get allowed fields for update action
 * Returns array of field names or true for all fields
 */
export function getAllowedUpdateFields(
  userType: UserType,
  entity: Entity
): string[] | boolean {
  const entityPermissions = permissionRules[userType]?.[entity];
  if (!entityPermissions) return false;

  const permission = entityPermissions.update;

  if (permission === true) return true; // All fields allowed
  if (Array.isArray(permission)) return permission;

  return false; // No update permission
}

/**
 * Check if user can update a specific field
 */
export function canUpdateField(
  userType: UserType,
  entity: Entity,
  field: string
): boolean {
  const allowedFields = getAllowedUpdateFields(userType, entity);

  if (allowedFields === true) return true; // Can update all fields
  if (allowedFields === false) return false; // Cannot update any field
  if (Array.isArray(allowedFields)) {
    return allowedFields.includes(field) || allowedFields.includes("own");
  }

  return false;
}

/**
 * Check if user owns a resource
 * This should be checked in combination with "own" permission
 */
export function ownsResource(userId: string, resource: { authorId?: string; createdBy?: string }): boolean {
  return resource.authorId === userId || resource.createdBy === userId;
}

/**
 * Permission wrapper for UI elements
 */
export interface PermissionGateProps {
  userType: UserType;
  entity: Entity;
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Check multiple permissions at once
 */
export function hasAnyPermission(
  userType: UserType,
  permissions: Array<{ entity: Entity; action: Action }>
): boolean {
  return permissions.some((perm) => hasPermission(userType, perm.entity, perm.action));
}

/**
 * Check all permissions
 */
export function hasAllPermissions(
  userType: UserType,
  permissions: Array<{ entity: Entity; action: Action }>
): boolean {
  return permissions.every((perm) => hasPermission(userType, perm.entity, perm.action));
}
