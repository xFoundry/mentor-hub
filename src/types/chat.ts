/**
 * Chat types for the AI assistant interface.
 * These types mirror the SSE events from the orchestrator-service.
 */

// SSE Event Types from orchestrator
export type SSEEventType =
  | "agent_activity"
  | "text_chunk"
  | "citation"
  | "tool_result"
  | "thinking"
  | "artifact"
  | "complete"
  | "error"
  | "heartbeat";

// Agent activity event data
export interface AgentActivityData {
  agent: string;
  action: "tool_call" | "tool_response" | "delegate" | "thinking";
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  details?: string;
  timestamp?: number;
}

// Text chunk event data
export interface TextChunkData {
  chunk: string;
  agent: string;
  is_partial: boolean;
}

// Citation event data - Legacy interface (kept for backward compatibility)
export interface LegacyCitationData {
  source: string;
  content: string;
  confidence: number;
}

// Rich citation data with entity information for user-friendly display
export interface RichCitationData {
  source: string; // Unique ID: "task:rec123", "session:rec456"
  entityType: string; // "task" | "session" | "team" | "mentor" | "document" | "entity"
  displayName: string; // Human-readable: "Complete project proposal"
  content: string; // Tooltip content / description
  confidence: number;
  groupKey: string; // For grouping: "tasks", "sessions", "documents"
  sourceNumber?: number; // For inline [source:N] citation markers
  metadata?: {
    status?: string;
    dueDate?: string;
    assignee?: string;
    mentor?: string;
    team?: string;
    excerpt?: string;
    memberCount?: number;
    cohorts?: string[];
    scheduledStart?: string;
    taskStatuses?: Record<string, number>;
    resultCount?: number;
    entityType?: string;
    relationshipCount?: number;
    [key: string]: unknown;
  };
}

// CitationData now uses the rich format (backend sends snake_case, we transform)
export type CitationData = RichCitationData;

// Grouped citations for display
export interface CitationGroup {
  groupKey: string;
  displayLabel: string; // "Tasks", "Sessions", "Documents"
  citations: RichCitationData[];
}

// Tool result event data
export interface ToolResultData {
  agent: string;
  tool_name: string;
  result_summary?: string;
  success: boolean;
}

// Complete event data (final response)
export interface CompleteData {
  status: string;
  thread_id?: string;
  full_message: string;
  citations: CitationData[];
  agent_trace: AgentActivityData[];
  handoff_summary?: string | null;
  handoff_recent_messages?: { role: string; content: string }[];
}

// Error event data
export interface ErrorData {
  message: string;
  code?: string;
  recoverable: boolean;
}

// Thinking event data (from PlanReActPlanner)
export interface ThinkingData {
  phase: "planning" | "reasoning" | "action" | "final_answer";
  content: string;
  agent: string;
  timestamp?: number;
}

// Artifact event data
export interface ArtifactData {
  id: string;
  artifact_type: "data_table" | "document" | "chat_block" | "graph" | string;
  title: string;
  summary?: string;
  payload: unknown;
  origin?: Record<string, unknown>;
  created_at?: number;
}

// Union type for all SSE event data
export type SSEEventData =
  | { type: "agent_activity"; data: AgentActivityData }
  | { type: "text_chunk"; data: TextChunkData }
  | { type: "citation"; data: CitationData }
  | { type: "tool_result"; data: ToolResultData }
  | { type: "thinking"; data: ThinkingData }
  | { type: "artifact"; data: ArtifactData }
  | { type: "complete"; data: CompleteData }
  | { type: "error"; data: ErrorData }
  | { type: "heartbeat"; data: { timestamp: number } };

// Chat UI Types

/** A single step in the agent's work (tool call, delegation, etc.) */
export interface ToolStep {
  id: string;
  type: "tool_call" | "tool_result" | "delegate" | "thinking";
  agent: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  result?: string;
  status: "running" | "completed" | "error";
  timestamp: Date;
  /** Parent agent that delegated this step (for sub-agent tracking) */
  parentAgent?: string;
  /** Parallel execution group ID (steps with same groupId execute together) */
  parallelGroupId?: string;
}

/** Reasoning phases from the orchestrator */
export type ReasoningPhase =
  | "query_decomposition"
  | "parallel_research"
  | "evaluation"
  | "synthesis"
  | "final_answer"
  | "planning"
  | "reasoning"
  | "action";

/** Agent types in the multi-agent system */
export type AgentType =
  | "orchestrator"
  | "entity_researcher"
  | "text_researcher"
  | "summary_researcher"
  | "deep_reasoning"
  | "mentor_matcher";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CitationData[];
  /** Tool steps executed while generating this message */
  steps?: ToolStep[];
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AgentTrace {
  id: string;
  agent: string;
  action: string;
  tool_name?: string;
  details?: string;
  timestamp: Date;
}

export interface ChatSession {
  threadId: string | null;
  messages: ChatMessage[];
  traces: AgentTrace[];
  isStreaming: boolean;
  error: string | null;
}

// Request/Response types for API

export interface UserContext {
  name?: string;
  email?: string;
  role?: string;
  teams?: string[];
  cohort?: string;
  auth0_id?: string;
}

export interface ChatRequest {
  message: string;
  tenant_id?: string;
  user_id?: string;
  user_context?: UserContext;
  session_id?: string;
  thread_id?: string;
  group_ids?: string[];
  use_memory?: boolean;
  canvas_id?: string;
  chat_block_id?: string;
  auto_artifacts?: boolean;
  context_artifacts?: Record<string, unknown>[];
  model_config_override?: Record<string, string>;
}

// Hook return type
export interface UseChatReturn {
  session: ChatSession;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  newChat: () => void;
  isConnected: boolean;
  useMemory: boolean;
  setUseMemory: (value: boolean) => void;
}
