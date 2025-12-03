"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { getUserParticipation } from "@/lib/baseql";
import { mapCapacityToUserType, type UserContext, type UserType, type Participation } from "@/types/schema";

/**
 * Get the capacity name from a participation record
 * Prefers capacityLink (new field) over capacity (deprecated field)
 */
function getCapacityName(participation: Participation): string | undefined {
  if (participation.capacityLink && participation.capacityLink.length > 0) {
    return participation.capacityLink[0].name;
  }
  return participation.capacity;
}

/**
 * Check if a participation record's cohort is "In Progress"
 */
function hasInProgressCohort(participation: Participation): boolean {
  return participation.cohorts?.some(cohort => cohort.status === "In Progress") ?? false;
}

/**
 * Impersonation state for staff users to view as other users
 */
interface ImpersonationState {
  isImpersonating: boolean;
  targetEmail: string | null;
  targetUserContext: UserContext | null;
  isLoading: boolean;
  error: Error | null;
}

interface ImpersonationContextType extends ImpersonationState {
  /**
   * Start impersonating a user by their email
   * Only works if the current user is staff
   */
  startImpersonation: (targetEmail: string) => Promise<void>;

  /**
   * Stop impersonating and return to staff view
   */
  stopImpersonation: () => void;

  /**
   * Whether the current user can impersonate (must be staff)
   */
  canImpersonate: boolean;

  /**
   * The original staff user context (preserved during impersonation)
   */
  originalUserContext: UserContext | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

interface ImpersonationProviderProps {
  children: React.ReactNode;
  /** The authenticated staff user's context - required to enable impersonation */
  staffUserContext: UserContext | null;
  /** The authenticated user's type */
  staffUserType: UserType | null;
}

/**
 * ImpersonationProvider
 *
 * Provides staff users the ability to view the application as any other user.
 * Uses React state only (session-only persistence - clears on refresh).
 *
 * Security:
 * - Only staff users can impersonate
 * - Original staff context is always preserved
 * - Session-only (no localStorage persistence)
 */
export function ImpersonationProvider({
  children,
  staffUserContext,
  staffUserType,
}: ImpersonationProviderProps) {
  const [state, setState] = useState<ImpersonationState>({
    isImpersonating: false,
    targetEmail: null,
    targetUserContext: null,
    isLoading: false,
    error: null,
  });

  // Store original context in a ref to preserve it
  const originalContextRef = useRef<UserContext | null>(staffUserContext);

  // Update ref when staff context changes (but not during impersonation)
  if (staffUserContext && !state.isImpersonating) {
    originalContextRef.current = staffUserContext;
  }

  const canImpersonate = staffUserType === "staff";

  const startImpersonation = useCallback(
    async (targetEmail: string) => {
      if (!canImpersonate) {
        console.warn("[Impersonation] Only staff users can impersonate");
        return;
      }

      if (!staffUserContext) {
        console.warn("[Impersonation] No staff user context available");
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Fetch target user's participation data
        const result = await getUserParticipation(targetEmail);

        if (!result.participation || result.participation.length === 0) {
          throw new Error(`No participation records found for ${targetEmail}`);
        }

        // Find the best participation record (same logic as useUserType)
        // Priority: In Progress cohort > capacity type > Active status
        const capacityPriority: Record<string, number> = {
          Staff: 1,
          Mentor: 2,
          Participant: 3,
        };

        const validParticipations = result.participation.filter((p) => getCapacityName(p));

        if (validParticipations.length === 0) {
          throw new Error(`No valid participation records for ${targetEmail}`);
        }

        const bestParticipation = validParticipations.sort((a, b) => {
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

        const selectedCapacity = getCapacityName(bestParticipation);
        const targetType = mapCapacityToUserType(selectedCapacity);

        // Build the target user context
        const targetContext: UserContext = {
          email: targetEmail,
          name: result.contact?.fullName,
          firstName: result.contact?.firstName,
          lastName: result.contact?.lastName,
          fullName: result.contact?.fullName,
          headshot: result.contact?.headshot,
          type: targetType,
          participationId: bestParticipation.id,
          cohortId: bestParticipation.cohorts?.[0]?.id || "",
          contactId: result.contact?.id || "",
          cohort: bestParticipation.cohorts?.[0],
        };

        console.log("[Impersonation] Started impersonating:", {
          targetEmail,
          targetType,
          capacity: selectedCapacity,
          capacityLink: bestParticipation.capacityLink?.[0]?.name,
          participationId: bestParticipation.participationId,
          cohort: bestParticipation.cohorts?.[0]?.shortName,
          cohortStatus: bestParticipation.cohorts?.[0]?.status,
        });

        setState({
          isImpersonating: true,
          targetEmail,
          targetUserContext: targetContext,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("[Impersonation] Error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      }
    },
    [canImpersonate, staffUserContext]
  );

  const stopImpersonation = useCallback(() => {
    console.log("[Impersonation] Stopped impersonating");
    setState({
      isImpersonating: false,
      targetEmail: null,
      targetUserContext: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        ...state,
        startImpersonation,
        stopImpersonation,
        canImpersonate,
        originalUserContext: originalContextRef.current,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

/**
 * Hook to access impersonation state and actions
 */
export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within ImpersonationProvider");
  }
  return context;
}

/**
 * Hook to safely check if impersonation is available
 * Returns null values if context is not available (safe for optional use)
 */
export function useImpersonationSafe() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    return {
      isImpersonating: false,
      targetUserContext: null,
      canImpersonate: false,
      originalUserContext: null,
      startImpersonation: async () => {},
      stopImpersonation: () => {},
      targetEmail: null,
      isLoading: false,
      error: null,
    };
  }
  return context;
}
