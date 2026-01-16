"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  MessageSquare,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  MoreHorizontal,
  Plus,
  FileText,
  Table,
  Network,
  Camera,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/contexts/canvas-context";
import { useCanvasChat } from "@/hooks/use-canvas-chat";
import type { ArtifactData, UserContext as ChatUserContext } from "@/types/chat";
import type { CanvasNode, ChatBlockData, DocumentArtifactData } from "@/types/canvas";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import {
  ChatMessage,
  ChatMessageAvatar,
  ChatMessageAvatarAssistantIcon,
  ChatMessageAvatarUserIcon,
  ChatMessageContainer,
  ChatMessageContent,
  ChatMessageHeader,
  ChatMessageMarkdown,
  ChatMessageTimestamp,
} from "@/components/simple-ai/chat-message";
import {
  ChatMessageArea,
  ChatMessageAreaContent,
  ChatMessageAreaScrollButton,
} from "@/components/simple-ai/chat-message-area";
import {
  ChatInput,
  ChatInputEditor,
  ChatInputGroupAddon,
  ChatInputSubmitButton,
  useChatInput,
} from "@/components/simple-ai/chat-input";
import { ChatToolSteps } from "@/components/chat/chat-tool-steps";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const ARTIFACT_RADIUS = 320;
const ARTIFACT_RING_STEP = 220;
const ARTIFACT_MIN_STEPS = 10;
const NODE_GUTTER = 40;
const ARTIFACT_PREVIEW_LIMIT = 6;

const NODE_SIZES: Record<string, { width: number; height: number }> = {
  chatBlock: { width: 320, height: 220 },
  tableArtifact: { width: 320, height: 140 },
  documentArtifact: { width: 340, height: 220 },
  graphEntity: { width: 240, height: 140 },
};

const getNodeSize = (type?: string) => {
  if (!type) return NODE_SIZES.documentArtifact;
  return NODE_SIZES[type] ?? NODE_SIZES.documentArtifact;
};

type ChatBlockOption = { id: string; title: string };

function splitDocumentTitle(content: string) {
  const match = /^\s*#\s+(.+?)\s*\r?\n/.exec(content);
  if (!match) {
    return { title: null, body: content };
  }
  const title = match[1].trim();
  const body = content.slice(match[0].length).trimStart();
  return { title, body };
}

function estimateTokensFromText(value: string) {
  return Math.ceil(Math.max(1, value.length) / 4);
}

function estimateTokensFromNode(node: { type?: string; data?: any }) {
  if (!node?.data) return 0;
  const data = node.data as Record<string, unknown>;
  if (node.type === "chatBlock") {
    const summary = (data.handoffSummary as string | undefined) ?? "";
    const recent = Array.isArray(data.handoffRecentMessages)
      ? data.handoffRecentMessages.map((message) => `${message.role}: ${message.content}`).join(" ")
      : "";
    return estimateTokensFromText(`${summary} ${recent}`.trim());
  }
  if (node.type === "documentArtifact") {
    const payload = data.payload as { content?: string } | undefined;
    const content = payload?.content ?? (data.summary as string | undefined) ?? "";
    return estimateTokensFromText(content.slice(0, 4000));
  }
  if (node.type === "tableArtifact") {
    const payload = data.payload as { rows?: unknown[] } | undefined;
    const preview = payload?.rows ? JSON.stringify(payload.rows.slice(0, 5)) : "";
    return estimateTokensFromText(preview);
  }
  if (node.type === "graphEntity") {
    const description = (data.description as string | undefined) ?? "";
    return estimateTokensFromText(description);
  }
  return estimateTokensFromText(JSON.stringify(data).slice(0, 2000));
}

