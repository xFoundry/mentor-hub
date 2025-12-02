"use client";

import { useImpersonationSafe } from "@/contexts/impersonation-context";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { RoleBadge } from "@/components/role-badge";

/**
 * ImpersonationBanner
 *
 * Displays a fixed banner at the top of the page when a staff user
 * is impersonating another user. Shows the impersonated user's name
 * and role, with a button to stop impersonating.
 *
 * Only renders when actively impersonating.
 */
export function ImpersonationBanner() {
  const { isImpersonating, targetUserContext, stopImpersonation } =
    useImpersonationSafe();

  if (!isImpersonating || !targetUserContext) {
    return null;
  }

  const displayName =
    targetUserContext.fullName ||
    targetUserContext.name ||
    targetUserContext.email;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between z-50">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium">
          Viewing as: <span className="font-semibold">{displayName}</span>
        </span>
        <RoleBadge role={targetUserContext.type} />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={stopImpersonation}
        className="text-amber-950 hover:bg-amber-600 hover:text-amber-950 gap-1"
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">Stop Impersonating</span>
        <span className="sm:hidden">Exit</span>
      </Button>
    </div>
  );
}
