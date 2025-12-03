"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import useSWR from "swr";
import { getUserParticipation, getUserByAuth0Id } from "@/lib/baseql";
import { mapCapacityToUserType, type UserContext, type UserType, type Contact, type Participation } from "@/types/schema";
import { MOCK_USER, isAuthMockEnabled } from "@/lib/auth-mock";

/**
 * Get the capacity name from a participation record
 * Prefers capacityLink (new field) over capacity (deprecated field)
 */
function getCapacityName(participation: Participation): string | undefined {
  // Prefer capacityLink (linked record) over capacity (deprecated single select)
  if (participation.capacityLink && participation.capacityLink.length > 0) {
    return participation.capacityLink[0].name;
  }
  // Fallback to deprecated capacity field
  return participation.capacity;
}

/**
 * Check if a participation record's cohort is "In Progress"
 */
function hasInProgressCohort(participation: Participation): boolean {
  return participation.cohorts?.some(cohort => cohort.status === "In Progress") ?? false;
}

/**
 * Hook to detect user type from participation records
 *
 * Returns the user's role (student, mentor, or staff) based on their
 * participation capacity in Airtable.
 *
 * Lookup priority:
 * 1. auth0Id (stable identifier, supports multi-contact users)
 * 2. email (fallback for users not yet linked)
 */
export function useUserType() {
  const { user, isLoading: isAuthLoading } = useUser();

  // Determine identifiers to use
  const isMock = isAuthMockEnabled();
  const auth0Id = isMock ? null : user?.sub;
  const email = isMock ? MOCK_USER.email : user?.email;

  // Fetch participation data - prefer auth0Id lookup, fall back to email
  const { data, error, isLoading: isParticipationLoading } = useSWR(
    (auth0Id || email) ? [`/api/user-type`, auth0Id, email] : null,
    async () => {
      // Try auth0Id first (returns ALL linked contacts)
      if (auth0Id) {
        const result = await getUserByAuth0Id(auth0Id);
        if (result.contacts.length > 0) {
          console.log(`[useUserType] Found ${result.contacts.length} contact(s) by auth0Id`);
          return {
            contacts: result.contacts,
            participation: result.participation,
            primaryContact: result.contacts[0], // First contact as primary
          };
        }
        // auth0Id not found - user might not be linked yet, fall through to email
        console.log("[useUserType] No contacts found by auth0Id, trying email lookup");
      }

      // Fallback to email lookup (single contact)
      if (email) {
        const result = await getUserParticipation(email);
        return {
          contacts: result.contact ? [result.contact] : [],
          participation: result.participation || [],
          primaryContact: result.contact,
        };
      }

      return null;
    }
  );

  // Helper to extract primary contact from data
  const contact: Contact | undefined = data?.primaryContact;

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

  const participations = data.participation;

  // Priority order for capacity types
  const capacityPriority: Record<string, number> = {
    Staff: 1,
    Mentor: 2,
    Participant: 3,
  };

  // Find the best participation record:
  // 1. Filter to records with a valid capacity (via capacityLink or legacy capacity field)
  // 2. Prioritize records where cohort status is "In Progress"
  // 3. Sort by capacity priority (Staff > Mentor > Participant)
  // 4. Prefer Active participation status
  const validParticipations = participations.filter((p) => getCapacityName(p));

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
    // First priority: cohort with "In Progress" status
    const aInProgress = hasInProgressCohort(a);
    const bInProgress = hasInProgressCohort(b);
    if (aInProgress && !bInProgress) return -1;
    if (bInProgress && !aInProgress) return 1;

    // Second priority: capacity type (Staff > Mentor > Participant)
    const aCapacity = getCapacityName(a) || "";
    const bCapacity = getCapacityName(b) || "";
    const aPriority = capacityPriority[aCapacity] || 999;
    const bPriority = capacityPriority[bCapacity] || 999;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Third priority: Active participation status
    if (a.status === "Active" && b.status !== "Active") return -1;
    if (b.status === "Active" && a.status !== "Active") return 1;

    return 0;
  })[0];

  const selectedCapacity = getCapacityName(activeParticipation);

  console.log(`[useUserType] Selected participation:`, {
    id: activeParticipation.participationId,
    capacity: selectedCapacity,
    capacityLink: activeParticipation.capacityLink?.[0]?.name,
    status: activeParticipation.status,
    cohort: activeParticipation.cohorts?.[0]?.shortName,
    cohortStatus: activeParticipation.cohorts?.[0]?.status,
    totalContacts: data.contacts?.length || 1,
    totalParticipations: participations.length,
  });

  // Determine user type from capacity (using capacityLink or fallback)
  const userType = mapCapacityToUserType(selectedCapacity);

  // Build user context
  // Use primary contact's email for consistency, but fall back to login email
  const primaryEmail = contact?.email || email || "";

  const userContext: UserContext = {
    email: primaryEmail,
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
    // Include info about linked contacts (for multi-contact users)
    linkedContactIds: data.contacts?.map(c => c.id).filter(id => id !== contact?.id),
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
