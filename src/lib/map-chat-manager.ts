"use client";

/**
 * MapChatManager - Manages concurrent chat sessions for multiple tiles
 *
 * This is a singleton that handles SSE connections, streaming state, and
 * message updates for multiple tiles simultaneously. Each tile gets its
 * own isolated streaming session.
 */

import type {
  ArtifactData,
  ChatRequest,
  UserContext,
  AgentActivityData,
  ToolResultData,
  ThinkingData,
  ToolStep,
} from "@/types/chat";
import type { MapChatMessage, TileStatus, TileArtifact } from "@/types/map";
import { connectChatStreamV2, generateMessageId } from "@/lib/chat-sse-v2";

// Timeout constants
const INITIAL_RESPONSE_TIMEOUT_MS = 30000;
const STREAM_IDLE_TIMEOUT_MS = 60000;

// Throttle constants
const STATUS_UPDATE_THROTTLE_MS = 300;
const MESSAGE_UPDATE_THROTTLE_MS = 80;

/**
 * Streaming session state for a single tile
 */
interface TileStreamingSession {
  tileId: string;
  messageId: string;
  content: string;
  steps: ToolStep[];
  abortController: AbortController;
  timeoutId: NodeJS.Timeout | null;
  hasReceivedData: boolean;
  lastActivityTime: number;
  lastStatusUpdateTime: number;
  lastMessageUpdateTime: number;
  messageUpdateTimerId: NodeJS.Timeout | null;
  lastRequest: string | null;
  error: string | null;
}

/**
 * Callbacks to update tile state in the React context
 */
export interface MapChatCallbacks {
  addMessage: (tileId: string, message: MapChatMessage) => void;
  updateMessage: (
    tileId: string,
    messageId: string,
    updates: Partial<MapChatMessage>
  ) => void;
  updateTile: (tileId: string, updates: Record<string, unknown>) => void;
  setTileStatus: (tileId: string, status: TileStatus) => void;
  setTileStreaming: (tileId: string, isStreaming: boolean) => void;
  addArtifact: (tileId: string, artifact: TileArtifact) => void;
  incrementUnreadCount: (tileId: string) => void;
  getActiveTileId: () => string | null;
  getTile: (tileId: string) => {
    threadId?: string | null;
    autoArtifacts?: boolean;
    handoffSummary?: string | null;
    handoffRecentMessages?: Array<{ role: string; content: string }>;
    selectedTools?: string[];
  } | undefined;
}

function createMessage(
  role: "user" | "assistant",
  content: string,
  isStreaming = false
): MapChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    isStreaming,
    timestamp: new Date().toISOString(),
  };
}

class MapChatManagerClass {
  private sessions: Map<string, TileStreamingSession> = new Map();
  private callbacks: MapChatCallbacks | null = null;

