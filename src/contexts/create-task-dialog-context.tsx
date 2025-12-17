"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface OpenDialogOptions {
  teamId?: string;
  sessionId?: string;
  assigneeId?: string;
}

interface CreateTaskDialogContextType {
  isOpen: boolean;
  defaultTeamId?: string;
  defaultSessionId?: string;
  defaultAssigneeId?: string;
  createAnother: boolean;
  setCreateAnother: (value: boolean) => void;
  openDialog: (options?: OpenDialogOptions) => void;
  closeDialog: () => void;
}

const CreateTaskDialogContext = createContext<CreateTaskDialogContextType | undefined>(undefined);

export function CreateTaskDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultTeamId, setDefaultTeamId] = useState<string | undefined>(undefined);
  const [defaultSessionId, setDefaultSessionId] = useState<string | undefined>(undefined);
  const [defaultAssigneeId, setDefaultAssigneeId] = useState<string | undefined>(undefined);
  const [createAnother, setCreateAnother] = useState(false);

  const openDialog = useCallback((options?: OpenDialogOptions) => {
    setDefaultTeamId(options?.teamId);
    setDefaultSessionId(options?.sessionId);
    setDefaultAssigneeId(options?.assigneeId);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    // Clear state after dialog animation completes
    setTimeout(() => {
      setDefaultTeamId(undefined);
      setDefaultSessionId(undefined);
      setDefaultAssigneeId(undefined);
      // Don't reset createAnother - preserve user preference
    }, 200);
  }, []);

  return (
    <CreateTaskDialogContext.Provider
      value={{
        isOpen,
        defaultTeamId,
        defaultSessionId,
        defaultAssigneeId,
        createAnother,
        setCreateAnother,
        openDialog,
        closeDialog,
      }}
    >
      {children}
    </CreateTaskDialogContext.Provider>
  );
}

export function useCreateTaskDialog() {
  const context = useContext(CreateTaskDialogContext);
  if (context === undefined) {
    throw new Error("useCreateTaskDialog must be used within a CreateTaskDialogProvider");
  }
  return context;
}
