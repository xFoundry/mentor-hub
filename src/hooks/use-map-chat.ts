"use client";

import { useCallback, useRef } from "react";
import type { UserContext } from "@/types/chat";
import type { MapChatMessage, TileData } from "@/types/map";
import { useMap } from "@/contexts/map-context";
import { MapChatManager } from "@/lib/map-chat-manager";

interface UseMapChatOptions {
  tileId: string;
  canvasId: string;
  userContext?: UserContext;
}

interface UseMapChatReturn {
  tile: TileData | undefined;
  messages: MapChatMessage[];
  isStreaming: boolean;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  retry: () => void;
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Hook to manage chat for a specific map tile.
 *
 * This is a thin wrapper around MapChatManager, which handles all the
 * streaming logic with proper per-tile isolation for concurrent chats.
 */
export function useMapChat({
  tileId,
  canvasId,
  userContext,
}: UseMapChatOptions): UseMapChatReturn {
  const { tiles } = useMap();

  // Store the last request for retry functionality
  const lastRequestRef = useRef<string | null>(null);

  // Get tile data from context
  const tile = tiles.find((t) => t.id === tileId);
  const messages = tile?.messages ?? [];
  const isStreaming = tile?.isStreaming ?? false;

  // Send message - delegates to manager
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !tileId) return;

      lastRequestRef.current = content;
      await MapChatManager.sendMessage(tileId, content, canvasId, userContext);
    },
    [tileId, canvasId, userContext]
  );

  // Stop streaming - delegates to manager
  const stopStreaming = useCallback(() => {
    if (!tileId) return;
    MapChatManager.stopStreaming(tileId);
  }, [tileId]);

  // Retry last request
  const retry = useCallback(() => {
    const lastRequest = lastRequestRef.current;
    if (lastRequest && !isStreaming && tileId) {
      MapChatManager.sendMessage(tileId, lastRequest, canvasId, userContext);
    }
  }, [isStreaming, tileId, canvasId, userContext]);

  // Error state - check manager and tile status
  const hasError = tile?.status === "blocked";
  const errorMessage = hasError ? MapChatManager.getError(tileId) : null;

  return {
    tile,
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    retry,
    hasError,
    errorMessage,
  };
}
