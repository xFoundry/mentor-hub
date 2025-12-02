"use client";

import { useUserType } from "./use-user-type";
import { useImpersonationSafe } from "@/contexts/impersonation-context";
import type { UserContext, UserType } from "@/types/schema";

/**
 * Result type for useEffectiveUser hook
 */
export interface EffectiveUserResult {
  /** The effective user type (impersonated or real) */
  userType: UserType | null;
  /** The effective user context (impersonated or real) */
  userContext: UserContext | null;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Whether the current view is impersonated */
  isImpersonated: boolean;
  /** The real authenticated user's type (always available) */
  realUserType: UserType | null;
  /** The real authenticated user's context (always available) */
  realUserContext: UserContext | null;
}

/**
 * useEffectiveUser
 *
 * A wrapper hook that returns the "effective" user context, accounting for impersonation.
 *
 * When a staff user is impersonating another user:
 * - Returns the impersonated user's context as the primary context
 * - Preserves the real user's context in `realUserContext`
 *
 * When not impersonating:
 * - Returns the authenticated user's context
 *
 * Use this hook instead of useUserType() in components that should
 * respect impersonation (dashboards, data views, etc.)
 *
 * For components that need to check staff permissions regardless of
 * impersonation (e.g., showing the "stop impersonating" button),
 * use `realUserType` instead.
 *
 * @example
 * ```tsx
 * const { userType, userContext, isImpersonated, realUserType } = useEffectiveUser();
 *
 * // Show impersonated user's dashboard
 * if (userType === "student") {
 *   return <StudentDashboard />;
 * }
 *
 * // Show admin controls based on real user
 * if (realUserType === "staff") {
 *   return <AdminControls />;
 * }
 * ```
 */
export function useEffectiveUser(): EffectiveUserResult {
  // Get the real authenticated user
  const realUser = useUserType();

  // Get impersonation state (safe version that works outside provider)
  const impersonation = useImpersonationSafe();

  // If impersonating, return the target user context
  if (impersonation.isImpersonating && impersonation.targetUserContext) {
    return {
      userType: impersonation.targetUserContext.type,
      userContext: impersonation.targetUserContext,
      isLoading: false,
      error: null,
      isImpersonated: true,
      realUserType: realUser.userType,
      realUserContext: realUser.userContext,
    };
  }

  // Not impersonating - return the real user
  return {
    userType: realUser.userType,
    userContext: realUser.userContext,
    isLoading: realUser.isLoading,
    error: realUser.error,
    isImpersonated: false,
    realUserType: realUser.userType,
    realUserContext: realUser.userContext,
  };
}

/**
 * Hook to check if the effective user has a specific role
 */
export function useEffectiveHasRole(requiredRole: UserType) {
  const { userType, isLoading } = useEffectiveUser();

  return {
    hasRole: userType === requiredRole,
    isLoading,
  };
}

/**
 * Hook to check if the effective user has any of the specified roles
 */
export function useEffectiveHasAnyRole(requiredRoles: UserType[]) {
  const { userType, isLoading } = useEffectiveUser();

  return {
    hasRole: userType ? requiredRoles.includes(userType) : false,
    isLoading,
  };
}

/**
 * Hook to check if the real (non-impersonated) user is staff
 * Useful for showing admin controls during impersonation
 */
export function useIsRealStaff() {
  const { realUserType, isLoading } = useEffectiveUser();

  return {
    isStaff: realUserType === "staff",
    isLoading,
  };
}
