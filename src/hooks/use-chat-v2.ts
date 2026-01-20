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
  ArtifactData,
  TodoItem,
  ClarificationPayload,
  ClarificationResponse,
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

function normalizeClarificationPayload(
  artifact: ArtifactData
): ClarificationPayload | null {
  // Use loose typing since payload comes from external API
  const payload = artifact.payload as Record<string, unknown> | undefined;
  if (!payload || !Array.isArray(payload.questions)) return null;

  const questions = (payload.questions as unknown[])
    .map((question, index) => {
      const q = question as Record<string, unknown>;
      const options = Array.isArray(q.options) ? (q.options as unknown[]) : [];
      const normalizedOptions = options
        .map((option, optionIndex) => {
          if (typeof option === "string") {
            const label = option.trim();
            if (!label) return null;
            return {
              id: `option_${optionIndex + 1}`,
              label,
            };
          }
          if (option && typeof option === "object") {
            const opt = option as { id?: string; label?: string; description?: string };
            const label = opt.label?.trim();
            if (!label) return null;
            return {
              id: opt.id || `option_${optionIndex + 1}`,
              label,
              description: opt.description,
            };
          }
          return null;
        })
        .filter(Boolean) as ClarificationPayload["questions"][number]["options"];

      if (!normalizedOptions.length) return null;

      const selectionType =
        (q.selectionType as string | undefined) ||
        (q.selection_type as string | undefined) ||
        ((q.multi_select as boolean | undefined) ? "multi" : "single");

      return {
        id: (q.id as string | undefined) || `question_${index + 1}`,
        prompt: (q.prompt as string | undefined) || `Question ${index + 1}`,
        description: q.description as string | undefined,
        selectionType: selectionType === "multi" ? "multi" : "single",
        allowOther:
          (q.allowOther as boolean | undefined) ??
          (q.allow_other as boolean | undefined) ??
          true,
        required: (q.required as boolean | undefined) ?? true,
        options: normalizedOptions,
      };
    })
    .filter(Boolean) as ClarificationPayload["questions"];

  if (!questions.length) return null;

  return {
    id: (payload.id as string | undefined) || artifact.id || `clarification_${Date.now()}`,
    title: (payload.title as string | undefined) || artifact.title || "Clarifying questions",
    description: (payload.description as string | undefined) || artifact.summary,
    questions,
  };
}