  /**
   * Initialize the manager with callbacks to update React state
   */
  setCallbacks(callbacks: MapChatCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Check if a tile is currently streaming
   */
  isStreaming(tileId: string): boolean {
    return this.sessions.has(tileId);
  }

  /**
   * Get the current error for a tile (if any)
   */
  getError(tileId: string): string | null {
    return this.sessions.get(tileId)?.error ?? null;
  }

  /**
   * Get the last request for a tile (for retry functionality)
   */
  getLastRequest(tileId: string): string | null {
    // We need to store this even after session ends
    return this.sessions.get(tileId)?.lastRequest ?? null;
  }

  /**
   * Stop streaming for a tile
   */
  stopStreaming(tileId: string) {
    const session = this.sessions.get(tileId);
    if (!session) return;

    this.cleanupSession(tileId);

    if (this.callbacks) {
      const content = session.content || "Response stopped by user.";
      this.callbacks.updateMessage(tileId, session.messageId, {
        content,
        isStreaming: false,
        steps: [...session.steps],
      });
      this.callbacks.setTileStreaming(tileId, false);
      this.callbacks.setTileStatus(tileId, "idle");
    }

    this.sessions.delete(tileId);
  }

  /**
   * Send a message in a tile
   */
  async sendMessage(
    tileId: string,
    content: string,
    canvasId: string,
    userContext?: UserContext
  ): Promise<void> {
    if (!this.callbacks) {
      console.error("[MapChatManager] Callbacks not initialized");
      return;
    }

    if (!content.trim()) return;

    // If already streaming in this tile, don't start another
    if (this.sessions.has(tileId)) {
      console.warn(`[MapChatManager] Tile ${tileId} is already streaming`);
      return;
    }

    const callbacks = this.callbacks;
    const tile = callbacks.getTile(tileId);

    // Create user message
    const userMessage = createMessage("user", content);
    callbacks.addMessage(tileId, userMessage);

    // Create assistant message placeholder
    const assistantMessage: MapChatMessage = {
      ...createMessage("assistant", "", true),
      steps: [],
    };
    callbacks.addMessage(tileId, assistantMessage);

    // Create session
    const session: TileStreamingSession = {
      tileId,
      messageId: assistantMessage.id,
      content: "",
      steps: [],
      abortController: new AbortController(),
      timeoutId: null,
      hasReceivedData: false,
      lastActivityTime: Date.now(),
      lastStatusUpdateTime: 0,
      lastMessageUpdateTime: 0,
      messageUpdateTimerId: null,
      lastRequest: content,
      error: null,
    };

    this.sessions.set(tileId, session);

    // Set initial state
    callbacks.setTileStreaming(tileId, true);
    callbacks.setTileStatus(tileId, "thinking");

    // Start timeout
    this.resetTimeout(tileId);

    // Build request
    const request: ChatRequest = {
      message: content,
      user_context: userContext,
      thread_id: tile?.threadId ?? undefined,
      canvas_id: canvasId,
      chat_block_id: tileId,
      auto_artifacts: tile?.autoArtifacts ?? false,
      selected_tools:
        tile?.selectedTools && tile.selectedTools.length > 0
          ? tile.selectedTools
          : undefined,
    };

    try {
      await connectChatStreamV2(
        request,
        {
          onTextChunk: (chunk) => this.handleTextChunk(tileId, chunk.chunk),
          onArtifact: (artifact) => this.handleArtifact(tileId, artifact),
          onAgentActivity: (data) => this.handleAgentActivity(tileId, data),
          onToolResult: (data) => this.handleToolResult(tileId, data),
          onThinking: (data) => this.handleThinking(tileId, data),
          onComplete: (complete) => this.handleComplete(tileId, complete),
          onError: (error) => this.handleError(tileId, error),
          onConnectionError: (error) => this.handleConnectionError(tileId, error),
        },
        session.abortController.signal
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // User cancelled - not an error
        return;
      }

      console.error(`[MapChatManager] Uncaught error for tile ${tileId}:`, error);
      this.handleError(tileId, {
        message: error instanceof Error ? error.message : "Unknown error",
        recoverable: true,
      });
    }
  }

  private cleanupSession(tileId: string) {
    const session = this.sessions.get(tileId);
    if (!session) return;

    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
      session.timeoutId = null;
    }

    if (session.messageUpdateTimerId) {
      clearTimeout(session.messageUpdateTimerId);
      session.messageUpdateTimerId = null;
    }

    session.abortController.abort();
  }

  private resetTimeout(tileId: string) {
    const session = this.sessions.get(tileId);
    if (!session) return;

    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
    }

    session.lastActivityTime = Date.now();

    const timeout = session.hasReceivedData
      ? STREAM_IDLE_TIMEOUT_MS
      : INITIAL_RESPONSE_TIMEOUT_MS;

