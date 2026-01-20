"use client";

import { useState, useMemo } from "react";
import { ChevronRight, Loader2, Check, Search, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolStep } from "@/types/chat";

const INTERNAL_TOOLS = ["increment_retry", "increment retry", "__end__", "__start__"];

interface ChatToolStepsProps {
  steps: ToolStep[];
  isStreaming?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  get_graph_schema: "Graph schema",
  query_graph: "Graph query",
  find_entity: "Entity lookup",
  search_text: "Text search",
  search_chunks: "Documents",
  search_summaries: "Summaries",
  cognee_search: "Memory",
  recall_about_user: "Memory",
  graphiti_search: "Memory",
  get_mentor_hub_sessions: "Sessions",
  get_mentor_hub_team: "Team",
  search_mentor_hub_mentors: "Mentors",
  get_mentor_hub_tasks: "Tasks",
  get_mentor_hub_user_context: "Context",
  firecrawl_scrape: "Web scrape",
  firecrawl_search: "Web search",
  firecrawl_map: "Site map",
  firecrawl_crawl: "Web crawl",
  firecrawl_extract: "Data extract",
  request_clarifications: "Clarify",
};

const PHASE_LABELS: Record<string, string> = {
  planner: "Planning",
  evaluator: "Evaluating",
  synthesizer: "Synthesizing",
  query_decomposition: "Analyzing",
  parallel_research: "Researching",
  evaluation: "Evaluating",
  synthesis: "Synthesizing",
  final_answer: "Finalizing",
  planning: "Planning",
  reasoning: "Reasoning",
  action: "Executing",
};

function getStepInfo(step: ToolStep) {
  if (step.type === "thinking") {
    const phase = String(step.toolArgs?.phase || step.toolName || "");
    return {
      label: PHASE_LABELS[phase] || "Thinking",
      icon: Brain,
      content: String(step.toolArgs?.content || ""),
    };
  }
  const name = step.toolName || "";
  return {
    label: TOOL_LABELS[name] || name.replace(/_/g, " ") || "Processing",
    icon: Search,
    content: "",
  };
}