function formatClarificationResponse(
  clarification: ClarificationPayload,
  response: ClarificationResponse
): string {
  const lines: string[] = [];
  lines.push(`Clarification responses (id: ${response.requestId}):`);

  if (response.skipped) {
    lines.push("- Skipped");
    return lines.join("\n");
  }

  const questionById = new Map(
    clarification.questions.map((question) => [question.id, question])
  );

  response.answers.forEach((answer, index) => {
    const question = questionById.get(answer.questionId);
    const label = question?.prompt || `Question ${index + 1}`;
    const optionLabels =
      answer.selectedOptionIds
        ?.map((optionId) =>
          question?.options.find((opt) => opt.id === optionId)?.label
        )
        .filter(Boolean) ?? [];

    const segments = [];
    if (optionLabels.length) segments.push(optionLabels.join(", "));
    if (answer.otherText) segments.push(`Other: ${answer.otherText}`);
    lines.push(`- ${label}: ${segments.join(" | ") || "No selection"}`);
  });

  return lines.join("\n");
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
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [artifacts, setArtifacts] = useState<Map<string, ArtifactData>>(new Map());
  const artifactKeysRef = useRef<Set<string>>(new Set());

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

  // Handle artifact events (clarifications, todos, artifacts)
  const handleArtifact = useCallback((artifact: ArtifactData) => {
    if (artifact.artifact_type === "todo_list") {
      const payload = artifact.payload as { todos?: TodoItem[] } | TodoItem[] | undefined;
      const nextTodos = Array.isArray(payload)
        ? payload
        : payload?.todos ?? [];
      setTodos(nextTodos);
      return;
    }

    if (artifact.artifact_type === "clarification") {
      const clarification = normalizeClarificationPayload(artifact);
      if (!clarification) return;

      abortControllerRef.current?.abort();
      setIsStreaming(false);

      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        const lastMsg = updated[lastIndex];

        if (lastMsg?.role === "assistant" && lastMsg.isStreaming) {
          updated[lastIndex] = {
            ...lastMsg,
            isStreaming: false,
            clarification,
            clarificationStatus: "pending",
          };
          return updated;
        }

        return [
          ...updated,
          {
            id: generateMessageId(),
            role: "assistant",
            content: "",
            timestamp: new Date(),
            clarification,
            clarificationStatus: "pending",
          },
        ];
      });
      return;
    }

    const payload = artifact.payload as { path?: string } | undefined;
    const key = payload?.path || artifact.summary || artifact.id;
    const path = payload?.path || artifact.summary || artifact.id;

    if (path) {
      setMessages((prev) =>
        prev.map((message) => {
          if (
            message.role !== "assistant" ||
            !message.content ||
            !message.content.includes(path)
          ) {
            return message;
          }

          const cleaned = message.content
            .split("\n")
            .filter((line) => !line.includes(path))
            .join("\n")
            .trim();

          return { ...message, content: cleaned };
        })
      );
    }

    setArtifacts((prev) => {
      const next = new Map(prev);
      const isNew = !next.has(key) && !artifactKeysRef.current.has(key);
      next.set(key, artifact);
      if (isNew) {
        artifactKeysRef.current.add(key);
        setMessages((messages) => [
          ...messages,
          {
            id: generateMessageId(),
            role: "assistant",
            content: "",
            timestamp: new Date(),
            artifact,
          },
        ]);
      }
      return next;
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
    async (
      content: string,
      options?: { force?: boolean; skipUserMessage?: boolean }
    ) => {
      if (!content.trim() || (isStreaming && !options?.force)) return;

      if (isStreaming && options?.force) {
        abortControllerRef.current?.abort();
      }

      // Abort any existing connection
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Reset streaming state
      streamingContentRef.current = "";
      streamingCitationsRef.current = [];
      streamingStepsRef.current = [];
      setError(null);
      setTraces([]);

      // Add placeholder assistant message for streaming
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => {
        const next = [...prev];
        if (!options?.skipUserMessage) {
          next.push({
            id: generateMessageId(),
            role: "user",
            content: content.trim(),
            timestamp: new Date(),
          });
        }
        next.push(assistantMessage);
        return next;
      });
      setIsStreaming(true);

      try {
        await connectChatStreamV2(
          {
            message: content.trim(),
            thread_id: threadId ?? undefined,
            user_context: userContext,
            use_memory: useMemory,
            selected_tools: selectedTools && selectedTools.length > 0 ? selectedTools : undefined,
            use_deep_agent: true,
          },
          {
            onAgentActivity: handleAgentActivity,
            onTextChunk: handleTextChunk,
            onCitation: handleCitation,
            onToolResult: handleToolResult,
            onThinking: handleThinking,
            onArtifact: handleArtifact,
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
      handleArtifact,
      handleComplete,
      handleError,
      handleConnectionError,
    ]
  );

  const submitClarification = useCallback(
    async (
      messageId: string,
      clarification: ClarificationPayload,
      response: ClarificationResponse
    ) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                clarificationResponse: response,
                clarificationStatus: response.skipped ? "skipped" : "submitted",
              }
            : message
        )
      );

      const content = formatClarificationResponse(clarification, response);
      await sendMessage(content, { force: true, skipUserMessage: true });
    },
    [sendMessage]
  );

  // Clear chat (keep thread)
  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setTraces([]);
    setError(null);
    setIsStreaming(false);
    setTodos([]);
    setArtifacts(new Map());
    artifactKeysRef.current = new Set();
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
    setTodos([]);
    setArtifacts(new Map());
    artifactKeysRef.current = new Set();
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
    todos,
    artifacts: Array.from(artifacts.values()),
  };

  return {
    session,
    sendMessage,
    submitClarification,
    clearChat,
    newChat,
    isConnected: !error,
    useMemory,
    setUseMemory,
  };
}
