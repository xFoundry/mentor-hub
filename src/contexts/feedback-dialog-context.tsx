"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Session, SessionFeedback } from "@/types/schema";

interface FeedbackDialogContextType {
  isOpen: boolean;
  session: Session | null;
  existingFeedback: SessionFeedback | null;
  mode: "with-session" | "select-session";
  availableSessions: Session[];
  openFeedbackDialog: (session: Session, existingFeedback?: SessionFeedback | null) => void;
  openFeedbackDialogForSelection: (sessions: Session[]) => void;
  selectSession: (session: Session) => void;
  closeFeedbackDialog: () => void;
}

const FeedbackDialogContext = createContext<FeedbackDialogContextType | undefined>(undefined);

export function FeedbackDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [existingFeedback, setExistingFeedback] = useState<SessionFeedback | null>(null);
  const [mode, setMode] = useState<"with-session" | "select-session">("with-session");
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);

  const openFeedbackDialog = useCallback((
    session: Session,
    existingFeedback?: SessionFeedback | null
  ) => {
    setMode("with-session");
    setSession(session);
    setExistingFeedback(existingFeedback ?? null);
    setAvailableSessions([]);
    setIsOpen(true);
  }, []);

  const openFeedbackDialogForSelection = useCallback((sessions: Session[]) => {
    setMode("select-session");
    setSession(null);
    setExistingFeedback(null);
    setAvailableSessions(sessions);
    setIsOpen(true);
  }, []);

  const selectSession = useCallback((session: Session) => {
    setSession(session);
  }, []);

  const closeFeedbackDialog = useCallback(() => {
    setIsOpen(false);
    // Clear state after dialog animation completes
    setTimeout(() => {
      setSession(null);
      setExistingFeedback(null);
      setMode("with-session");
      setAvailableSessions([]);
    }, 200);
  }, []);

  return (
    <FeedbackDialogContext.Provider
      value={{
        isOpen,
        session,
        existingFeedback,
        mode,
        availableSessions,
        openFeedbackDialog,
        openFeedbackDialogForSelection,
        selectSession,
        closeFeedbackDialog,
      }}
    >
      {children}
    </FeedbackDialogContext.Provider>
  );
}

export function useFeedbackDialog() {
  const context = useContext(FeedbackDialogContext);
  if (context === undefined) {
    throw new Error("useFeedbackDialog must be used within a FeedbackDialogProvider");
  }
  return context;
}
