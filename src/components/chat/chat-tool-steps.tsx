"use client";

/**
 * Enhanced tool steps component for chat messages.
 * Shows multi-agent activity with parallel execution visualization,
 * delegation chains, and reasoning phases.
 */

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  Search,
  Brain,
  ArrowRight,
  AlertCircle,
  Users,
  Database,
  FileText,
  Sparkles,
  Target,
  Layers,
  GitBranch,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolStep, ReasoningPhase } from "@/types/chat";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ChatToolStepsProps {
  steps: ToolStep[];
  isStreaming?: boolean;
}

/** Agent display info */
const AGENT_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  orchestrator: {
    label: "Orchestrator",
    icon: <Brain className="h-3 w-3" />,
    color: "text-violet-500",
  },
  entity_researcher: {
    label: "Entity Research",
    icon: <Database className="h-3 w-3" />,
    color: "text-blue-500",
  },
  text_researcher: {
    label: "Text Research",
    icon: <FileText className="h-3 w-3" />,
    color: "text-green-500",
  },
  summary_researcher: {
    label: "Summary Research",
    icon: <Layers className="h-3 w-3" />,
    color: "text-amber-500",
  },
  deep_reasoning: {
    label: "Deep Analysis",
    icon: <Sparkles className="h-3 w-3" />,
    color: "text-purple-500",
  },
  mentor_matcher: {
    label: "Mentor Matching",
    icon: <Target className="h-3 w-3" />,
    color: "text-rose-500",
  },
};

/** Get agent display info */
function getAgentInfo(agentName: string) {
  const normalized = agentName.toLowerCase().replace(/[^a-z_]/g, "");
  return AGENT_INFO[normalized] || {
    label: agentName,
    icon: <Users className="h-3 w-3" />,
    color: "text-muted-foreground",
  };
}

/** Get a human-readable label for a tool name */
function getToolLabel(toolName?: string): string {
  if (!toolName) return "Processing";

  const labels: Record<string, string> = {
    // Graph query tools
    get_graph_schema: "Getting graph schema",
    query_graph: "Querying knowledge graph",
    find_entity: "Finding entity",
    search_text: "Searching text",
    // Search tools
    search_chunks: "Searching documents",
    search_summaries: "Searching summaries",
    search_graph: "Graph-enhanced search",
    search_rag: "RAG search",
    search_natural_language: "Natural language search",
    // Memory tools
    cognee_add: "Storing to memory",
    cognee_search: "Searching memory",
    remember_about_user: "Storing to memory",
    recall_about_user: "Searching memory",
    graphiti_search: "Searching memory",
    // Agent tools (delegation)
    entity_researcher: "Entity researcher",
    text_researcher: "Text researcher",
    summary_researcher: "Summary researcher",
    deep_reasoning: "Deep reasoning",
    mentor_matcher: "Mentor matcher",
  };

  return labels[toolName] || toolName.replace(/_/g, " ");
}

/** Get label for thinking phase */
function getPhaseLabel(phase?: string): { label: string; description: string } {
  const phases: Record<string, { label: string; description: string }> = {
    query_decomposition: {
      label: "Decomposing Query",
      description: "Breaking down the question into sub-questions",
    },
    parallel_research: {
      label: "Parallel Research",
      description: "Executing multiple searches simultaneously",
    },
    evaluation: {
      label: "Evaluating Results",
      description: "Assessing findings and identifying gaps",
    },
    synthesis: {
      label: "Synthesizing",
      description: "Compiling findings into a response",
    },
    final_answer: {
      label: "Formulating Answer",
      description: "Creating the final response",
    },
    planning: {
      label: "Planning",
      description: "Determining the approach",
    },
    reasoning: {
      label: "Reasoning",
      description: "Analyzing information",
    },
    action: {
      label: "Taking Action",
      description: "Executing the plan",
    },
  };
  return phases[phase || ""] || { label: "Thinking", description: "" };
}

