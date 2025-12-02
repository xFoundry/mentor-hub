"use client";

import type { UserContext } from "@/types/schema";

interface WelcomeHeaderProps {
  userContext: UserContext;
  subtitle?: string;
}

export function WelcomeHeader({ userContext, subtitle }: WelcomeHeaderProps) {
  const firstName = userContext.firstName || userContext.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName}!</h1>
      {subtitle && (
        <p className="text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
