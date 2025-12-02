"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUserType } from "@/hooks/use-user-type";

interface CohortContextType {
  selectedCohortId: string;
  setSelectedCohortId: (cohortId: string) => void;
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

export function CohortProvider({ children }: { children: React.ReactNode }) {
  const { userType, userContext, isLoading } = useUserType();

  // Always initialize with "all" to match server-side render
  const [selectedCohortId, setSelectedCohortIdState] = useState<string>("all");
  const [hasMounted, setHasMounted] = useState(false);

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    setHasMounted(true);
    const savedCohortId = localStorage.getItem("selectedCohortId");
    if (savedCohortId) {
      setSelectedCohortIdState(savedCohortId);
    }
  }, []);

  // Update default cohort when user context loads
  useEffect(() => {
    if (!hasMounted || isLoading || !userContext) return;

    const savedCohortId = localStorage.getItem("selectedCohortId");

    // Only set default if no saved preference exists
    if (!savedCohortId) {
      if (userType === "staff") {
        setSelectedCohortIdState("all");
      } else {
        setSelectedCohortIdState(userContext.cohortId || "all");
      }
    }
  }, [hasMounted, isLoading, userContext, userType]);

  // Save to localStorage when changed
  const setSelectedCohortId = useCallback((cohortId: string) => {
    setSelectedCohortIdState(cohortId);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedCohortId", cohortId);
    }
  }, []);

  return (
    <CohortContext.Provider value={{ selectedCohortId, setSelectedCohortId }}>
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