export function CanvasChatSidebar() {
  const {
    canvasId,
    nodes,
    edges,
    addNode,
    addEdge,
    updateNodeData,
    activeChatBlockId,
    setActiveChatBlockId,
    chatPanelOpen,
    setChatPanelOpen,
    snapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    setFocusedNodeId,
    resetCanvas,
  } = useCanvas();
  const { userContext } = useEffectiveUser();
  const [isDraggingContext, setIsDraggingContext] = useState(false);
  const [panelsOpen, setPanelsOpen] = useState(false);

  const chatBlocks = useMemo<ChatBlockOption[]>(
    () =>
      nodes
        .filter((node) => node.type === "chatBlock")
        .map((node) => ({
          id: node.id,
          title: (node.data as { title?: string })?.title ?? "Chat Block",
        })),
    [nodes]
  );
  const nodeTitleById = useMemo(() => {
    return new Map(
      nodes.map((node) => [node.id, (node.data as { title?: string })?.title])
    );
  }, [nodes]);

  useEffect(() => {
    if (!activeChatBlockId && chatBlocks[0]) {
      setActiveChatBlockId(chatBlocks[0].id);
    }
  }, [activeChatBlockId, chatBlocks, setActiveChatBlockId]);

  const activeChatId = activeChatBlockId ?? chatBlocks[0]?.id ?? "";

  const linkedNodeIds = useMemo(() => {
    if (!activeChatId) return [];
    return edges
      .filter((edge) => edge.source === activeChatId || edge.target === activeChatId)
      .map((edge) => (edge.source === activeChatId ? edge.target : edge.source))
      .filter((nodeId): nodeId is string => Boolean(nodeId && nodeId !== activeChatId));
  }, [activeChatId, edges]);

  const linkedNodes = useMemo(
    () => nodes.filter((node) => linkedNodeIds.includes(node.id)),
    [linkedNodeIds, nodes]
  );

  const artifactPreviews = useMemo(() => {
    return linkedNodes
      .filter((node) => node.type && node.type !== "chatBlock")
      .map((node, index) => {
        const data = node.data as Record<string, unknown>;
        const createdAt = typeof data?.createdAt === "string" ? Date.parse(data.createdAt) : 0;
        const title = (data?.title as string | undefined) ?? "Untitled";
        let summary = "";
        let label = "Artifact";
        let Icon = FileText;

        if (node.type === "tableArtifact") {
          const payload = data?.payload as { rows?: unknown[]; tables?: unknown[] } | undefined;
          const rowCount = (data?.rowCount as number | undefined) ?? payload?.rows?.length ?? 0;
          const tableCount = Array.isArray(payload?.tables) ? payload?.tables.length : 0;
          label = "Table";
          Icon = Table;
          summary = tableCount > 1
            ? `${tableCount} sources · ${rowCount} rows`
            : rowCount
              ? `${rowCount} rows`
              : "Structured rows";
        } else if (node.type === "documentArtifact") {
          const payload = data?.payload as { content?: string } | undefined;
          label = "Document";
          Icon = FileText;
          const raw = (data?.summary as string | undefined) ?? payload?.content ?? "";
          summary = raw ? raw.replace(/\s+/g, " ").slice(0, 120) : "Draft document";
        } else if (node.type === "graphEntity") {
          const description = (data?.description as string | undefined) ?? "";
          label = "Graph";
          Icon = Network;
          summary = description
            ? description.replace(/\s+/g, " ").slice(0, 120)
            : (data?.entityType as string | undefined) ?? "Graph entity";
        }

        return {
          node,
          title,
          summary,
          label,
          Icon,
          createdAt,
          order: index,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt || a.order - b.order);
  }, [linkedNodes]);

  const anchorNode = useMemo(
    () => nodes.find((entry) => entry.id === activeChatId),
    [activeChatId, nodes]
  );
  const anchorSize = useMemo(() => {
    if (anchorNode?.width && anchorNode?.height) {
      return { width: anchorNode.width, height: anchorNode.height };
    }
    return NODE_SIZES.chatBlock;
  }, [anchorNode?.height, anchorNode?.width]);
  const anchorCenter = useMemo(() => {
    const position = anchorNode?.position ?? { x: 0, y: 0 };
    return {
      x: position.x + anchorSize.width / 2,
      y: position.y + anchorSize.height / 2,
    };
  }, [anchorNode?.position, anchorSize.height, anchorSize.width]);

  const existingRects = useMemo(() => {
    return nodes
      .map((node) => {
        if (!node.position || !Number.isFinite(node.position.x)) return null;
        const fallback = getNodeSize(node.type);
        const width = node.width ?? fallback.width;
        const height = node.height ?? fallback.height;
        return {
          x: node.position.x,
          y: node.position.y,
          width,
          height,
        };
      })
      .filter((rect): rect is { x: number; y: number; width: number; height: number } => Boolean(rect));
  }, [nodes]);
  const pendingRectsRef = useRef<Array<{ x: number; y: number; width: number; height: number }>>([]);

  useEffect(() => {
    pendingRectsRef.current = [];
  }, [nodes]);

  const chatUserContext: ChatUserContext | undefined = useMemo(() => {
    if (!userContext) return undefined;
    return {
      name: userContext.fullName || userContext.name,
      email: userContext.email,
      role: userContext.type === "staff" ? "Staff"
        : userContext.type === "mentor" ? "Mentor"
        : userContext.type === "student" ? "Participant"
        : undefined,
      cohort: userContext.cohort?.shortName,
      auth0_id: userContext.auth0Id,
    };
  }, [userContext]);

  const getNextArtifactPosition = useCallback(
    (nodeType: string) => {
      const size = NODE_SIZES[nodeType] ?? NODE_SIZES.documentArtifact;
      const occupiedRects = [...existingRects, ...pendingRectsRef.current];

      const overlaps = (
        candidate: { x: number; y: number; width: number; height: number },
        rect: { x: number; y: number; width: number; height: number }
      ) => {
        return (
          candidate.x < rect.x + rect.width + NODE_GUTTER &&
          candidate.x + candidate.width + NODE_GUTTER > rect.x &&
          candidate.y < rect.y + rect.height + NODE_GUTTER &&
          candidate.y + candidate.height + NODE_GUTTER > rect.y
        );
      };

      for (let ring = 0; ring < 6; ring += 1) {
        const radius = ARTIFACT_RADIUS + ring * ARTIFACT_RING_STEP;
        const steps = Math.max(ARTIFACT_MIN_STEPS, Math.ceil((2 * Math.PI * radius) / 260));
        const step = (2 * Math.PI) / steps;

        for (let i = 0; i < steps; i += 1) {
          const angle = step * i;
          const candidateCenter = {
            x: anchorCenter.x + Math.cos(angle) * radius,
            y: anchorCenter.y + Math.sin(angle) * radius,
          };
          const candidate = {
            x: candidateCenter.x - size.width / 2,
            y: candidateCenter.y - size.height / 2,
            width: size.width,
            height: size.height,
          };

          const isFree = occupiedRects.every((rect) => !overlaps(candidate, rect));
          if (isFree) {
            pendingRectsRef.current = [...pendingRectsRef.current, candidate];
            return { x: candidate.x, y: candidate.y };
          }
        }
      }

      const fallback = {
        x: anchorCenter.x + ARTIFACT_RADIUS,
        y: anchorCenter.y,
      };
      const fallbackRect = {
        x: fallback.x - size.width / 2,
        y: fallback.y - size.height / 2,
        width: size.width,
        height: size.height,
      };
      pendingRectsRef.current = [...pendingRectsRef.current, fallbackRect];
      return { x: fallbackRect.x, y: fallbackRect.y };
    },
    [anchorCenter.x, anchorCenter.y, existingRects]
  );

  const ensureEdge = useCallback(
    (targetId: string) => {
      if (edges.some((edge) => edge.source === activeChatId && edge.target === targetId)) {
        return;
      }
      addEdge({
        id: `edge_${activeChatId}_${targetId}`,
        source: activeChatId,
        target: targetId,
        data: { kind: "context" },
      });
    },
    [addEdge, activeChatId, edges]
  );

  const updateTableGroup = useCallback(
    (nodeId: string, artifact: ArtifactData) => {
      const payload = artifact.payload as { rows?: Array<Record<string, unknown>>; columns?: string[] } | undefined;
      const rows = Array.isArray(payload?.rows) ? payload?.rows ?? [] : [];
      const columns = payload?.columns ?? (rows[0] ? Object.keys(rows[0]) : []);
      const origin = artifact.origin as { tool_name?: string; source_number?: number } | undefined;
      const entry = {
        id: artifact.id,
        title: artifact.title,
        rows,
        columns,
        sourceNumber: origin?.source_number,
      };

      updateNodeData(nodeId, (current) => {
        const existingPayload = (current as any)?.payload as {
          rows?: Array<Record<string, unknown>>;
          columns?: string[];
          tables?: Array<typeof entry>;
        } | undefined;

        let tables = existingPayload?.tables ?? [];
        if (!tables.length && existingPayload?.rows) {
          tables = [
            {
              id: nodeId,
              title: (current as any)?.title ?? "Data Table",
              rows: existingPayload.rows,
              columns: existingPayload.columns ?? (existingPayload.rows[0] ? Object.keys(existingPayload.rows[0]) : []),
              sourceNumber: undefined,
            },
          ];
        }

        const hasEntry = tables.some((table) => table.id === entry.id);
        const nextTables = hasEntry
          ? tables.map((table) => (table.id === entry.id ? entry : table))
          : [...tables, entry];
        const totalRows = nextTables.reduce((sum, table) => sum + table.rows.length, 0);

        return {
          ...(current ?? {}),
          rowCount: totalRows,
          payload: { tables: nextTables },
          origin: (current as any)?.origin ?? artifact.origin,
        } as typeof current;
      });
    },
    [updateNodeData]
  );

  const updateDocumentGroup = useCallback(
    (nodeId: string, artifact: ArtifactData) => {
      const payload = artifact.payload as { content?: string; format?: string } | undefined;
      const content = typeof payload?.content === "string" ? payload.content : "";
      const origin = artifact.origin as { tool_name?: string; source_number?: number; query?: string } | undefined;
      const entry = {
        id: artifact.id,
        title: artifact.title,
        content,
        summary: artifact.summary,
        sourceNumber: origin?.source_number,
        query: origin?.query,
      };

      updateNodeData(nodeId, (current) => {
        const existingPayload = (current as any)?.payload as {
          content?: string;
          documents?: Array<typeof entry>;
        } | undefined;

        let documents = existingPayload?.documents ?? [];
        if (!documents.length && existingPayload?.content) {
          documents = [
            {
              id: nodeId,
              title: (current as any)?.title ?? "Document",
              content: existingPayload.content,
              summary: (current as any)?.summary,
              sourceNumber: undefined,
              query: undefined,
            },
          ];
        }

        const hasEntry = documents.some((doc) => doc.id === entry.id);
        const nextDocuments = hasEntry
          ? documents.map((doc) => (doc.id === entry.id ? entry : doc))
          : [...documents, entry];

        const nextSummary = entry.summary
          ?? (entry.content ? entry.content.replace(/\s+/g, " ").trim().slice(0, 160) : undefined)
          ?? (current as any)?.summary;

        return {
          ...(current ?? {}),
          summary: nextSummary,
          payload: {
            ...(existingPayload ?? {}),
            documents: nextDocuments,
          },
          origin: (current as any)?.origin ?? artifact.origin,
        } as typeof current;
      });
    },
    [updateNodeData]
  );

  const handleArtifact = useCallback(
    (artifact: ArtifactData) => {
      if (!activeChatId) return;
      const artifactId = artifact.id || `artifact_${Date.now()}`;
      const existingById = nodes.find((node) => node.id === artifactId);
      const isTable = artifact.artifact_type === "data_table";
      const isDocument = artifact.artifact_type === "document";
      const isGraph = artifact.artifact_type === "graph";
      const origin = artifact.origin as { tool_name?: string; chat_block_id?: string; type?: string } | undefined;

      if (existingById) {
        const wasTitleEdited = Boolean((existingById.data as any)?.titleEdited);
        updateNodeData(artifactId, (current) => ({
          ...current,
          title: wasTitleEdited ? (current as any)?.title : artifact.title ?? (current as any)?.title,
          payload: artifact.payload ?? (current as any)?.payload,
          summary: artifact.summary ?? (current as any)?.summary,
          origin: artifact.origin ?? (current as any)?.origin,
        }));
        ensureEdge(artifactId);
        return;
      }

      if (isDocument && origin?.type === "assistant_response") {
        const candidateDocs = nodes.filter((node) => {
          if (node.type !== "documentArtifact") return false;
          const nodeOrigin = (node.data as any)?.origin as { chat_block_id?: string; type?: string } | undefined;
          return nodeOrigin?.chat_block_id === activeChatId && nodeOrigin?.type === "assistant_response";
        });
        const latestDoc = candidateDocs.sort((a, b) => {
          const aTime = (a.data as any)?.createdAt ? Date.parse((a.data as any).createdAt) : 0;
          const bTime = (b.data as any)?.createdAt ? Date.parse((b.data as any).createdAt) : 0;
          return bTime - aTime;
        })[0];
        if (latestDoc) {
          const wasTitleEdited = Boolean((latestDoc.data as any)?.titleEdited);
          updateNodeData(latestDoc.id, (current) => ({
            ...current,
            title: wasTitleEdited ? (current as any)?.title : artifact.title ?? (current as any)?.title,
            payload: artifact.payload ?? (current as any)?.payload,
            summary: artifact.summary ?? (current as any)?.summary,
            origin: artifact.origin ?? (current as any)?.origin,
          }));
          ensureEdge(latestDoc.id);
          return;
        }
      }

      if (isDocument && origin?.tool_name) {
        const groupedDoc = nodes.find((node) => {
          if (node.type !== "documentArtifact") return false;
          const nodeOrigin = (node.data as any)?.origin as { tool_name?: string; chat_block_id?: string } | undefined;
          return nodeOrigin?.tool_name === origin.tool_name && nodeOrigin?.chat_block_id === activeChatId;
        });
        if (groupedDoc) {
          updateDocumentGroup(groupedDoc.id, artifact);
          ensureEdge(groupedDoc.id);
          return;
        }
      }

      if (isTable && origin?.tool_name) {
        const groupedNode = nodes.find((node) => {
          if (node.type !== "tableArtifact") return false;
          const nodeOrigin = (node.data as any)?.origin as { tool_name?: string; chat_block_id?: string } | undefined;
          return nodeOrigin?.tool_name === origin.tool_name && nodeOrigin?.chat_block_id === activeChatId;
        });
        if (groupedNode) {
          updateTableGroup(groupedNode.id, artifact);
          ensureEdge(groupedNode.id);
          return;
        }
      }

      if (isGraph) {
        const payload = artifact.payload as {
          nodes?: Array<{ id: string; title?: string; label?: string; type?: string; description?: string; sourceNumber?: number }>;
          edges?: Array<{ id?: string; source: string; target: string; label?: string }>;
        } | undefined;

        const graphNodes = payload?.nodes ?? [];
        const graphEdges = payload?.edges ?? [];
        const nodeIdMap = new Map<string, string>();
        const knownNodeIds = new Set(nodes.map((node) => node.id));

        graphNodes.forEach((node) => {
          const canvasId = `graph_${node.id}`;
          nodeIdMap.set(node.id, canvasId);

          if (knownNodeIds.has(canvasId)) {
            updateNodeData(canvasId, (current) => ({
              ...current,
              title: node.title ?? node.label ?? (current as any)?.title,
              entityType: node.type ?? (current as any)?.entityType,
              description: node.description ?? (current as any)?.description,
              origin: artifact.origin ?? (current as any)?.origin,
              sourceNumber: node.sourceNumber ?? (current as any)?.sourceNumber,
            }));
            ensureEdge(canvasId);
            return;
          }

          addNode({
            id: canvasId,
            type: "graphEntity",
            position: getNextArtifactPosition("graphEntity"),
            data: {
              title: node.title ?? node.label ?? node.id,
              entityType: node.type,
              description: node.description,
              origin: artifact.origin,
              sourceNumber: node.sourceNumber,
            },
          });
          knownNodeIds.add(canvasId);
          ensureEdge(canvasId);
        });

        graphEdges.forEach((edge) => {
          const sourceId = nodeIdMap.get(edge.source) ?? `graph_${edge.source}`;
          const targetId = nodeIdMap.get(edge.target) ?? `graph_${edge.target}`;
          if (sourceId === targetId) return;

          if (!knownNodeIds.has(sourceId)) {
            addNode({
              id: sourceId,
              type: "graphEntity",
              position: getNextArtifactPosition("graphEntity"),
              data: {
                title: edge.source,
                origin: artifact.origin,
              },
            });
            ensureEdge(sourceId);
            knownNodeIds.add(sourceId);
          }

          if (!knownNodeIds.has(targetId)) {
            addNode({
              id: targetId,
              type: "graphEntity",
              position: getNextArtifactPosition("graphEntity"),
              data: {
                title: edge.target,
                origin: artifact.origin,
              },
            });
            ensureEdge(targetId);
            knownNodeIds.add(targetId);
          }

          const edgeId = edge.id ?? `graph_edge_${sourceId}_${targetId}_${edge.label ?? "rel"}`;
          if (!edges.some((existing) => existing.id === edgeId)) {
            addEdge({
              id: edgeId,
              source: sourceId,
              target: targetId,
              label: edge.label,
              data: { kind: "graph" },
            });
          }
        });

        return;
      }

      const payload = artifact.payload as { rows?: unknown[] } | undefined;
      const rowCount = payload?.rows && Array.isArray(payload.rows) ? payload.rows.length : undefined;
      const artifactPosition = getNextArtifactPosition(isTable ? "tableArtifact" : "documentArtifact");

      const nodeData = {
        title: artifact.title,
        rowCount,
        payload: artifact.payload,
        origin: artifact.origin,
        createdAt: artifact.created_at ? new Date(artifact.created_at * 1000).toISOString() : undefined,
        ...(isTable ? {} : { summary: artifact.summary }),
      };

      addNode({
        id: artifactId,
        type: isTable ? "tableArtifact" : "documentArtifact",
        position: artifactPosition,
        data: nodeData,
      });

      ensureEdge(artifactId);
    },
    [
      activeChatId,
      addNode,
      ensureEdge,
      getNextArtifactPosition,
      nodes,
      edges,
      updateNodeData,
      updateTableGroup,
      updateDocumentGroup,
    ]
  );

  const { messages, isStreaming, sendMessage, stopStreaming, setAutoArtifacts, data } = useCanvasChat({
    chatBlockId: activeChatId,
    canvasId,
    userContext: chatUserContext,
    onArtifact: handleArtifact,
    onDocumentCreate: ({ title, origin }) => {
      if (!activeChatId) return null;
      const artifactId = `artifact_document_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const position = getNextArtifactPosition("documentArtifact");

      addNode({
        id: artifactId,
        type: "documentArtifact",
        position,
        data: {
          title: title || "Untitled document",
          summary: "Drafting document...",
          payload: { content: "", format: "markdown" },
          origin,
          createdAt: new Date().toISOString(),
        },
      });

      ensureEdge(artifactId);
      return artifactId;
    },
    onDocumentUpdate: (artifactId, content) => {
      const { title, body } = splitDocumentTitle(content);
      updateNodeData(artifactId, (current) => {
        const doc = (current ?? {}) as DocumentArtifactData;
        const hasTitle = Boolean(title);
        const shouldUpdateTitle = hasTitle && !doc.titleEdited;
        const nextTitle = shouldUpdateTitle && title ? title : doc.title;
        return {
          ...doc,
          title: nextTitle,
          payload: {
            ...(doc as any)?.payload,
            content: hasTitle ? body : content,
            format: "markdown",
          },
        } as DocumentArtifactData;
      });
    },
    onDocumentFinalize: (artifactId, content) => {
      const { title, body } = splitDocumentTitle(content);
      const summary = body.replace(/\s+/g, " ").trim().slice(0, 160);
      updateNodeData(artifactId, (current) => {
        const doc = (current ?? {}) as DocumentArtifactData;
        const hasTitle = Boolean(title);
        const shouldUpdateTitle = hasTitle && !doc.titleEdited;
        const nextTitle = shouldUpdateTitle && title ? title : doc.title;
        return {
          ...doc,
          title: nextTitle,
          summary: summary || doc.summary,
          payload: {
            ...(doc as any)?.payload,
            content: hasTitle ? body : content,
            format: "markdown",
          },
        } as DocumentArtifactData;
      });
    },
  });

  const contextArtifactIds = data?.contextArtifactIds;
  const isContextAuto = contextArtifactIds === undefined;
  const includedContextIds = useMemo(() => {
    if (!activeChatId) return new Set<string>();
    if (isContextAuto) {
      return new Set(linkedNodeIds);
    }
    return new Set(contextArtifactIds ?? []);
  }, [activeChatId, contextArtifactIds, isContextAuto, linkedNodeIds]);

  const totalContextTokens = useMemo(() => {
    if (!activeChatId) return 0;
    return linkedNodes
      .filter((node) => includedContextIds.has(node.id))
      .reduce((sum, node) => sum + estimateTokensFromNode(node), 0);
  }, [activeChatId, includedContextIds, linkedNodes]);

  const updateContextSelection = useCallback(
    (nextIds: string[] | undefined) => {
      if (!activeChatId) return;
      updateNodeData(activeChatId, (current) => ({
        ...(current ?? {}),
        contextArtifactIds: nextIds,
      }));
    },
    [activeChatId, updateNodeData]
  );

  const toggleContextArtifact = useCallback(
    (nodeId: string) => {
      if (!activeChatId) return;
      const base = new Set(isContextAuto ? linkedNodeIds : contextArtifactIds ?? []);
      if (base.has(nodeId)) {
        base.delete(nodeId);
      } else {
        base.add(nodeId);
      }
      updateContextSelection(Array.from(base));
    },
    [activeChatId, contextArtifactIds, isContextAuto, linkedNodeIds, updateContextSelection]
  );

  const includeAllContext = useCallback(() => {
    updateContextSelection(undefined);
  }, [updateContextSelection]);

  const clearContext = useCallback(() => {
    updateContextSelection([]);
  }, [updateContextSelection]);

  const handleOpenArtifact = useCallback(
    (node: CanvasNode) => {
      setFocusedNodeId(node.id);
      if (node.type === "documentArtifact" || node.type === "tableArtifact") {
        updateNodeData(node.id, (current) => ({
          ...current,
          isExpanded: true,
        }));
      }
    },
    [setFocusedNodeId, updateNodeData]
  );

  const handleCreateSnapshot = useCallback(() => {
    createSnapshot();
  }, [createSnapshot]);

  const handleClearCanvas = useCallback(() => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Clear the entire canvas? This cannot be undone.");
      if (!confirmed) return;
    }
    resetCanvas();
  }, [resetCanvas]);

  const handleClearChat = useCallback(() => {
    if (!activeChatId) return;
    if (isStreaming) {
      stopStreaming();
    }
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Clear this chat? This cannot be undone.");
      if (!confirmed) return;
    }
    updateNodeData(activeChatId, (current) => {
      const chatData = (current ?? {}) as ChatBlockData;
      return {
        ...chatData,
        threadId: null,
        messages: [],
        isStreaming: false,
        handoffSummary: null,
        handoffRecentMessages: [],
      };
    });
  }, [activeChatId, isStreaming, stopStreaming, updateNodeData]);

  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      stopStreaming();
    }
    const nextIndex = chatBlocks.length + 1;
    const chatId = `chat-block-${Date.now()}`;
    const position = getNextArtifactPosition("chatBlock");
    addNode({
      id: chatId,
      type: "chatBlock",
      position,
      data: {
        title: `Chat Block ${nextIndex}`,
        description: "Start a new conversation here.",
        messages: [],
        autoArtifacts: false,
        contextArtifactIds: undefined,
        isStreaming: false,
        threadId: null,
        handoffSummary: null,
        handoffRecentMessages: [],
      },
    });
    setActiveChatBlockId(chatId);
    setChatPanelOpen(true);
  }, [
    addNode,
    chatBlocks.length,
    getNextArtifactPosition,
    isStreaming,
    setActiveChatBlockId,
    setChatPanelOpen,
    stopStreaming,
  ]);

  const handleContextDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const nodeId = event.dataTransfer.getData("text/plain");
      if (nodeId) {
        const base = new Set(isContextAuto ? linkedNodeIds : contextArtifactIds ?? []);
        base.add(nodeId);
        updateContextSelection(Array.from(base));
      }
      setIsDraggingContext(false);
    },
    [contextArtifactIds, isContextAuto, linkedNodeIds, updateContextSelection]
  );

  const handleContextDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingContext(true);
  }, []);

  const handleContextDragLeave = useCallback(() => {
    setIsDraggingContext(false);
  }, []);

  const { value, onChange, handleSubmit, parsed } = useChatInput({
    onSubmit: (parsedValue) => {
      sendMessage(parsedValue.content);
    },
  });

  const sidebarWidth = chatPanelOpen ? "w-[420px]" : "w-12";

  return (
    <aside
      className={cn(
        "h-full shrink-0 border-l bg-card/95 backdrop-blur-xl transition-[width] duration-200 ease-out",
        sidebarWidth
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
            {chatPanelOpen && (
              <div>
                <div className="text-sm font-semibold">Canvas Chat</div>
                <div className="text-xs text-muted-foreground">
                  {chatBlocks.find((block) => block.id === activeChatId)?.title ?? "Chat block"}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {chatPanelOpen && (
              <button
                type="button"
                onClick={() => setAutoArtifacts(!(data?.autoArtifacts ?? false))}
                className="flex items-center gap-1 text-[11px] text-muted-foreground"
              >
                {data?.autoArtifacts ? (
                  <ToggleRight className="h-4 w-4 text-primary" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
                Auto
              </button>
            )}
            {chatPanelOpen && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleNewChat}>
                    <Plus className="mr-2 h-4 w-4" />
                    New chat block
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleClearChat}>
                    Clear chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleClearCanvas}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear canvas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setChatPanelOpen(!chatPanelOpen)}
            >
              <ChevronLeft
                className={cn("h-4 w-4 transition-transform", !chatPanelOpen && "rotate-180")}
              />
            </Button>
          </div>
        </div>

        {chatPanelOpen ? (
          <>
            <div className="px-3 pt-3">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Active Chat
              </label>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {chatBlocks.map((block) => (
                  <Button
                    key={block.id}
                    variant={block.id === activeChatId ? "default" : "outline"}
                    size="sm"
                    className="h-8"
                    onClick={() => setActiveChatBlockId(block.id)}
                  >
                    {block.title}
                  </Button>
                ))}
                {!chatBlocks.length && (
                  <div className="text-xs text-muted-foreground">No chat blocks yet.</div>
                )}
              </div>
            </div>

            <div className="px-3 pt-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Workspace
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPanelsOpen((open) => !open)}
                >
                  {panelsOpen ? "Hide panels" : "Show panels"}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => setPanelsOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Context {includedContextIds.size}/{linkedNodes.length || 0}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => setPanelsOpen(true)}
                >
                  <Table className="h-3.5 w-3.5" />
                  Artifacts {artifactPreviews.length}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => setPanelsOpen(true)}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Snapshots {snapshots.length}
                </Button>
              </div>
            </div>

            {panelsOpen ? (
              <div className="px-3 pt-3">
                <div className="max-h-[38vh] space-y-4 overflow-y-auto pr-1">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Context
                      </label>
                      <Badge variant="secondary" className="text-[10px]">
                        ~{totalContextTokens.toLocaleString()} tokens
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {linkedNodes.length ? (
                        linkedNodes.map((node) => {
                          const isIncluded = includedContextIds.has(node.id);
                          const title = (node.data as { title?: string })?.title ?? "Untitled";
                          return (
                            <Button
                              key={node.id}
                              type="button"
                              size="sm"
                              variant={isIncluded ? "secondary" : "outline"}
                              className="h-7 cursor-grab gap-1 text-xs"
                              draggable
                              onClick={() => toggleContextArtifact(node.id)}
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", node.id);
                                event.dataTransfer.effectAllowed = "copy";
                              }}
                            >
                              {title}
                            </Button>
                          );
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Link nodes to this chat to add context.
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() =>
                          isContextAuto
                            ? updateContextSelection([...linkedNodeIds])
                            : updateContextSelection(undefined)
                        }
                        disabled={!linkedNodeIds.length}
                      >
                        {isContextAuto ? "Lock selection" : "Auto include"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={clearContext}
                        disabled={!linkedNodeIds.length}
                      >
                        Clear
                      </Button>
                      {isContextAuto ? (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                          Auto on
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                          Manual
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Artifacts
                      </label>
                      <Badge variant="secondary" className="text-[10px]">
                        {artifactPreviews.length}
                      </Badge>
                    </div>
                    {artifactPreviews.length ? (
                      <>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                          {artifactPreviews.slice(0, ARTIFACT_PREVIEW_LIMIT).map((artifact) => (
                            <button
                              key={artifact.node.id}
                              type="button"
                              onClick={() => handleOpenArtifact(artifact.node)}
                              className={cn(
                                "min-w-[160px] rounded-lg border bg-muted/30 px-3 py-2 text-left transition",
                                "hover:border-primary/40 hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                                  <artifact.Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="text-xs font-medium truncate">{artifact.title}</div>
                              </div>
                              <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                                {artifact.summary}
                              </div>
                              <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                                {artifact.label}
                              </div>
                            </button>
                          ))}
                        </div>
                        {artifactPreviews.length > ARTIFACT_PREVIEW_LIMIT ? (
                          <div className="text-[11px] text-muted-foreground">
                            +{artifactPreviews.length - ARTIFACT_PREVIEW_LIMIT} more artifacts linked.
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Linked artifacts will show up here.
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Snapshots
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={handleCreateSnapshot}
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Save
                      </Button>
                    </div>
                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                      {snapshots.length ? (
                        snapshots.map((snapshot) => (
                          <div
                            key={snapshot.id}
                            className="rounded-lg border bg-muted/20 px-3 py-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-medium">{snapshot.title}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {new Date(snapshot.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => restoreSnapshot(snapshot.id)}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => deleteSnapshot(snapshot.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {snapshot.nodes.length} nodes · {snapshot.edges.length} links
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Save a snapshot to capture this canvas state.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex-1 min-h-0 px-2 pb-2 pt-3">
              <ChatMessageArea className="nodrag nowheel cursor-default">
                <ChatMessageAreaContent className="cursor-default">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                      <Sparkles className="h-5 w-5" />
                      Ask a question to generate artifacts.
                    </div>
                  ) : (
                    messages.map((message) => (
                      <ChatMessage key={message.id}>
                        <ChatMessageAvatar>
                          {message.role === "user" ? (
                            <ChatMessageAvatarUserIcon />
                          ) : (
                            <ChatMessageAvatarAssistantIcon />
                          )}
                        </ChatMessageAvatar>
                        <ChatMessageContainer>
                          <ChatMessageHeader>
                            <span className="text-sm font-medium">
                              {message.role === "user" ? "You" : "Assistant"}
                            </span>
                            <ChatMessageTimestamp createdAt={message.timestamp} />
                          </ChatMessageHeader>
                          <ChatMessageContent>
                            {message.role === "assistant" && message.steps?.length ? (
                              <ChatToolSteps steps={message.steps} isStreaming={message.isStreaming} />
                            ) : null}
                            {message.content.trim().length > 0 ? (
                              <ChatMessageMarkdown content={message.content} />
                            ) : null}
                            {message.attachments?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {message.attachments.map((attachment) => {
                                  const nodeTitle = nodeTitleById.get(attachment.artifactId);
                                  const label = nodeTitle || attachment.title;
                                  return (
                                  <Button
                                    key={attachment.artifactId}
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                      updateNodeData(attachment.artifactId, (current) => ({
                                        ...current,
                                        isExpanded: true,
                                      }));
                                    }}
                                  >
                                    {label ? `Open ${label}` : "Open document"}
                                  </Button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </ChatMessageContent>
                        </ChatMessageContainer>
                      </ChatMessage>
                    ))
                  )}
                </ChatMessageAreaContent>
                <ChatMessageAreaScrollButton alignment="right" />
              </ChatMessageArea>
            </div>

            <div
              className={cn(
                "border-t p-3 nodrag nowheel transition-shadow",
                isDraggingContext && "ring-2 ring-primary/30"
              )}
              onDrop={handleContextDrop}
              onDragOver={handleContextDragOver}
              onDragLeave={handleContextDragLeave}
            >
              <ChatInput onSubmit={handleSubmit} isStreaming={isStreaming} onStop={stopStreaming}>
                <ChatInputEditor
                  value={value}
                  onChange={onChange}
                  placeholder="Ask about tasks, sessions, teams..."
                  className="cursor-text"
                  onEnter={() => {
                    if (!isStreaming) {
                      handleSubmit();
                    }
                  }}
                />
                <ChatInputGroupAddon align="inline-end">
                  <ChatInputSubmitButton
                    isStreaming={isStreaming}
                    disabled={!parsed.content.trim()}
                  />
                </ChatInputGroupAddon>
              </ChatInput>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setChatPanelOpen(true)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
