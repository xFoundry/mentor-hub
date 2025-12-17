"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Task } from "@/types/schema";
import type { TeamMember } from "@/hooks/use-team-members";

interface OpenTaskSheetOptions {
  /** Optional: Team ID for fetching team members */
  teamId?: string;
  /** Optional: Pre-loaded team members to avoid fetch */
  teamMembers?: TeamMember[];
  /** Optional: Override task update callback (for optimistic updates) */
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  /** Optional: Override create update callback */
  onCreateUpdate?: (input: {
    taskId: string;
    authorId: string;
    health: string;
    message: string;
  }) => Promise<void>;
  /** Optional: Task delete callback */
  onTaskDelete?: (taskId: string) => Promise<void>;
}

interface TaskSheetContextType {
  isOpen: boolean;
  taskId: string | null;
  options: OpenTaskSheetOptions;
  openTaskSheet: (taskId: string, options?: OpenTaskSheetOptions) => void;
  closeTaskSheet: () => void;
}

const TaskSheetContext = createContext<TaskSheetContextType | undefined>(undefined);

export function TaskSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [options, setOptions] = useState<OpenTaskSheetOptions>({});

  const openTaskSheet = useCallback((taskId: string, opts?: OpenTaskSheetOptions) => {
    setTaskId(taskId);
    setOptions(opts || {});
    setIsOpen(true);
  }, []);

  const closeTaskSheet = useCallback(() => {
    setIsOpen(false);
    // Clear state after animation completes (200ms matches existing pattern)
    setTimeout(() => {
      setTaskId(null);
      setOptions({});
    }, 200);
  }, []);

  return (
    <TaskSheetContext.Provider
      value={{
        isOpen,
        taskId,
        options,
        openTaskSheet,
        closeTaskSheet,
      }}
    >
      {children}
    </TaskSheetContext.Provider>
  );
}

export function useTaskSheet() {
  const context = useContext(TaskSheetContext);
  if (context === undefined) {
    throw new Error("useTaskSheet must be used within a TaskSheetProvider");
  }
  return context;
}

export function useTaskSheetSafe() {
  const context = useContext(TaskSheetContext);
  return context ?? {
    isOpen: false,
    taskId: null,
    options: {},
    openTaskSheet: () => {},
    closeTaskSheet: () => {},
  };
}
