"use client";

import { useMemo } from "react";
import { ShieldAlert, LayoutGrid } from "lucide-react";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { Badge } from "@/components/ui/badge";
import { CanvasProvider } from "@/contexts/canvas-context";
import { CanvasWorkspace } from "@/components/canvas/canvas-workspace";

export default function CanvasPage() {
  const {
    userType,
    userContext,
    realUserContext,
    isLoading: isUserLoading,
  } = useEffectiveUser();

  const storageKey = useMemo(() => {
    const identity =
      realUserContext?.auth0Id
      ?? realUserContext?.email
      ?? userContext?.auth0Id
      ?? userContext?.email
      ?? "anonymous";
    return `canvas_state_${identity}`;
  }, [realUserContext, userContext]);

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (userType !== "staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm">
          You don&apos;t have permission to access the Canvas page.
          This feature is only available to staff members.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full gap-4 overflow-hidden">
      <div className="shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Canvas</h1>
          <Badge variant="secondary" className="gap-1">
            <LayoutGrid className="h-3 w-3" />
            Experimental
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Arrange chat blocks and artifacts on an infinite canvas. Drag to connect context between nodes.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <CanvasProvider storageKey={storageKey}>
          <CanvasWorkspace />
        </CanvasProvider>
      </div>
    </div>
  );
}