function StepRow({
  step,
  compact = false,
  isRunning = false,
}: {
  step: ToolStep;
  compact?: boolean;
  isRunning?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { label, icon: Icon, content } = getStepInfo(step);
  const isThinking = step.type === "thinking";
  const hasContent = content.length > 0;
  const agentLabel = step.agent ? step.agent.replace(/_/g, " ") : "";
  const showAgent = agentLabel && agentLabel.toLowerCase() !== "orchestrator";

  // Show content inline when running (auto-expand), or when manually expanded
  const showContent = hasContent && (isRunning || expanded);

  // Truncate content for inline preview
  const previewContent = content.length > 200 ? content.slice(0, 200) + "..." : content;

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isRunning ? "opacity-100" : "opacity-70"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-xs transition-all duration-200",
          compact ? "py-0.5" : "py-1"
        )}
      >
        {/* Status icon with smooth transition */}
        <div className="relative h-3 w-3 shrink-0">
          <div
            className={cn(
              "absolute inset-0 transition-all duration-300",
              isRunning ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}
          >
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          </div>
          <div
            className={cn(
              "absolute inset-0 transition-all duration-300",
              !isRunning ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}
          >
            <Check className="h-3 w-3 text-green-500" />
          </div>
        </div>

        <Icon
          className={cn(
            "h-3 w-3 shrink-0 transition-colors duration-200",
            isRunning ? "text-muted-foreground" : "text-muted-foreground/50"
          )}
        />
        <span
          className={cn(
            "transition-colors duration-200",
            isRunning ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {showAgent ? `${agentLabel}: ` : ""}{label}
          {isRunning && !hasContent && "..."}
        </span>

        {/* Show expand button right next to label for thinking steps with content */}
        {isThinking && hasContent && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-150"
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform duration-200 ease-out",
                (expanded || isRunning) && "rotate-90"
              )}
            />
          </button>
        )}
      </div>

      {/* Inline content - shown when running or expanded */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          showContent ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "ml-5 mb-1.5 p-2 rounded text-[11px] whitespace-pre-wrap leading-relaxed transition-colors duration-200",
              isRunning
                ? "bg-primary/5 text-muted-foreground border border-primary/10"
                : "bg-muted/30 text-muted-foreground/80 max-h-32 overflow-y-auto"
            )}
          >
            {isRunning ? previewContent : content}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatToolSteps({ steps, isStreaming }: ChatToolStepsProps) {
  const [expanded, setExpanded] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);

  // Filter to meaningful user-facing steps, exclude internal tools

  const meaningful = useMemo(() => {
    const filtered = steps.filter((s) => {
      if (s.type === "thinking") return true;
      if (s.type === "tool_call") {
        const toolName = s.toolName?.toLowerCase() || "";
        return !INTERNAL_TOOLS.some((t) => toolName.includes(t.toLowerCase()));
      }
      return false;
    });

    // Deduplicate thinking steps - keep only the one with most content for each agent+phase
    const seen = new Map<string, number>(); // key -> index of best step
    const result: typeof filtered = [];

    for (let i = 0; i < filtered.length; i++) {
      const step = filtered[i];

      if (step.type === "thinking") {
        const key = `${step.agent}-${step.toolName || step.toolArgs?.phase}`;
        const existingIdx = seen.get(key);

        if (existingIdx !== undefined) {
          // Compare content length - keep the one with more content
          const existingContent = String(result[existingIdx]?.toolArgs?.content || "");
          const newContent = String(step.toolArgs?.content || "");

          if (newContent.length > existingContent.length) {
            // Replace with better version
            result[existingIdx] = step;
          }
          // Skip adding duplicate
          continue;
        }

        seen.set(key, result.length);
      }

      result.push(step);
    }

    return result;
  }, [steps]);

  const toolSummary = useMemo(() => {
    const counts = new Map<string, number>();
    steps.forEach((step) => {
      if (step.type !== "tool_call") return;
      const name = step.toolName || "tool";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      label: TOOL_LABELS[name] || name.replace(/_/g, " ") || "Tool",
      count,
    }));
  }, [steps]);

  // All steps except the last running one should be considered completed
  // (steps are sequential, only the latest can truly be running)
  const lastRunningIndex = meaningful.findLastIndex((s) => s.status === "running");

  const completed = meaningful.filter(
    (s, i) => s.status === "completed" || (s.status === "running" && i !== lastRunningIndex)
  );
  const running = lastRunningIndex >= 0 ? [meaningful[lastRunningIndex]] : [];

  // Empty state
  if (meaningful.length === 0) {
    if (isStreaming) {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 animate-in fade-in duration-300">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span>Thinking...</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mb-2 space-y-2 text-xs">
      {toolSummary.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-300">
          <button
            type="button"
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="flex items-center gap-1.5 py-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150"
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform duration-200 ease-out",
                toolsExpanded && "rotate-90"
              )}
            />
            <Search className="h-3 w-3 text-primary/70" />
            <span>
              {toolSummary.length} tool{toolSummary.length !== 1 && "s"}
            </span>
          </button>
          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              toolsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="ml-1.5 flex flex-wrap gap-2 border-l border-border/30 pl-2">
                {toolSummary.map((tool) => (
                  <span
                    key={tool.name}
                    className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tool.label} · {tool.count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed - collapsible history */}
      {completed.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-300">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 py-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150"
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform duration-200 ease-out",
                expanded && "rotate-90"
              )}
            />
            <Check className="h-3 w-3 text-green-500/70" />
            <span>
              {completed.length} step{completed.length !== 1 && "s"}
            </span>
          </button>

          {/* Smooth expand/collapse */}
          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="ml-1.5 pl-2 border-l border-border/30">
                {completed.map((step) => (
                  <StepRow key={step.id} step={step} compact isRunning={false} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Running steps */}
      {running.map((step) => (
        <div key={step.id} className="animate-in fade-in slide-in-from-left-2 duration-300">
          <StepRow step={step} isRunning />
        </div>
      ))}

      {/* Streaming indicator */}
      {isStreaming && running.length === 0 && completed.length > 0 && (
        <div className="flex items-center gap-2 py-1 animate-in fade-in duration-300">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-muted-foreground">Processing...</span>
        </div>
      )}
    </div>
  );
}
