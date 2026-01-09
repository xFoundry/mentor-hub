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

// Citation event data
export interface CitationData {
  source: string;
  content: string;
  confidence: number;
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
}

// Error event data
export interface ErrorData {
  message: string;
  code?: string;
  recoverable: boolean;
}

// Union type for all SSE event data
export type SSEEventData =
  | { type: "agent_activity"; data: AgentActivityData }
  | { type: "text_chunk"; data: TextChunkData }
  | { type: "citation"; data: CitationData }
  | { type: "tool_result"; data: ToolResultData }
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
}

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
  model_config_override?: Record<string, string>;
}

// Hook return type
export interface UseChatReturn {
  session: ChatSession;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  newChat: () => void;
  isConnected: boolean;
}
