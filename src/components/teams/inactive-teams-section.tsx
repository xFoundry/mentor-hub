"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Archive } from "lucide-react";

interface InactiveTeamsSectionProps {
  count: number;
  children: React.ReactNode;
}

export function InactiveTeamsSection({
  count,
  children,
}: InactiveTeamsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (count === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-6">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-3 py-2 h-auto text-muted-foreground hover:text-foreground"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Archive className="h-4 w-4" />
          <span className="font-medium">Inactive Teams</span>
          <span className="text-sm">({count})</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
