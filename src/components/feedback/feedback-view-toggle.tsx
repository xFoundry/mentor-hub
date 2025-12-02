"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, FolderKanban } from "lucide-react";

export type FeedbackGroupBy = "chronological" | "session";

interface FeedbackViewToggleProps {
  value: FeedbackGroupBy;
  onChange: (value: FeedbackGroupBy) => void;
}

export function FeedbackViewToggle({ value, onChange }: FeedbackViewToggleProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as FeedbackGroupBy)}
      className="w-auto"
    >
      <TabsList>
        <TabsTrigger value="chronological" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Recent</span>
        </TabsTrigger>
        <TabsTrigger value="session" className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4" />
          <span className="hidden sm:inline">By Session</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
