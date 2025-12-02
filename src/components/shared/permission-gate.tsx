"use client";

import { hasPermission } from "@/lib/permissions";
import type { UserType, Action, Entity } from "@/lib/permissions";

interface PermissionGateProps {
  userType: UserType;
  entity: Entity;
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Permission-aware component wrapper
 * Renders children only if user has required permission
 */
export function PermissionGate({
  userType,
  entity,
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  if (!hasPermission(userType, entity, action)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
