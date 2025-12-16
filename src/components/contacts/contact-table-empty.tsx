"use client";

import { Users } from "lucide-react";

interface ContactTableEmptyProps {
  hasFilters?: boolean;
}

export function ContactTableEmpty({ hasFilters = false }: ContactTableEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border rounded-md bg-muted/10">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">
        {hasFilters ? "No contacts found" : "No contacts yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? "Try adjusting your search or filter criteria to find what you're looking for."
          : "Get started by adding your first contact using the button above."}
      </p>
    </div>
  );
}
