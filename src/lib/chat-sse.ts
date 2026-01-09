/**
 * SSE (Server-Sent Events) utilities for the chat interface.
 * Handles streaming responses from the orchestrator service.
 */

import type {
  SSEEventData,
  ChatRequest,
  AgentActivityData,
  TextChunkData,
  CitationData,
  ToolResultData,
  CompleteData,
  ErrorData,
} from "@/types/chat";

export interface SSECallbacks {
  onAgentActivity?: (data: AgentActivityData) => void;
  onTextChunk?: (data: TextChunkData) => void;
  onCitation?: (data: CitationData) => void;
  onToolResult?: (data: ToolResultData) => void;
  onComplete?: (data: CompleteData) => void;
  onError?: (data: ErrorData) => void;
  onConnectionError?: (error: Error) => void;
}

/**
 * Parse SSE event from raw text.
 * SSE format: "event: <type>\ndata: <json>\n\n"
 */
function parseSSEEvent(eventText: string): SSEEventData | null {
  const lines = eventText.trim().split("\n");
  let eventType: string | null = null;
  let eventData: string | null = null;

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      eventData = line.slice(6);
    }
  }

  if (!eventType || !eventData) {
    return null;
  }

  try {
    const data = JSON.parse(eventData);
    return { type: eventType, data } as SSEEventData;
  } catch {
    console.error("Failed to parse SSE data:", eventData);
    return null;
  }
}

/**
 * Connect to the chat stream endpoint and process SSE events.
 *
 * @param request - Chat request parameters
 * @param callbacks - Event handlers for different SSE event types
 * @param signal - AbortSignal for cancellation
 */
export async function connectChatStream(
  request: ChatRequest,
  callbacks: SSECallbacks,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat request failed: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body available");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const events = buffer.split("\n\n");
      // Keep the last incomplete event in the buffer
      buffer = events.pop() || "";

      for (const eventText of events) {
        if (!eventText.trim()) continue;

        const event = parseSSEEvent(eventText);
        if (!event) continue;

        // Dispatch to appropriate callback
        switch (event.type) {
          case "agent_activity":
            callbacks.onAgentActivity?.(event.data as AgentActivityData);
            break;
          case "text_chunk":
            callbacks.onTextChunk?.(event.data as TextChunkData);
            break;
          case "citation":
            callbacks.onCitation?.(event.data as CitationData);
            break;
          case "tool_result":
            callbacks.onToolResult?.(event.data as ToolResultData);
            break;
          case "complete":
            callbacks.onComplete?.(event.data as CompleteData);
            break;
          case "error":
            callbacks.onError?.(event.data as ErrorData);
            break;
          // heartbeat events are ignored
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Stream was cancelled, not an error
      return;
    }
    callbacks.onConnectionError?.(
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Generate a unique message ID.
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a unique trace ID.
 */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
