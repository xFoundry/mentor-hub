"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

export type TaskViewMode = "kanban" | "list" | "table";
export type TaskFilter = "all" | "open" | "completed";
export type TaskSort = "priority" | "dueDate" | "created" | "status";
export type TaskSortDirection = "asc" | "desc";
export type TaskGroupBy = "none" | "status" | "priority" | "team" | "assignee";

export interface TaskViewState {
  view: TaskViewMode;
  filter: TaskFilter;
  sort: TaskSort;
  sortDirection: TaskSortDirection;
  groupBy: TaskGroupBy;
}

export interface UseTaskViewStateReturn {
  viewState: TaskViewState;
  setView: (view: TaskViewMode) => void;
  setFilter: (filter: TaskFilter) => void;
  setSort: (sort: TaskSort, direction?: TaskSortDirection) => void;
  setSortDirection: (direction: TaskSortDirection) => void;
  setGroupBy: (groupBy: TaskGroupBy) => void;
  resetToDefaults: () => void;
  updateMultiple: (updates: Partial<TaskViewState>) => void;
}

const DEFAULTS: TaskViewState = {
  view: "table",
  filter: "open",
  sort: "priority",
  sortDirection: "asc",
  groupBy: "status",
};

// LocalStorage key for user preferences
const STORAGE_KEY = "mentor-hub.task-preferences";

/**
 * Get user's default preferences from localStorage
 */
function getStoredDefaults(): Partial<TaskViewState> {
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
function saveDefaults(defaults: Partial<TaskViewState>) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Hook for managing task view state with URL synchronization
 *
 * State priority:
 * 1. URL params (highest - for shareable links)
 * 2. localStorage (user defaults)
 * 3. Code defaults (lowest)
 */
export function useTaskViewState(): UseTaskViewStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get stored defaults (only runs once on mount)
  const storedDefaults = useMemo(() => getStoredDefaults(), []);

  // Parse current state from URL with fallbacks
  const viewState = useMemo<TaskViewState>(() => {
    const view = (searchParams.get("view") as TaskViewMode) ||
                 storedDefaults.view ||
                 DEFAULTS.view;
    const filter = (searchParams.get("filter") as TaskFilter) ||
                   storedDefaults.filter ||
                   DEFAULTS.filter;
    const sort = (searchParams.get("sort") as TaskSort) ||
                 storedDefaults.sort ||
                 DEFAULTS.sort;
    const sortDirection = (searchParams.get("sortDir") as TaskSortDirection) ||
                          storedDefaults.sortDirection ||
                          DEFAULTS.sortDirection;
    const groupBy = (searchParams.get("groupBy") as TaskGroupBy) ||
                    storedDefaults.groupBy ||
                    DEFAULTS.groupBy;

    return { view, filter, sort, sortDirection, groupBy };
  }, [searchParams, storedDefaults]);

  // Update URL params
  const updateUrl = useCallback((updates: Partial<TaskViewState>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Map sortDirection to shorter URL param
        const paramKey = key === "sortDirection" ? "sortDir" : key;
        params.set(paramKey, value);
      }
    });

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setView = useCallback((view: TaskViewMode) => {
    updateUrl({ view });
    // Also save to localStorage as default
    saveDefaults({ ...storedDefaults, view });
  }, [updateUrl, storedDefaults]);

  const setFilter = useCallback((filter: TaskFilter) => {
    updateUrl({ filter });
  }, [updateUrl]);

  const setSort = useCallback((sort: TaskSort, direction?: TaskSortDirection) => {
    const updates: Partial<TaskViewState> = { sort };
    if (direction) {
      updates.sortDirection = direction;
    }
    updateUrl(updates);
    saveDefaults({ ...storedDefaults, sort });
  }, [updateUrl, storedDefaults]);

  const setSortDirection = useCallback((sortDirection: TaskSortDirection) => {
    updateUrl({ sortDirection });
  }, [updateUrl]);

  const setGroupBy = useCallback((groupBy: TaskGroupBy) => {
    updateUrl({ groupBy });
    saveDefaults({ ...storedDefaults, groupBy });
  }, [updateUrl, storedDefaults]);

  const resetToDefaults = useCallback(() => {
    // Clear URL params
    router.replace(pathname, { scroll: false });
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [router, pathname]);

  const updateMultiple = useCallback((updates: Partial<TaskViewState>) => {
    updateUrl(updates);
  }, [updateUrl]);

  return {
    viewState,
    setView,
    setFilter,
    setSort,
    setSortDirection,
    setGroupBy,
    resetToDefaults,
    updateMultiple,
  };
}

/**
 * Hook for embedded/compact views that don't sync to URL
 */
export function useLocalTaskViewState(initialState?: Partial<TaskViewState>): UseTaskViewStateReturn {
  const [state, setState] = useState<TaskViewState>({
    ...DEFAULTS,
    ...initialState,
  });

  const setView = useCallback((view: TaskViewMode) => {
    setState(prev => ({ ...prev, view }));
  }, []);

  const setFilter = useCallback((filter: TaskFilter) => {
    setState(prev => ({ ...prev, filter }));
  }, []);

  const setSort = useCallback((sort: TaskSort, direction?: TaskSortDirection) => {
    setState(prev => ({
      ...prev,
      sort,
      ...(direction && { sortDirection: direction }),
    }));
  }, []);

  const setSortDirection = useCallback((sortDirection: TaskSortDirection) => {
    setState(prev => ({ ...prev, sortDirection }));
  }, []);

  const setGroupBy = useCallback((groupBy: TaskGroupBy) => {
    setState(prev => ({ ...prev, groupBy }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setState({ ...DEFAULTS, ...initialState });
  }, [initialState]);

  const updateMultiple = useCallback((updates: Partial<TaskViewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    viewState: state,
    setView,
    setFilter,
    setSort,
    setSortDirection,
    setGroupBy,
    resetToDefaults,
    updateMultiple,
  };
}

// Need to import useState for the local version
import { useState } from "react";
