"use client";

/**
 * Custom hook for managing Chat v2 state and SSE streaming.
 * Uses the LangGraph orchestrator backend.
 * Handles message history, agent traces, and session persistence.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ChatMessage,
  AgentTrace,
  ChatSession,
  UseChatReturn,
  CitationData,
  AgentActivityData,
  TextChunkData,
  ToolResultData,
  ThinkingData,
  CompleteData,
  ErrorData,
  ToolStep,
  UserContext,
} from "@/types/chat";
import {
  connectChatStreamV2,
  generateMessageId,
  generateTraceId,
} from "@/lib/chat-sse-v2";

// Use separate localStorage keys for v2 to keep sessions isolated
const THREAD_ID_KEY = "chat_v2_thread_id";
const USE_MEMORY_KEY = "chat_v2_use_memory";

interface UseChatOptions {
  userContext?: UserContext;
  selectedTools?: string[];
}

export function useChatV2(options: UseChatOptions = {}): UseChatReturn {
  const { userContext, selectedTools } = options;
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(() => {
    // Initialize from localStorage on client
    if (typeof window !== "undefined") {
      return localStorage.getItem(THREAD_ID_KEY);
    }
    return null;
  });
  const [useMemory, setUseMemory] = useState<boolean>(() => {
    // Initialize from localStorage on client
    if (typeof window !== "undefined") {
      return localStorage.getItem(USE_MEMORY_KEY) === "true";
    }
    return false;
  });
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for streaming accumulation (avoid re-renders during streaming)
  const streamingContentRef = useRef<string>("");
  const streamingCitationsRef = useRef<CitationData[]>([]);
  const streamingStepsRef = useRef<ToolStep[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist threadId to localStorage
  useEffect(() => {
    if (threadId) {
      localStorage.setItem(THREAD_ID_KEY, threadId);
    }
  }, [threadId]);

  // Persist useMemory to localStorage
  useEffect(() => {
    localStorage.setItem(USE_MEMORY_KEY, useMemory.toString());
  }, [useMemory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Handle agent activity events - creates tool steps inline
  const handleAgentActivity = useCallback((data: AgentActivityData) => {
    // Add to traces for the trace panel (keep for backwards compat)
    const trace: AgentTrace = {
      id: generateTraceId(),
      agent: data.agent,
      action: data.action,
      tool_name: data.tool_name,
      details: data.details,
      timestamp: new Date(),
    };
    setTraces((prev) => [...prev, trace]);

    // Create a step for inline display
    const stepType = data.action === "delegate" ? "delegate"
      : data.action === "tool_response" ? "tool_result"
      : data.action === "thinking" ? "thinking"
      : "tool_call";

    const step: ToolStep = {
      id: generateTraceId(),
      type: stepType,
      agent: data.agent,
      toolName: data.tool_name,
      toolArgs: data.tool_args,
      status: stepType === "tool_result" ? "completed" : "running",
      timestamp: new Date(),
    };

    streamingStepsRef.current = [...streamingStepsRef.current, step];

    // Update message with new steps
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.isStreaming) {
        return [
          ...updated.slice(0, -1),
          { ...lastMsg, steps: [...streamingStepsRef.current] },
        ];
      }
      return updated;
    });
  }, []);

  // Handle tool result events - mark steps as completed
  const handleToolResult = useCallback((data: ToolResultData) => {
    // Find the matching tool_call step and mark it completed
    streamingStepsRef.current = streamingStepsRef.current.map((step) => {
      if (
        step.toolName === data.tool_name &&
        step.status === "running"
      ) {
        return {
          ...step,
          status: "completed" as const,
          result: data.result_summary,
        };
      }
      return step;
    });

    // Update message with updated steps
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.isStreaming) {
        return [
          ...updated.slice(0, -1),
          { ...lastMsg, steps: [...streamingStepsRef.current] },
        ];
      }
      return updated;
    });
  }, []);

  // Handle thinking events (from LangGraph ReAct agent)
  const handleThinking = useCallback((data: ThinkingData) => {
    // Add thinking step to show planning/reasoning
    const step: ToolStep = {
      id: generateTraceId(),
      type: "thinking",
      agent: data.agent,
      toolArgs: { phase: data.phase, content: data.content },
      status: "completed",
      timestamp: new Date(),
    };

    streamingStepsRef.current = [...streamingStepsRef.current, step];

    // Also add to traces for the trace panel
    const trace: AgentTrace = {
      id: step.id,
      agent: data.agent,
      action: "thinking",
      details: `[${data.phase.toUpperCase()}] ${data.content.slice(0, 100)}...`,
      timestamp: new Date(),
    };
    setTraces((prev) => [...prev, trace]);

    // Update message with new steps
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.isStreaming) {
        return [
          ...updated.slice(0, -1),
          { ...lastMsg, steps: [...streamingStepsRef.current] },
        ];
      }
      return updated;
    });
  }, []);

  // Handle text chunk events
  const handleTextChunk = useCallback((data: TextChunkData) => {
    streamingContentRef.current += data.chunk;

    // Mark all steps as completed when we start getting text
    streamingStepsRef.current = streamingStepsRef.current.map((step) => ({
      ...step,
      status: "completed" as const,
    }));

    // Update the streaming message in place
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.isStreaming) {
        return [
          ...updated.slice(0, -1),
          {
            ...lastMsg,
            content: streamingContentRef.current,
            steps: [...streamingStepsRef.current],
          },
        ];
      }
      return updated;
    });
  }, []);

  // Handle citation events
  const handleCitation = useCallback((data: CitationData) => {
    // Avoid duplicates
    const exists = streamingCitationsRef.current.some(
      (c) => c.source === data.source
    );
    if (!exists) {
      streamingCitationsRef.current.push(data);
    }
  }, []);

  // Handle complete events
  const handleComplete = useCallback((data: CompleteData) => {
    // Mark all steps as completed
    streamingStepsRef.current = streamingStepsRef.current.map((step) => ({
      ...step,
      status: "completed" as const,
    }));

    // Finalize the streaming message
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.isStreaming) {
        return [
          ...updated.slice(0, -1),
          {
            ...lastMsg,
            content: data.full_message || streamingContentRef.current,
            citations: streamingCitationsRef.current,
            steps: [...streamingStepsRef.current],
            isStreaming: false,
          },
        ];
      }
      return updated;
    });

    // Update thread ID
    if (data.thread_id) {
      setThreadId(data.thread_id);
    }

    setIsStreaming(false);
  }, []);

  // Handle error events
  const handleError = useCallback((data: ErrorData) => {
    setError(data.message);
    setIsStreaming(false);

    // Mark streaming message as failed
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.isStreaming) {
        return [
          ...updated.slice(0, -1),
          {
            ...lastMsg,
            content:
              streamingContentRef.current || "An error occurred while generating the response.",
            isStreaming: false,
          },
        ];
      }
      return updated;
    });
  }, []);

  // Handle connection errors
  const handleConnectionError = useCallback((err: Error) => {
    if (err.name === "AbortError") return;
    setError(err.message);
    setIsStreaming(false);
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Abort any existing connection
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Reset streaming state
      streamingContentRef.current = "";
      streamingCitationsRef.current = [];
      streamingStepsRef.current = [];
      setError(null);
      setTraces([]);

      // Add user message
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      // Add placeholder assistant message for streaming
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      try {
        await connectChatStreamV2(
          {
            message: content.trim(),
            thread_id: threadId ?? undefined,
            user_context: userContext,
            use_memory: useMemory,
            selected_tools: selectedTools && selectedTools.length > 0 ? selectedTools : undefined,
          },
          {
            onAgentActivity: handleAgentActivity,
            onTextChunk: handleTextChunk,
            onCitation: handleCitation,
            onToolResult: handleToolResult,
            onThinking: handleThinking,
            onComplete: handleComplete,
            onError: handleError,
            onConnectionError: handleConnectionError,
          },
          abortControllerRef.current.signal
        );
      } catch (err) {
        // Error already handled by callbacks
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Chat V2 stream error:", err);
        }
      }
    },
    [
      isStreaming,
      threadId,
      userContext,
      useMemory,
      selectedTools,
      handleAgentActivity,
      handleTextChunk,
      handleCitation,
      handleToolResult,
      handleThinking,
      handleComplete,
      handleError,
      handleConnectionError,
    ]
  );

  // Clear chat (keep thread)
  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setTraces([]);
    setError(null);
    setIsStreaming(false);
    streamingContentRef.current = "";
    streamingCitationsRef.current = [];
    streamingStepsRef.current = [];
  }, []);

  // Start new chat (new thread)
  const newChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setTraces([]);
    setError(null);
    setIsStreaming(false);
    setThreadId(null);
    localStorage.removeItem(THREAD_ID_KEY);
    streamingContentRef.current = "";
    streamingCitationsRef.current = [];
    streamingStepsRef.current = [];
  }, []);

  // Build session object
  const session: ChatSession = {
    threadId,
    messages,
    traces,
    isStreaming,
    error,
  };

  return {
    session,
    sendMessage,
    clearChat,
    newChat,
    isConnected: !error,
    useMemory,
    setUseMemory,
  };
}
