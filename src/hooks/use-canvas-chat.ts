"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  ArtifactData,
  ChatRequest,
  UserContext,
  AgentActivityData,
  ToolResultData,
  ThinkingData,
  ToolStep,
} from "@/types/chat";
import type {
  CanvasChatMessage,
  ZoneData,
  CanvasNode,
  CanvasChatAttachment,
  ZoneStatus,
} from "@/types/canvas";
import { connectChatStreamV2, generateMessageId } from "@/lib/chat-sse-v2";
import { useCanvas } from "@/contexts/canvas-context";

interface UseCanvasChatOptions {
  zoneId: string;
  canvasId: string;
  userContext?: UserContext;
  onArtifact?: (artifact: ArtifactData) => void;
  onDocumentCreate?: (details: {
    title: string;
    origin: Record<string, unknown>;
  }) => string | null;
  onDocumentUpdate?: (artifactId: string, content: string) => void;
  onDocumentFinalize?: (artifactId: string, content: string) => void;
}

interface UseCanvasChatReturn {
  data: ZoneData;
  messages: CanvasChatMessage[];
  isStreaming: boolean;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  setAutoArtifacts: (value: boolean) => void;
}

function getZoneNode(nodes: CanvasNode[], zoneId: string) {
  return nodes.find((node) => node.id === zoneId) as CanvasNode | undefined;
}

function buildContextArtifacts(
  nodes: CanvasNode[],
  edges: { source?: string; target?: string }[],
  zoneId: string,
  selectedIds?: string[]
) {
  if (!zoneId) {
    return [];
  }

  const linkedIds = new Set(
    edges
      .filter((edge) => edge.source === zoneId || edge.target === zoneId)
      .map((edge) => (edge.source === zoneId ? edge.target : edge.source))
      .filter((id): id is string => Boolean(id && id !== zoneId))
  );

  const includeIds = selectedIds ? new Set(selectedIds) : linkedIds;

  return nodes
    .filter((node) => includeIds.has(node.id))
    .map((node) => {
      const base = {
        id: node.id,
        title: (node.data as any)?.title,
      } as Record<string, unknown>;

      if (node.type === "zone") {
        const chatData = node.data as ZoneData;
        return {
          ...base,
          artifact_type: "chat_block",
          handoff_summary: chatData.handoffSummary ?? null,
          handoff_recent_messages: chatData.handoffRecentMessages ?? [],
        };
      }

      if (node.type === "tableArtifact") {
        const tableData = node.data as any;
        return {
          ...base,
          artifact_type: "data_table",
          summary: tableData?.summary ?? (tableData?.rowCount ? `${tableData.rowCount} rows` : undefined),
          payload: tableData?.payload,
          origin: tableData?.origin,
        };
      }

      if (node.type === "documentArtifact") {
        const docData = node.data as any;
        return {
          ...base,
          artifact_type: "document",
          summary: docData?.summary,
          payload: docData?.payload,
          origin: docData?.origin,
        };
      }

      if (node.type === "graphEntity") {
        const graphData = node.data as any;
        return {
          ...base,
          artifact_type: "graph",
          summary: graphData?.description,
          payload: {
            entityType: graphData?.entityType,
          },
          origin: graphData?.origin,
        };
      }

      return base;
    });
}

function createMessage(role: "user" | "assistant", content: string, isStreaming = false): CanvasChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    isStreaming,
    timestamp: new Date().toISOString(),
  };
}

function shouldCreateDocument(content: string) {
  if (/^\s*(note|doc|document)\b/i.test(content)) {
    return true;
  }
  return /\b(create|write|draft|make)\s+(a\s+)?(note|doc|document|summary)\b/i.test(content);
}


