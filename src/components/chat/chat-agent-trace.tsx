"use client";

/**
 * Enhanced agent trace panel component.
 * Shows real-time multi-agent activity with delegation visualization.
 */

import { useState, useMemo } from "react";
import {
  Activity,
  ChevronRight,
  ChevronDown,
  Wrench,
  ArrowRight,
  MessageSquare,
  CheckCircle,
  Brain,
  Database,
  FileText,
  Layers,
  Sparkles,
  Target,
  Users,
  Clock,
  Zap,
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
  variant?: "default" | "cowork";
  className?: string;
  title?: string;
}

/** Agent display configuration */
const AGENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  orchestrator: {
    icon: <Brain className="h-3 w-3" />,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
  entity_researcher: {
    icon: <Database className="h-3 w-3" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  text_researcher: {
    icon: <FileText className="h-3 w-3" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  summary_researcher: {
    icon: <Layers className="h-3 w-3" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  deep_reasoning: {
    icon: <Sparkles className="h-3 w-3" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  mentor_matcher: {
    icon: <Target className="h-3 w-3" />,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
};

/** Get agent config with fallback */
function getAgentConfig(agentName: string) {
  const normalized = agentName.toLowerCase().replace(/[^a-z_]/g, "");
  return AGENT_CONFIG[normalized] || {
    icon: <Users className="h-3 w-3" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  };
}

/** Get friendly agent name */
function getAgentLabel(agentName: string): string {
  const labels: Record<string, string> = {
    orchestrator: "Orchestrator",
    entity_researcher: "Entity Research",
    text_researcher: "Text Research",
    summary_researcher: "Summary Research",
    deep_reasoning: "Deep Analysis",
    mentor_matcher: "Mentor Matching",
  };
  const normalized = agentName.toLowerCase().replace(/[^a-z_]/g, "");
  return labels[normalized] || agentName;
}

/** Get an icon for a trace action type */
function getActionIcon(action: string) {
  switch (action) {
    case "tool_call":
      return <Wrench className="h-3 w-3" />;
    case "tool_response":
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case "delegate":
      return <ArrowRight className="h-3 w-3 text-primary" />;
    case "thinking":
      return <MessageSquare className="h-3 w-3 text-violet-500" />;
    default:
      return <Activity className="h-3 w-3" />;
  }
}

/** Get a friendly label for a trace action */
function getActionLabel(action: string, toolName?: string): string {
  switch (action) {
    case "tool_call":
      return toolName ? `Calling ${toolName.replace(/_/g, " ")}` : "Calling tool";
    case "tool_response":
      return "Result received";
    case "delegate":
      return "Delegating";
    case "thinking":
      return "Reasoning";
    default:
      return action;
  }
}

/** Group traces by agent */
function groupTracesByAgent(traces: AgentTrace[]) {
  const groups = new Map<string, AgentTrace[]>();

  traces.forEach((trace) => {
    const agent = trace.agent;
    if (!groups.has(agent)) {
      groups.set(agent, []);
    }
    groups.get(agent)!.push(trace);
  });

  return groups;
}

/** Individual trace item */
function TraceItem({ trace }: { trace: AgentTrace }) {
  const agentConfig = getAgentConfig(trace.agent);

  return (
    <div className="flex flex-col gap-1 rounded-md bg-background/60 p-2 text-xs border border-border/50">
      <div className="flex items-center gap-2">
        <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-sm", agentConfig.bgColor)}>
          {getActionIcon(trace.action)}
          <span className={cn("font-medium", agentConfig.color)}>
            {getAgentLabel(trace.agent)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground pl-0.5">
        <span>{getActionLabel(trace.action, trace.tool_name)}</span>
      </div>
      {trace.tool_name && (
        <div className="flex items-center gap-1 pl-0.5">
          <Wrench className="h-2.5 w-2.5 text-muted-foreground/60" />
          <code className="text-[10px] rounded bg-muted px-1 py-0.5 font-mono">
            {trace.tool_name}
          </code>
        </div>
      )}
      {trace.details && (
        <p className="line-clamp-2 pl-0.5 text-muted-foreground/80 text-[11px]">
          {trace.details}
        </p>
      )}
      <div className="flex items-center gap-1 pl-0.5 text-[10px] text-muted-foreground/50">
        <Clock className="h-2.5 w-2.5" />
        {trace.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
    </div>
  );
}

/** Agent group with traces */
function AgentGroupSection({
  agent,
  traces,
  isExpanded,
  onToggle
}: {
  agent: string;
  traces: AgentTrace[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const agentConfig = getAgentConfig(agent);
  const toolCalls = traces.filter(t => t.action === "tool_call").length;
  const completions = traces.filter(t => t.action === "tool_response").length;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
          agentConfig.bgColor,
          "hover:opacity-80"
        )}>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={cn("flex items-center gap-1.5", agentConfig.color)}>
            {agentConfig.icon}
            <span className="font-medium text-xs">{getAgentLabel(agent)}</span>
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {toolCalls > 0 && (
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                <Zap className="h-2 w-2 mr-0.5" />
                {toolCalls}
              </Badge>
            )}
            {completions > 0 && (
              <Badge variant="outline" className="h-4 px-1 text-[9px] text-green-600 border-green-200">
                <CheckCircle className="h-2 w-2 mr-0.5" />
                {completions}
              </Badge>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 mt-1 space-y-1">
          {traces.map((trace) => (
            <TraceItem key={trace.id} trace={trace} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ChatAgentTrace({
  traces,
  isStreaming,
  variant = "default",
  className,
  title,
}: ChatAgentTraceProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set(["orchestrator"]));

  // Group traces by agent
  const tracesByAgent = useMemo(() => groupTracesByAgent(traces), [traces]);

  // Stats
  const uniqueAgents = tracesByAgent.size;
  const totalToolCalls = traces.filter(t => t.action === "tool_call").length;

  // Toggle agent expansion
  const toggleAgent = (agent: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agent)) {
        next.delete(agent);
      } else {
        next.add(agent);
      }
      return next;
    });
  };

  const panelTitle = title || "Agent Activity";

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(variant === "cowork" ? "w-full" : "w-72", className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between gap-2 h-auto py-2"
        >
          <span className="flex items-center gap-2">
            <Activity
              className={cn("h-4 w-4", isStreaming && "animate-pulse text-primary")}
            />
            <span className="font-medium">{panelTitle}</span>
          </span>
          <div className="flex items-center gap-1.5">
            {uniqueAgents > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
                <Users className="h-2.5 w-2.5" />
                {uniqueAgents}
              </Badge>
            )}
            {totalToolCalls > 0 && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {totalToolCalls} calls
              </Badge>
            )}
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-90"
              )}
            />
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea
          className={cn(
            "rounded-md border bg-muted/20",
            variant === "cowork" ? "h-[320px]" : "h-[450px]"
          )}
        >
          <div className="p-2 space-y-2">
            {traces.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className={cn(
                  "h-8 w-8 mx-auto mb-2 text-muted-foreground/40",
                  isStreaming && "animate-pulse"
                )} />
                <p className="text-sm text-muted-foreground">
                  {isStreaming ? "Waiting for activity..." : "No activity yet"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Send a message to start
                </p>
              </div>
            ) : tracesByAgent.size > 1 ? (
              // Multi-agent view - grouped by agent
              Array.from(tracesByAgent.entries()).map(([agent, agentTraces]) => (
                <AgentGroupSection
                  key={agent}
                  agent={agent}
                  traces={agentTraces}
                  isExpanded={expandedAgents.has(agent)}
                  onToggle={() => toggleAgent(agent)}
                />
              ))
            ) : (
              // Single agent - flat list
              <div className="space-y-1">
                {traces.map((trace) => (
                  <TraceItem key={trace.id} trace={trace} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}
