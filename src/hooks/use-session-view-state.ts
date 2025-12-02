"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type {
  SessionViewMode,
  SessionFilter,
  SessionSort,
  SessionSortDirection,
  SessionGroupBy,
} from "@/components/sessions/session-transformers";

export type {
  SessionViewMode,
  SessionFilter,
  SessionSort,
  SessionSortDirection,
  SessionGroupBy,
};

export interface SessionViewState {
  view: SessionViewMode;
  filter: SessionFilter;
  sort: SessionSort;
  sortDirection: SessionSortDirection;
  groupBy: SessionGroupBy;
  search: string;
}

export interface UseSessionViewStateReturn {
  viewState: SessionViewState;
  setView: (view: SessionViewMode) => void;
  setFilter: (filter: SessionFilter) => void;
  setSort: (sort: SessionSort, direction?: SessionSortDirection) => void;
  setSortDirection: (direction: SessionSortDirection) => void;
  setGroupBy: (groupBy: SessionGroupBy) => void;
  setSearch: (search: string) => void;
  resetToDefaults: () => void;
  updateMultiple: (updates: Partial<SessionViewState>) => void;
}

const DEFAULTS: SessionViewState = {
  view: "cards",
  filter: "all",
  sort: "date",
  sortDirection: "desc",
  groupBy: "none",
  search: "",
};

// LocalStorage key for user preferences
const STORAGE_KEY = "mentor-hub.session-preferences";

/**
 * Get user's default preferences from localStorage
 */
function getStoredDefaults(): Partial<SessionViewState> {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore localStorage errors
  }
  return {};
}

/**
 * Save user's preferences to localStorage
 */
function saveDefaults(defaults: Partial<SessionViewState>) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Hook for managing session view state with URL synchronization
 *
 * State priority:
 * 1. URL params (highest - for shareable links)
 * 2. localStorage (user defaults)
 * 3. Code defaults (lowest)
 */
export function useSessionViewState(): UseSessionViewStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get stored defaults (only runs once on mount)
  const storedDefaults = useMemo(() => getStoredDefaults(), []);

  // Parse current state from URL with fallbacks
  const viewState = useMemo<SessionViewState>(() => {
    const view = (searchParams.get("view") as SessionViewMode) ||
                 storedDefaults.view ||
                 DEFAULTS.view;
    const filter = (searchParams.get("filter") as SessionFilter) ||
                   storedDefaults.filter ||
                   DEFAULTS.filter;
    const sort = (searchParams.get("sort") as SessionSort) ||
                 storedDefaults.sort ||
                 DEFAULTS.sort;
    const sortDirection = (searchParams.get("sortDir") as SessionSortDirection) ||
                          storedDefaults.sortDirection ||
                          DEFAULTS.sortDirection;
    const groupBy = (searchParams.get("groupBy") as SessionGroupBy) ||
                    storedDefaults.groupBy ||
                    DEFAULTS.groupBy;
    const search = searchParams.get("q") || DEFAULTS.search;

    return { view, filter, sort, sortDirection, groupBy, search };
  }, [searchParams, storedDefaults]);

  // Update URL params
  const updateUrl = useCallback((updates: Partial<SessionViewState>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Map to shorter URL params
        let paramKey = key;
        if (key === "sortDirection") paramKey = "sortDir";
        if (key === "search") paramKey = "q";

        if (value === "" || value === DEFAULTS[key as keyof SessionViewState]) {
          params.delete(paramKey);
        } else {
          params.set(paramKey, value);
        }
      }
    });

    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setView = useCallback((view: SessionViewMode) => {
    updateUrl({ view });
    // Also save to localStorage as default
    saveDefaults({ ...storedDefaults, view });
  }, [updateUrl, storedDefaults]);

  const setFilter = useCallback((filter: SessionFilter) => {
    updateUrl({ filter });
  }, [updateUrl]);

  const setSort = useCallback((sort: SessionSort, direction?: SessionSortDirection) => {
    const updates: Partial<SessionViewState> = { sort };
    if (direction) {
      updates.sortDirection = direction;
    }
    updateUrl(updates);
    saveDefaults({ ...storedDefaults, sort });
  }, [updateUrl, storedDefaults]);

  const setSortDirection = useCallback((sortDirection: SessionSortDirection) => {
    updateUrl({ sortDirection });
  }, [updateUrl]);

  const setGroupBy = useCallback((groupBy: SessionGroupBy) => {
    updateUrl({ groupBy });
    saveDefaults({ ...storedDefaults, groupBy });
  }, [updateUrl, storedDefaults]);

  const setSearch = useCallback((search: string) => {
    updateUrl({ search });
  }, [updateUrl]);

  const resetToDefaults = useCallback(() => {
    // Clear URL params
    router.replace(pathname, { scroll: false });
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [router, pathname]);

  const updateMultiple = useCallback((updates: Partial<SessionViewState>) => {
    updateUrl(updates);
  }, [updateUrl]);

  return {
    viewState,
    setView,
    setFilter,
    setSort,
    setSortDirection,
    setGroupBy,
    setSearch,
    resetToDefaults,
    updateMultiple,
  };
}

/**
 * Hook for embedded/compact views that don't sync to URL
 */
export function useLocalSessionViewState(
  initialState?: Partial<SessionViewState>
): UseSessionViewStateReturn {
  const [state, setState] = useState<SessionViewState>({
    ...DEFAULTS,
    ...initialState,
  });

  const setView = useCallback((view: SessionViewMode) => {
    setState(prev => ({ ...prev, view }));
  }, []);

  const setFilter = useCallback((filter: SessionFilter) => {
    setState(prev => ({ ...prev, filter }));
  }, []);

  const setSort = useCallback((sort: SessionSort, direction?: SessionSortDirection) => {
    setState(prev => ({
      ...prev,
      sort,
      ...(direction && { sortDirection: direction }),
    }));
  }, []);

  const setSortDirection = useCallback((sortDirection: SessionSortDirection) => {
    setState(prev => ({ ...prev, sortDirection }));
  }, []);

  const setGroupBy = useCallback((groupBy: SessionGroupBy) => {
    setState(prev => ({ ...prev, groupBy }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setState(prev => ({ ...prev, search }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setState({ ...DEFAULTS, ...initialState });
  }, [initialState]);

  const updateMultiple = useCallback((updates: Partial<SessionViewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    viewState: state,
    setView,
    setFilter,
    setSort,
    setSortDirection,
    setGroupBy,
    setSearch,
    resetToDefaults,
    updateMultiple,
  };
}