export function useCanvasChat({
  zoneId,
  canvasId,
  userContext,
  onArtifact,
  onDocumentCreate,
  onDocumentUpdate,
  onDocumentFinalize,
}: UseCanvasChatOptions): UseCanvasChatReturn {
  const { nodes, edges, updateNodeData } = useCanvas();
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef<string>("");
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamingStepsRef = useRef<ToolStep[]>([]);
  const documentTargetRef = useRef<{ id: string; title: string } | null>(null);

  const node = useMemo(() => getZoneNode(nodes, zoneId), [nodes, zoneId]);
  const data = (node?.data ?? {}) as ZoneData;
  const messages = data.messages ?? [];
  const isStreaming = data.isStreaming ?? false;

  const updateChatData = useCallback(
    (updater: (current: ZoneData) => ZoneData) => {
      updateNodeData(zoneId, (current) => {
        const existing = (current ?? {}) as ZoneData;
        return updater(existing);
      });
    },
    [updateNodeData, zoneId]
  );

  const setZoneStatus = useCallback(
    (status: ZoneStatus) => {
      updateChatData((current) => ({
        ...current,
        status,
        lastActivityAt: new Date().toISOString(),
      }));
    },
    [updateChatData]
  );

  const updateStreamingMessage = useCallback(
    (content: string, streaming: boolean, attachments?: CanvasChatAttachment[]) => {
      updateChatData((current) => {
        const nextMessages = [...(current.messages ?? [])];
        const messageId = streamingMessageIdRef.current;
        const index = messageId
          ? nextMessages.findIndex((message) => message.id === messageId)
          : -1;

        if (index >= 0) {
          nextMessages[index] = {
            ...nextMessages[index],
            content,
            isStreaming: streaming,
            attachments: attachments ?? nextMessages[index].attachments,
            steps: [...streamingStepsRef.current],
          };
        }

        return {
          ...current,
          messages: nextMessages,
          isStreaming: streaming,
        };
      });
    },
    [updateChatData]
  );

  const updateSteps = useCallback(() => {
    updateChatData((current) => {
      const nextMessages = [...(current.messages ?? [])];
      const messageId = streamingMessageIdRef.current;
      const index = messageId
        ? nextMessages.findIndex((message) => message.id === messageId)
        : -1;

      if (index >= 0) {
        nextMessages[index] = {
          ...nextMessages[index],
          steps: [...streamingStepsRef.current],
        };
      }

      return {
        ...current,
        messages: nextMessages,
      };
    });
  }, [updateChatData]);

  const markStepsCompleted = useCallback(() => {
    streamingStepsRef.current = streamingStepsRef.current.map((step) => ({
      ...step,
      status: "completed" as const,
    }));
    updateSteps();
  }, [updateSteps]);

  const handleAgentActivity = useCallback(
    (data: AgentActivityData) => {
      const stepType = data.action === "delegate" ? "delegate"
        : data.action === "tool_response" ? "tool_result"
        : data.action === "thinking" ? "thinking"
        : "tool_call";

      const step: ToolStep = {
        id: generateMessageId(),
        type: stepType,
        agent: data.agent,
        toolName: data.tool_name,
        toolArgs: data.tool_args,
        status: stepType === "tool_result" ? "completed" : "running",
        timestamp: new Date(),
      };

      streamingStepsRef.current = [...streamingStepsRef.current, step];
      updateSteps();
      if (stepType === "tool_call" || stepType === "tool_result") {
        setZoneStatus("researching");
      } else if (stepType === "thinking") {
        setZoneStatus("thinking");
      } else if (stepType === "delegate") {
        setZoneStatus("thinking");
      }
    },
    [setZoneStatus, updateSteps]
  );

  const handleToolResult = useCallback(
    (data: ToolResultData) => {
      streamingStepsRef.current = streamingStepsRef.current.map((step) => {
        if (step.toolName === data.tool_name && step.status === "running") {
          return {
            ...step,
            status: "completed",
            result: data.result_summary,
          };
        }
        return step;
      });
      updateSteps();
      setZoneStatus("researching");
    },
    [setZoneStatus, updateSteps]
  );

  const handleThinking = useCallback(
    (data: ThinkingData) => {
      const step: ToolStep = {
        id: generateMessageId(),
        type: "thinking",
        agent: data.agent,
        toolArgs: { phase: data.phase, content: data.content },
        status: "completed",
        timestamp: new Date(),
      };

      streamingStepsRef.current = [...streamingStepsRef.current, step];
      updateSteps();
      setZoneStatus("thinking");
    },
    [setZoneStatus, updateSteps]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) {
        return;
      }

      const userMessage = createMessage("user", content);
      setZoneStatus("thinking");
      const wantsDocument = shouldCreateDocument(content);
      const documentTitle = wantsDocument ? "Draft document" : null;
      const documentOrigin = wantsDocument
        ? {
          type: "assistant_response",
          canvas_id: canvasId,
          chat_block_id: zoneId,
        }
        : null;
      const documentId = wantsDocument && onDocumentCreate && documentOrigin
        ? onDocumentCreate({ title: documentTitle ?? "Untitled document", origin: documentOrigin })
        : null;

      if (documentId) {
        documentTargetRef.current = { id: documentId, title: documentTitle ?? "Untitled document" };
      } else {
        documentTargetRef.current = null;
      }

      const attachments: CanvasChatAttachment[] = documentTargetRef.current
        ? [{
          type: "document",
          artifactId: documentTargetRef.current.id,
          title: documentTargetRef.current.title,
        }]
        : [];

      const assistantMessage: CanvasChatMessage = {
        ...createMessage("assistant", "", true),
        attachments,
        steps: [],
      };
      streamingMessageIdRef.current = assistantMessage.id;
      streamingContentRef.current = "";
      streamingStepsRef.current = [];

      updateChatData((current) => ({
        ...current,
        messages: [...(current.messages ?? []), userMessage, assistantMessage],
        isStreaming: true,
      }));

      const request: ChatRequest = {
        message: content,
        user_context: userContext,
        thread_id: data.threadId ?? undefined,
        canvas_id: canvasId,
        chat_block_id: zoneId,
        auto_artifacts: data.autoArtifacts ?? false,
        context_artifacts: buildContextArtifacts(nodes, edges, zoneId, data.contextArtifactIds),
      };

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await connectChatStreamV2(
          request,
          {
            onTextChunk: (chunk) => {
              streamingContentRef.current += chunk.chunk;
              markStepsCompleted();
              setZoneStatus("drafting");
              if (documentTargetRef.current && onDocumentUpdate) {
                onDocumentUpdate(documentTargetRef.current.id, streamingContentRef.current);
                return;
              }

              updateStreamingMessage(streamingContentRef.current, true);
            },
            onArtifact: (artifact) => {
              onArtifact?.(artifact);
            },
            onAgentActivity: handleAgentActivity,
            onToolResult: handleToolResult,
            onThinking: handleThinking,
            onComplete: (complete) => {
              const finalMessage = complete.full_message || streamingContentRef.current;
              const hasDocumentTarget = Boolean(documentTargetRef.current);
              if (hasDocumentTarget && onDocumentFinalize && documentTargetRef.current) {
                onDocumentFinalize(documentTargetRef.current.id, finalMessage);
              }
              markStepsCompleted();
              setZoneStatus("done");
              updateChatData((current) => ({
                ...current,
                threadId: complete.thread_id ?? current.threadId,
                handoffSummary: complete.handoff_summary ?? current.handoffSummary ?? null,
                handoffRecentMessages:
                  complete.handoff_recent_messages ?? current.handoffRecentMessages,
                isStreaming: false,
                messages: (current.messages ?? []).map((message) =>
                  message.id === streamingMessageIdRef.current
                    ? {
                      ...message,
                      content: hasDocumentTarget ? "" : finalMessage,
                      isStreaming: false,
                      steps: [...streamingStepsRef.current],
                    }
                    : message
                ),
              }));
              streamingMessageIdRef.current = null;
              streamingStepsRef.current = [];
              documentTargetRef.current = null;
            },
            onError: () => {
              const fallbackMessage = documentTargetRef.current
                ? "Document generation failed."
                : streamingContentRef.current;
              setZoneStatus("blocked");
              updateStreamingMessage(fallbackMessage, false);
            },
            onConnectionError: () => {
              const fallbackMessage = documentTargetRef.current
                ? "Document generation failed."
                : streamingContentRef.current;
              setZoneStatus("blocked");
              updateStreamingMessage(fallbackMessage, false);
            },
          },
          abortController.signal
        );
      } catch {
        setZoneStatus("blocked");
        updateStreamingMessage(streamingContentRef.current, false);
      }
    },
    [
      canvasId,
      zoneId,
      data.autoArtifacts,
      data.threadId,
      isStreaming,
      nodes,
      edges,
      onArtifact,
      onDocumentCreate,
      onDocumentFinalize,
      onDocumentUpdate,
      updateChatData,
      updateStreamingMessage,
      markStepsCompleted,
      updateSteps,
      handleAgentActivity,
      handleThinking,
      handleToolResult,
      userContext,
      setZoneStatus,
    ]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const setAutoArtifacts = useCallback(
    (value: boolean) => {
      updateChatData((current) => ({
        ...current,
        autoArtifacts: value,
      }));
    },
    [updateChatData]
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    data,
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    setAutoArtifacts,
  };
}
