"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import useSWR from "swr";
import { getUserParticipation } from "@/lib/baseql";
import { mapCapacityToUserType, type UserContext, type UserType } from "@/types/schema";
import { MOCK_USER, isAuthMockEnabled } from "@/lib/auth-mock";

/**
 * Hook to detect user type from participation records
 *
 * Returns the user's role (student, mentor, or staff) based on their
 * participation capacity in Airtable.
 */
export function useUserType() {
  const { user, isLoading: isAuthLoading } = useUser();

  // Determine email to use (mock or real Auth0 user)
  const email = isAuthMockEnabled() ? MOCK_USER.email : user?.email;

  // Fetch participation data
  const { data, error, isLoading: isParticipationLoading } = useSWR(
    email ? [`/api/user-type`, email] : null,
    async () => {
      if (!email) return null;

      const result = await getUserParticipation(email);
      return { participation: result.participation || [], contact: result.contact };
    }
  );

  const isLoading = isAuthLoading || isParticipationLoading;

  if (isLoading) {
    return {
      userType: null,
      userContext: null,
      isLoading: true,
      error: null,
    };
  }

  if (error) {
    console.error("[useUserType] Error fetching participation:", error);
    return {
      userType: null,
      userContext: null,
      isLoading: false,
      error,
    };
  }

  if (!data || !data.participation || data.participation.length === 0) {
    console.warn("[useUserType] No participation records found for user");
    return {
      userType: null,
      userContext: null,
      isLoading: false,
      error: new Error("No participation records found"),
    };
  }

  const contact = data.contact;
  const participations = data.participation;

  // Priority order for capacity types
  const capacityPriority: Record<string, number> = {
    Staff: 1,
    Mentor: 2,
    Participant: 3,
  };

  // Find the best participation record:
  // 1. Filter to records with a valid capacity
  // 2. Prefer Active status
  // 3. Sort by capacity priority (Staff > Mentor > Participant)
  const validParticipations = participations.filter((p) => p.capacity);

  if (validParticipations.length === 0) {
    console.warn("[useUserType] No participation records with capacity found");
    return {
      userType: null,
      userContext: null,
      isLoading: false,
      error: new Error("No valid participation records found"),
    };
  }

  const activeParticipation = validParticipations.sort((a, b) => {
    // First, sort by capacity priority (Staff > Mentor > Participant)
    const aPriority = capacityPriority[a.capacity || ""] || 999;
    const bPriority = capacityPriority[b.capacity || ""] || 999;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Then, prefer Active status for same capacity
    if (a.status === "Active" && b.status !== "Active") return -1;
    if (b.status === "Active" && a.status !== "Active") return 1;

    return 0;
  })[0];

  console.log(`[useUserType] Selected participation:`, {
    id: activeParticipation.participationId,
    capacity: activeParticipation.capacity,
    status: activeParticipation.status,
    cohort: activeParticipation.cohorts?.[0]?.shortName,
  });

  // Determine user type from capacity
  const userType = mapCapacityToUserType(activeParticipation.capacity);

  // Build user context
  const userContext: UserContext = {
    email: email || "",
    name: user?.name || MOCK_USER.name,
    firstName: contact?.firstName,
    lastName: contact?.lastName,
    fullName: contact?.fullName,
    headshot: contact?.headshot,
    type: userType,
    participationId: activeParticipation.id,
    cohortId: activeParticipation.cohorts?.[0]?.id || "",
    contactId: contact?.id || activeParticipation.contacts?.[0]?.id || "",
    cohort: activeParticipation.cohorts?.[0],
  };

  return {
    userType,
    userContext,
    isLoading: false,
    error: null,
  };
}

/**
 * Hook to check if user has specific role
 */
export function useHasRole(requiredRole: UserType) {
  const { userType, isLoading } = useUserType();

  return {
    hasRole: userType === requiredRole,
    isLoading,
  };
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(requiredRoles: UserType[]) {
  const { userType, isLoading } = useUserType();

  return {
    hasRole: userType ? requiredRoles.includes(userType) : false,
    isLoading,
  };
}