    session.timeoutId = setTimeout(() => {
      this.handleTimeout(tileId);
    }, timeout);
  }

  private handleTimeout(tileId: string) {
    const session = this.sessions.get(tileId);
    if (!session || !this.callbacks) return;

    const reason = session.hasReceivedData
      ? "No data received for too long"
      : "No initial response received";

    console.error(`[MapChatManager] Timeout for tile ${tileId}: ${reason}`);
    session.error = `Request timed out: ${reason}`;

    this.cleanupSession(tileId);

    const errorContent = session.content || "Request timed out. Please try again.";
    this.callbacks.updateMessage(tileId, session.messageId, {
      content: errorContent,
      isStreaming: false,
      steps: [...session.steps],
    });

    this.callbacks.setTileStreaming(tileId, false);
    this.callbacks.setTileStatus(tileId, "blocked");

    this.sessions.delete(tileId);
  }

  private throttledUpdateStatus(tileId: string, status: TileStatus) {
    const session = this.sessions.get(tileId);
    if (!session || !this.callbacks) return;

    const now = Date.now();
    if (now - session.lastStatusUpdateTime >= STATUS_UPDATE_THROTTLE_MS) {
      session.lastStatusUpdateTime = now;
      this.callbacks.setTileStatus(tileId, status);
    }
  }

  private throttledUpdateMessage(tileId: string) {
    const session = this.sessions.get(tileId);
    if (!session || !this.callbacks) return;

    const now = Date.now();
    const elapsed = now - session.lastMessageUpdateTime;

    const doUpdate = () => {
      const s = this.sessions.get(tileId);
      if (!s || !this.callbacks) return;

      s.lastMessageUpdateTime = Date.now();
      this.callbacks.updateMessage(tileId, s.messageId, {
        content: s.content,
        isStreaming: true,
        steps: [...s.steps],
      });
    };

    if (elapsed >= MESSAGE_UPDATE_THROTTLE_MS) {
      if (session.messageUpdateTimerId) {
        clearTimeout(session.messageUpdateTimerId);
        session.messageUpdateTimerId = null;
      }
      doUpdate();
    } else if (!session.messageUpdateTimerId) {
      session.messageUpdateTimerId = setTimeout(() => {
        const s = this.sessions.get(tileId);
        if (s) {
          s.messageUpdateTimerId = null;
          doUpdate();
        }
      }, MESSAGE_UPDATE_THROTTLE_MS - elapsed);
    }
  }

  private handleTextChunk(tileId: string, chunk: string) {
    const session = this.sessions.get(tileId);
    if (!session) return;

    session.hasReceivedData = true;
    this.resetTimeout(tileId);

    session.content += chunk;

    // Mark all steps as completed when we start receiving text
    session.steps = session.steps.map((step) => ({
      ...step,
      status: "completed" as const,
    }));

    this.throttledUpdateStatus(tileId, "drafting");
    this.throttledUpdateMessage(tileId);
  }

  private handleAgentActivity(tileId: string, data: AgentActivityData) {
    const session = this.sessions.get(tileId);
    if (!session) return;

    session.hasReceivedData = true;
    this.resetTimeout(tileId);

    const stepType =
      data.action === "delegate"
        ? "delegate"
        : data.action === "tool_response"
        ? "tool_result"
        : data.action === "thinking"
        ? "thinking"
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

    session.steps = [...session.steps, step];

    if (stepType === "tool_call" || stepType === "tool_result") {
      this.throttledUpdateStatus(tileId, "researching");
    } else if (stepType === "thinking" || stepType === "delegate") {
      this.throttledUpdateStatus(tileId, "thinking");
    }

    this.throttledUpdateMessage(tileId);
  }

  private handleToolResult(tileId: string, data: ToolResultData) {
    const session = this.sessions.get(tileId);
    if (!session) return;

    session.hasReceivedData = true;
    this.resetTimeout(tileId);

    session.steps = session.steps.map((step) => {
      if (step.toolName === data.tool_name && step.status === "running") {
        return {
          ...step,
          status: "completed" as const,
          result: data.result_summary,
        };
      }
      return step;
    });

    this.throttledUpdateStatus(tileId, "researching");
    this.throttledUpdateMessage(tileId);
  }

  private handleThinking(tileId: string, data: ThinkingData) {
    const session = this.sessions.get(tileId);
    if (!session) return;

    session.hasReceivedData = true;
    this.resetTimeout(tileId);

    const step: ToolStep = {
      id: generateMessageId(),
      type: "thinking",
      agent: data.agent,
      toolArgs: { phase: data.phase, content: data.content },
      status: "completed",
      timestamp: new Date(),
    };

    session.steps = [...session.steps, step];
    this.throttledUpdateStatus(tileId, "thinking");
    this.throttledUpdateMessage(tileId);
  }

  private handleArtifact(tileId: string, artifact: ArtifactData) {
    const session = this.sessions.get(tileId);
    if (!session || !this.callbacks) return;

    session.hasReceivedData = true;
    this.resetTimeout(tileId);

    const tileArtifact: TileArtifact = {
      id: artifact.id || generateMessageId(),
      type:
        artifact.artifact_type === "data_table"
          ? "table"
          : artifact.artifact_type === "graph"
          ? "graph"
          : "document",
      title: artifact.title,
      content: artifact.payload,
      summary: artifact.summary,
      createdAt: artifact.created_at
        ? new Date(artifact.created_at * 1000).toISOString()
        : new Date().toISOString(),
      isPinned: false,
      origin: artifact.origin as TileArtifact["origin"],
    };

    this.callbacks.addArtifact(tileId, tileArtifact);
  }

  private handleComplete(
    tileId: string,
    complete: {
      full_message?: string;
      thread_id?: string;
      handoff_summary?: string | null;
      handoff_recent_messages?: Array<{ role: string; content: string }>;
    }
  ) {
    const session = this.sessions.get(tileId);
    if (!session || !this.callbacks) return;

    this.cleanupSession(tileId);

    const finalMessage = complete.full_message || session.content;
    const finalSteps = session.steps.map((step) => ({
      ...step,
      status: "completed" as const,
    }));

    // Update tile with thread info
    const tile = this.callbacks.getTile(tileId);
    this.callbacks.updateTile(tileId, {
      threadId: complete.thread_id ?? tile?.threadId,
      handoffSummary: complete.handoff_summary ?? tile?.handoffSummary ?? null,
      handoffRecentMessages:
        complete.handoff_recent_messages ?? tile?.handoffRecentMessages,
    });

    // Finalize message
    this.callbacks.updateMessage(tileId, session.messageId, {
      content: finalMessage,
      isStreaming: false,
      steps: finalSteps,
    });

    this.callbacks.setTileStreaming(tileId, false);
    this.callbacks.setTileStatus(tileId, "done");

    // Increment unread count if this tile is not currently active
    const activeTileId = this.callbacks.getActiveTileId();
    if (activeTileId !== tileId) {
      this.callbacks.incrementUnreadCount(tileId);
    }

    this.sessions.delete(tileId);
  }

  private handleError(tileId: string, error: { message: string; code?: string; recoverable: boolean }) {
    const session = this.sessions.get(tileId);
    if (!session || !this.callbacks) return;

    console.error(`[MapChatManager] Stream error for tile ${tileId}:`, error);
    session.error = error.message || "An error occurred";

    this.cleanupSession(tileId);

    const fallbackMessage =
      session.content || "An error occurred. Please try again.";

    this.callbacks.updateMessage(tileId, session.messageId, {
      content: fallbackMessage,
      isStreaming: false,
      steps: [...session.steps],
    });

    this.callbacks.setTileStreaming(tileId, false);
    this.callbacks.setTileStatus(tileId, "blocked");

    this.sessions.delete(tileId);
  }

  private handleConnectionError(tileId: string, error: Error) {
    const session = this.sessions.get(tileId);
    if (!session || !this.callbacks) return;

    console.error(`[MapChatManager] Connection error for tile ${tileId}:`, error);
    session.error = error.message || "Connection failed";

    this.cleanupSession(tileId);

    const fallbackMessage =
      session.content || "Connection failed. Please retry.";

    this.callbacks.updateMessage(tileId, session.messageId, {
      content: fallbackMessage,
      isStreaming: false,
      steps: [...session.steps],
    });

    this.callbacks.setTileStreaming(tileId, false);
    this.callbacks.setTileStatus(tileId, "blocked");

    this.sessions.delete(tileId);
  }

  /**
   * Cleanup all sessions (e.g., on unmount)
   */
  cleanup() {
    for (const tileId of this.sessions.keys()) {
      this.cleanupSession(tileId);
    }
    this.sessions.clear();
  }
}

// Singleton instance
export const MapChatManager = new MapChatManagerClass();