/** Render thinking content with proper type handling */
function ThinkingContent({ content, phase }: { content: unknown; phase?: string }) {
  if (!content) return null;
  const text = String(content);
  const { description } = getPhaseLabel(phase);

  return (
    <div className="space-y-1">
      {description && (
        <p className="text-xs text-muted-foreground/70 italic">{description}</p>
      )}
      <div className="text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap text-xs">
        {text.length > 400 ? `${text.slice(0, 400)}...` : text}
      </div>
    </div>
  );
}

/** Get icon for step type */
function StepIcon({ step }: { step: ToolStep }) {
  if (step.status === "running") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  }

  if (step.status === "error") {
    return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  }

  switch (step.type) {
    case "tool_call":
    case "tool_result":
      return <Search className="h-3.5 w-3.5 text-muted-foreground" />;
    case "delegate":
      return <ArrowRight className="h-3.5 w-3.5 text-primary" />;
    case "thinking":
      return <Brain className="h-3.5 w-3.5 text-violet-500" />;
    default:
      return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

/** Single step item with enhanced styling */
function StepItem({ step, isParallel }: { step: ToolStep; isParallel?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = step.toolArgs || step.result;
  const agentInfo = getAgentInfo(step.agent);

  // Determine the label based on step type
  let label: string;
  if (step.type === "delegate") {
    const targetAgent = getAgentInfo(step.toolName || step.agent);
    label = `Delegating to ${targetAgent.label}`;
  } else if (step.type === "tool_result") {
    label = `${getToolLabel(step.toolName)} completed`;
  } else if (step.type === "thinking") {
    const phase = (step.toolArgs?.phase as string) || "";
    label = getPhaseLabel(phase).label;
  } else {
    label = getToolLabel(step.toolName);
  }

  // Extract query for display
  const query = step.toolArgs?.query || step.toolArgs?.name || step.toolArgs?.cypher_query;
  const hasQuery = query !== undefined && query !== null;

  if (!hasDetails) {
    return (
      <div className={cn(
        "flex items-center gap-2 py-1 text-xs",
        isParallel && "pl-4 border-l-2 border-primary/20"
      )}>
        <StepIcon step={step} />
        <span className="text-muted-foreground">{label}</span>
        {step.status === "completed" && (
          <Check className="h-3 w-3 text-green-500" />
        )}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className={cn(
        "flex w-full items-center gap-2 py-1 text-xs hover:bg-muted/30 rounded px-1 -mx-1 transition-colors",
        isParallel && "pl-4 border-l-2 border-primary/20"
      )}>
        {isOpen ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <StepIcon step={step} />
        <span className="flex-1 text-left text-muted-foreground truncate">{label}</span>
        {hasQuery && (
          <span className="text-[10px] text-muted-foreground/60 truncate max-w-[120px]">
            {String(query).slice(0, 30)}...
          </span>
        )}
        {step.status === "completed" && (
          <Check className="h-3 w-3 text-green-500 shrink-0" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={cn(
          "mt-1 rounded-md bg-muted/30 p-2 text-xs space-y-2",
          isParallel && "ml-4"
        )}>
          {/* Agent badge */}
          <div className="flex items-center gap-1.5">
            <span className={cn("flex items-center gap-1", agentInfo.color)}>
              {agentInfo.icon}
              <span className="font-medium text-[10px]">{agentInfo.label}</span>
            </span>
          </div>

          {step.type === "thinking" ? (
            <ThinkingContent
              content={step.toolArgs?.content}
              phase={step.toolArgs?.phase as string}
            />
          ) : step.toolArgs ? (
            <div className="text-muted-foreground font-mono text-[11px] bg-background/50 rounded p-1.5">
              {hasQuery ? (
                <div>
                  <span className="text-muted-foreground/60">Query: </span>
                  <span>{String(query)}</span>
                </div>
              ) : (
                <div className="truncate">
                  {JSON.stringify(step.toolArgs).slice(0, 150)}
                </div>
              )}
            </div>
          ) : null}
          {step.result && (
            <div className="text-muted-foreground max-h-24 overflow-y-auto text-[11px] bg-background/50 rounded p-1.5">
              <span className="text-muted-foreground/60">Result: </span>
              {step.result.length > 150 ? `${step.result.slice(0, 150)}...` : step.result}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Group steps by agent and parallel execution */
function groupStepsByAgent(steps: ToolStep[]) {
  const groups: Map<string, ToolStep[]> = new Map();

  steps.forEach((step) => {
    const key = step.agent;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(step);
  });

  return groups;
}

/** Agent group component */
function AgentGroup({ agent, steps, isExpanded, onToggle }: {
  agent: string;
  steps: ToolStep[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const agentInfo = getAgentInfo(agent);
  const runningCount = steps.filter(s => s.status === "running").length;
  const completedCount = steps.filter(s => s.status === "completed").length;

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className={cn("flex items-center gap-1.5", agentInfo.color)}>
          {agentInfo.icon}
          <span className="font-medium text-xs">{agentInfo.label}</span>
        </span>
        <div className="flex-1" />
        {runningCount > 0 ? (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            {runningCount} running
          </Badge>
        ) : (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-green-600 border-green-200">
            <Check className="h-2.5 w-2.5 mr-0.5" />
            {completedCount}
          </Badge>
        )}
      </button>
      {isExpanded && (
        <div className="px-3 py-2 space-y-0.5 border-t">
          {steps.map((step) => (
            <StepItem key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatToolSteps({ steps, isStreaming }: ChatToolStepsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set(["orchestrator"]));

  // Group steps by agent
  const stepsByAgent = useMemo(() => groupStepsByAgent(steps), [steps]);

  // Calculate stats
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.status === "completed").length;
  const runningSteps = steps.filter(s => s.status === "running").length;
  const hasRunning = runningSteps > 0;

  // Progress percentage
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Count unique agents
  const activeAgents = new Set(steps.map(s => s.agent)).size;

  if (!steps || steps.length === 0) {
    // Show a simple "thinking" indicator when streaming but no steps yet
    if (isStreaming) {
      return (
        <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-muted/30 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-muted-foreground">Thinking...</span>
        </div>
      );
    }
    return null;
  }

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

  // Summary text
  const summaryParts: string[] = [];
  if (hasRunning) {
    summaryParts.push(`${runningSteps} running`);
  }
  if (completedSteps > 0) {
    summaryParts.push(`${completedSteps} completed`);
  }
  if (activeAgents > 1) {
    summaryParts.push(`${activeAgents} agents`);
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mb-3">
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg bg-muted/40 hover:bg-muted/60 px-3 py-2 transition-colors">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        {/* Icon and status */}
        <div className="flex items-center gap-2">
          {hasRunning ? (
            <div className="relative">
              <GitBranch className="h-4 w-4 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
          ) : (
            <Check className="h-4 w-4 text-green-500" />
          )}
          <span className="text-sm font-medium">
            {hasRunning ? "Researching" : "Research Complete"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 max-w-[120px]">
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-1.5">
          {activeAgents > 1 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
              <Users className="h-2.5 w-2.5" />
              {activeAgents}
            </Badge>
          )}
          <Badge
            variant={hasRunning ? "default" : "outline"}
            className={cn(
              "h-5 px-1.5 text-[10px]",
              !hasRunning && "text-green-600 border-green-200"
            )}
          >
            {hasRunning ? (
              <>
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                {completedSteps}/{totalSteps}
              </>
            ) : (
              <>
                <Check className="h-2.5 w-2.5 mr-0.5" />
                {totalSteps} steps
              </>
            )}
          </Badge>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 space-y-2">
          {/* Show grouped by agent if multiple agents */}
          {stepsByAgent.size > 1 ? (
            Array.from(stepsByAgent.entries()).map(([agent, agentSteps]) => (
              <AgentGroup
                key={agent}
                agent={agent}
                steps={agentSteps}
                isExpanded={expandedAgents.has(agent)}
                onToggle={() => toggleAgent(agent)}
              />
            ))
          ) : (
            // Single agent - show flat list
            <div className="border rounded-md px-3 py-2 space-y-0.5">
              {steps.map((step) => (
                <StepItem key={step.id} step={step} />
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
