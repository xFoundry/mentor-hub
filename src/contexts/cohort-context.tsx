"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useUserType } from "@/hooks/use-user-type";
import { useImpersonationSafe } from "@/contexts/impersonation-context";

interface CohortContextType {
  /** The effective cohort ID (accounts for impersonation) */
  selectedCohortId: string;
  /** Update the selected cohort (no-op when impersonating) */
  setSelectedCohortId: (cohortId: string) => void;
  /** Whether cohort selection is locked due to impersonation */
  isImpersonationLocked: boolean;
  /** The staff's actual selected cohort (preserved during impersonation) */
  rawSelectedCohortId: string;
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

export function CohortProvider({ children }: { children: React.ReactNode }) {
  const { userType, userContext, isLoading } = useUserType();
  const { isImpersonating, targetUserContext } = useImpersonationSafe();

  // Staff's actual selected cohort (persisted to localStorage)
  const [internalSelectedCohortId, setInternalSelectedCohortId] = useState<string>("all");
  const [hasMounted, setHasMounted] = useState(false);

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    setHasMounted(true);
    const savedCohortId = localStorage.getItem("selectedCohortId");
    if (savedCohortId) {
      setInternalSelectedCohortId(savedCohortId);
    }
  }, []);

  // Update default cohort when user context loads
  useEffect(() => {
    if (!hasMounted || isLoading || !userContext) return;

    const savedCohortId = localStorage.getItem("selectedCohortId");

    // Only set default if no saved preference exists
    if (!savedCohortId) {
      if (userType === "staff") {
        setInternalSelectedCohortId("all");
      } else {
        setInternalSelectedCohortId(userContext.cohortId || "all");
      }
    }
  }, [hasMounted, isLoading, userContext, userType]);

  // Save to localStorage when changed (blocked during impersonation)
  const setSelectedCohortId = useCallback((cohortId: string) => {
    // Block changes during impersonation
    if (isImpersonating) {
      console.warn("[CohortContext] Cannot change cohort while impersonating");
      return;
    }

    setInternalSelectedCohortId(cohortId);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedCohortId", cohortId);
    }
  }, [isImpersonating]);

  // Calculate the effective cohort ID
  const selectedCohortId = useMemo(() => {
    // When impersonating, use the target user's cohort
    if (isImpersonating && targetUserContext?.cohortId) {
      return targetUserContext.cohortId;
    }

    // When NOT impersonating:
    // - Staff can use their selected cohort (including "all")
    // - Non-staff users are scoped to their own cohort
    if (userType === "staff") {
      return internalSelectedCohortId;
    }

    return userContext?.cohortId || internalSelectedCohortId;
  }, [isImpersonating, targetUserContext, internalSelectedCohortId, userType, userContext]);

  const value = useMemo(() => ({
    selectedCohortId,
    setSelectedCohortId,
    isImpersonationLocked: isImpersonating,
    rawSelectedCohortId: internalSelectedCohortId,
  }), [selectedCohortId, setSelectedCohortId, isImpersonating, internalSelectedCohortId]);

  return (
    <CohortContext.Provider value={value}>
      {children}
    </CohortContext.Provider>
  );
}

export function useCohortContext() {
  const context = useContext(CohortContext);
  if (context === undefined) {
    throw new Error("useCohortContext must be used within a CohortProvider");
  }
  return context;
}
