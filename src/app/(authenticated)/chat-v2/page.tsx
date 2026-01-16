"use client";

/**
 * Staff-only Chat v2 page using the LangGraph orchestrator.
 * Provides a real-time chat interface with agent activity visualization.
 */

import { useMemo } from "react";
import { ShieldAlert, Zap } from "lucide-react";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { ChatContainerV2 } from "@/components/chat";
import { Badge } from "@/components/ui/badge";
import type { UserContext as ChatUserContext } from "@/types/chat";

export default function ChatV2Page() {
  const { userType, userContext, isLoading: isUserLoading } = useEffectiveUser();

  // Build user context for the chat
  const chatUserContext: ChatUserContext | undefined = useMemo(() => {
    if (!userContext) return undefined;
    return {
      name: userContext.fullName || userContext.name,
      email: userContext.email,
      role: userContext.type === "staff" ? "Staff"
        : userContext.type === "mentor" ? "Mentor"
        : userContext.type === "student" ? "Participant"
        : undefined,
      cohort: userContext.cohort?.shortName,
      auth0_id: userContext.auth0Id,
    };
  }, [userContext]);

  // Show loading state while checking user type
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show access denied for non-staff users
  if (userType !== "staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm">
          You don&apos;t have permission to access the AI Chat V2 page.
          This feature is only available to staff members.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full gap-4 overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Chat v2</h1>
          <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <Zap className="h-3 w-3" />
            LangGraph
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Test the new LangGraph-based AI orchestrator. Same features, new architecture with improved streaming.
        </p>
      </div>

      {/* Chat interface - takes remaining space */}
      <div className="flex-1 min-h-0">
        <ChatContainerV2 userContext={chatUserContext} />
      </div>
    </div>
  );
}
