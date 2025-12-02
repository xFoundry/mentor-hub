"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface BreadcrumbOverride {
  [path: string]: string;
}

interface BreadcrumbContextType {
  overrides: BreadcrumbOverride;
  setOverride: (path: string, label: string) => void;
  clearOverride: (path: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<BreadcrumbOverride>({});

  const setOverride = useCallback((path: string, label: string) => {
    setOverrides((prev) => ({ ...prev, [path]: label }));
  }, []);

  const clearOverride = useCallback((path: string) => {
    setOverrides((prev) => {
      const newOverrides = { ...prev };
      delete newOverrides[path];
      return newOverrides;
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ overrides, setOverride, clearOverride }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (context === undefined) {
    throw new Error("useBreadcrumb must be used within a BreadcrumbProvider");
  }
  return context;
}
