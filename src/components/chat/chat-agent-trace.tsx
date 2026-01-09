"use client";

/**
 * Agent trace panel component.
 * Shows real-time agent activity during streaming.
 */

import { useState } from "react";
import {
  Activity,
  ChevronRight,
  Wrench,
  ArrowRight,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AgentTrace } from "@/types/chat";

interface ChatAgentTraceProps {
  traces: AgentTrace[];
  isStreaming: boolean;
}

/**
 * Get an icon for a trace action type.
 */
function getActionIcon(action: string) {
  switch (action) {
    case "tool_call":
      return <Wrench className="h-3 w-3" />;
    case "tool_response":
      return <CheckCircle className="h-3 w-3" />;
    case "delegate":
      return <ArrowRight className="h-3 w-3" />;
    case "thinking":
      return <MessageSquare className="h-3 w-3" />;
    default:
      return <Activity className="h-3 w-3" />;
  }
}

/**
 * Get a friendly label for a trace action.
 */
function getActionLabel(action: string): string {
  switch (action) {
    case "tool_call":
      return "Calling tool";
    case "tool_response":
      return "Tool result";
    case "delegate":
      return "Delegating";
    case "thinking":
      return "Thinking";
    default:
      return action;
  }
}

export function ChatAgentTrace({ traces, isStreaming }: ChatAgentTraceProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-64">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <Activity
              className={cn("h-4 w-4", isStreaming && "animate-pulse text-primary")}
            />
            Agent Activity
            {traces.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {traces.length}
              </Badge>
            )}
          </span>
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-90"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea className="h-[400px] rounded-md border">
          <div className="p-2">
            {traces.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {isStreaming ? "Waiting for activity..." : "No activity yet"}
              </p>
            ) : (
              <div className="space-y-2">
                {traces.map((trace) => (
                  <div
                    key={trace.id}
                    className="flex flex-col gap-1 rounded-md bg-muted/50 p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1 px-1.5 py-0">
                        {getActionIcon(trace.action)}
                        <span className="font-medium">{trace.agent}</span>
                      </Badge>
                      <span className="text-muted-foreground">
                        {getActionLabel(trace.action)}
                      </span>
                    </div>
                    {trace.tool_name && (
                      <div className="flex items-center gap-1 pl-1 text-muted-foreground">
                        <Wrench className="h-3 w-3" />
                        <code className="rounded bg-muted px-1">
                          {trace.tool_name}
                        </code>
                      </div>
                    )}
                    {trace.details && (
                      <p className="line-clamp-2 pl-1 text-muted-foreground">
                        {trace.details}
                      </p>
                    )}
                    <span className="pl-1 text-[10px] text-muted-foreground/60">
                      {trace.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}
