"use client";

/**
 * Inline tool steps component for chat messages.
 * Shows agent activity (tool calls, delegations) in a collapsible format
 * that appears above the message content.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Check, Search, Brain, ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolStep } from "@/types/chat";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChatToolStepsProps {
  steps: ToolStep[];
  isStreaming?: boolean;
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
    // Legacy search tools
    search_chunks: "Searching documents",
    search_summaries: "Searching summaries",
    search_graph: "Searching knowledge graph",
    search_rag: "RAG search",
    // Memory tools
    remember_about_user: "Storing to memory",
    recall_about_user: "Searching memory",
    graphiti_search: "Searching memory",
  };

  return labels[toolName] || toolName.replace(/_/g, " ");
}

/** Get label for thinking phase */
function getThinkingLabel(phase?: string): string {
  const labels: Record<string, string> = {
    planning: "Planning approach",
    reasoning: "Reasoning",
    action: "Deciding action",
    final_answer: "Formulating response",
  };
  return labels[phase || ""] || "Thinking";
}

/** Render thinking content with proper type handling */
function ThinkingContent({ content }: { content: unknown }) {
  if (!content) return null;
  const text = String(content);
  return (
    <div className="text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap">
      {text.length > 300 ? `${text.slice(0, 300)}...` : text}
    </div>
  );
}

/** Get icon for step type */
function StepIcon({ step }: { step: ToolStep }) {
  if (step.status === "running") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  }

  if (step.status === "error") {
    return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  }

  switch (step.type) {
    case "tool_call":
    case "tool_result":
      return <Search className="h-3.5 w-3.5 text-muted-foreground" />;
    case "delegate":
      return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />;
    case "thinking":
      return <Brain className="h-3.5 w-3.5 text-muted-foreground" />;
    default:
      return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

/** Single step item */
function StepItem({ step }: { step: ToolStep }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = step.toolArgs || step.result;

  // Determine the label based on step type
  let label: string;
  if (step.type === "delegate") {
    label = `Delegating to ${step.agent}`;
  } else if (step.type === "tool_result") {
    label = `${getToolLabel(step.toolName)} completed`;
  } else if (step.type === "thinking") {
    const phase = (step.toolArgs?.phase as string) || "";
    label = getThinkingLabel(phase);
  } else {
    label = getToolLabel(step.toolName);
  }

  if (!hasDetails) {
    return (
      <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
        <StepIcon step={step} />
        <span>{label}</span>
        {step.status === "completed" && (
          <Check className="h-3 w-3 text-green-500" />
        )}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <StepIcon step={step} />
        <span className="flex-1 text-left">{label}</span>
        {step.status === "completed" && (
          <Check className="h-3 w-3 text-green-500" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 mt-1 rounded bg-muted/50 p-2 text-xs font-mono">
          {step.type === "thinking" ? (
            <ThinkingContent content={step.toolArgs?.content} />
          ) : step.toolArgs ? (
            <div className="text-muted-foreground">
              <span className="font-semibold">Query: </span>
              {String(step.toolArgs.query || JSON.stringify(step.toolArgs))}
            </div>
          ) : null}
          {step.result && (
            <div className="mt-1 text-muted-foreground max-h-32 overflow-y-auto">
              <span className="font-semibold">Result: </span>
              {step.result.length > 200 ? `${step.result.slice(0, 200)}...` : step.result}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ChatToolSteps({ steps, isStreaming }: ChatToolStepsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!steps || steps.length === 0) {
    // Show a simple "thinking" indicator when streaming but no steps yet
    if (isStreaming) {
      return (
        <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Thinking...</span>
        </div>
      );
    }
    return null;
  }

  // Group steps by agent for cleaner display
  const runningSteps = steps.filter(s => s.status === "running");
  const completedSteps = steps.filter(s => s.status === "completed");
  const hasRunning = runningSteps.length > 0;

  // Summary text
  const summaryText = hasRunning
    ? `Working... (${completedSteps.length}/${steps.length} steps)`
    : `${steps.length} step${steps.length === 1 ? "" : "s"} completed`;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mb-2">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md bg-muted/30 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors">
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {hasRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <Check className="h-3.5 w-3.5 text-green-500" />
        )}
        <span className="text-muted-foreground">{summaryText}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-0.5 border-l-2 border-muted pl-3 ml-1.5">
          {steps.map((step) => (
            <StepItem key={step.id} step={step} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
