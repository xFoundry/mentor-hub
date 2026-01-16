"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { FileText, MessageSquare, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentArtifactData } from "@/types/canvas";
import { useCanvas } from "@/contexts/canvas-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type DocumentNodeType = Node<DocumentArtifactData, "documentArtifact">;

type DocumentPayload = {
  content?: string;
  format?: string;
  documents?: Array<{
    id: string;
    title?: string;
    content?: string;
    summary?: string;
    sourceNumber?: number;
    query?: string;
  }>;
};

export function DocumentArtifactNode({ data, selected, id }: NodeProps<DocumentNodeType>) {
  const { updateNodeData, focusedNodeId, openChatPanel } = useCanvas();
  const payload = data?.payload as DocumentPayload | undefined;
  const origin = data?.origin as { tool_name?: string; query?: string; chat_block_id?: string } | undefined;
  const isFocused = focusedNodeId === id;
  const documents = useMemo(() => payload?.documents ?? [], [payload?.documents]);
  const isGrouped = documents.length > 0;
  const [activeDocId, setActiveDocId] = useState(documents[0]?.id ?? "document");
  const activeDoc = isGrouped
    ? documents.find((doc) => doc.id === activeDocId) ?? documents[0]
    : undefined;
  const content = isGrouped ? activeDoc?.content ?? "" : payload?.content ?? "";
  const isEmpty = content.trim().length === 0;
  const titleValue = data?.title ?? "";
  const summary = useMemo(() => {
    if (data?.summary) return data.summary;
    if (isGrouped) {
      if (activeDoc?.summary) return activeDoc.summary;
      if (content) return content.replace(/\s+/g, " ").slice(0, 180);
      return `${documents.length} sources collected.`;
    }
    if (!content) return "No content yet.";
    return content.replace(/\s+/g, " ").slice(0, 180);
  }, [activeDoc?.summary, content, data?.summary, documents.length, isGrouped]);
  const wordCount = useMemo(() => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  }, [content]);
  const isExpanded = Boolean(data?.isExpanded);
  const toolLabel = useMemo(() => {
    const tool = origin?.tool_name ?? "";
    if (!tool) return null;
    if (tool.includes("search_text")) return "Docs";
    if (tool.includes("search_chunks")) return "Chunks";
    if (tool.includes("search_summaries")) return "Summaries";
    if (tool.includes("search_rag")) return "RAG";
    if (tool.includes("search_graph")) return "Graph";
    return tool.replace(/_/g, " ");
  }, [origin?.tool_name]);

  const setExpanded = useCallback(
    (open: boolean) => {
      updateNodeData(id, (current) => ({
        ...current,
        isExpanded: open,
      }));
    },
    [id, updateNodeData]
  );

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      updateNodeData(id, (current) => ({
        ...current,
        title: nextTitle,
        titleEdited: true,
      }));
    },
    [id, updateNodeData]
  );

  const updateDocumentEntry = useCallback(
    (
      docId: string,
      updater: (entry: NonNullable<DocumentPayload["documents"]>[number]) => NonNullable<DocumentPayload["documents"]>[number]
    ) => {
      updateNodeData(id, (current) => {
        const currentPayload = (current as any)?.payload as DocumentPayload | undefined;
        const existingDocs = currentPayload?.documents ?? [];
        const nextDocs = existingDocs.map((doc) => (doc.id === docId ? updater(doc) : doc));
        return {
          ...current,
          summary:
            docId === activeDocId
              ? nextDocs.find((doc) => doc.id === docId)?.summary ?? current?.summary
              : current?.summary,
          payload: {
            ...currentPayload,
            documents: nextDocs,
          },
        };
      });
    },
    [activeDocId, id, updateNodeData]
  );

  useEffect(() => {
    if (!isGrouped) return;
    if (!documents.find((doc) => doc.id === activeDocId)) {
      setActiveDocId(documents[0]?.id ?? "document");
    }
  }, [activeDocId, documents, isGrouped]);

  return (
    <>
      <div
        className={cn(
          "min-w-[260px] max-w-[360px] rounded-2xl border bg-card px-4 py-4 shadow-sm transition-shadow",
          selected && "ring-2 ring-primary/40",
          isFocused && "shadow-lg ring-2 ring-primary/30"
        )}
        onDoubleClick={() => setExpanded(true)}
      >
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
              <FileText className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={titleValue}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  placeholder="Untitled document"
                  className={cn(
                    "nodrag h-6 w-full max-w-[200px] bg-transparent text-sm font-semibold",
                    "border-b border-transparent focus:border-border focus:outline-none",
                    "placeholder:text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    isEmpty
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-500/10 text-emerald-600"
                  )}
                >
                  {isGrouped ? `${documents.length} sources` : isEmpty ? "Draft" : "Editable"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {summary}
              </div>
              <div className="text-[11px] text-muted-foreground/70">
                {isGrouped
                  ? "Double-click to review sources."
                  : isEmpty
                    ? "Double-click to start writing."
                    : `${wordCount} words`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {toolLabel ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="cursor-default">
                    {toolLabel}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs text-xs">
                    {origin?.query ? `Query: ${origin.query}` : "Document source"}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : null}
            {origin?.chat_block_id ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openChatPanel(origin.chat_block_id)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="nodrag h-8 gap-1.5"
              onClick={() => setExpanded(true)}
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {isEmpty ? "Start with a brief outline or paste notes here." : "Click edit to update the draft."}
        </div>
      </div>

      <Dialog open={isExpanded} onOpenChange={setExpanded}>
        <DialogContent
          className={cn(
            "!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0",
            "!w-[100vw] !h-[100svh] !max-w-[100vw] !max-h-[100svh] sm:!max-w-[100vw]",
            "!rounded-none !border-0 !p-0 !gap-0 !m-0 !flex !flex-col",
            "overflow-hidden"
          )}
        >
          <DialogHeader className="border-b px-6 py-4 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                  Document Title
                </DialogTitle>
                <input
                  value={titleValue}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Untitled document"
                  className={cn(
                    "mt-2 w-full max-w-[520px] bg-transparent text-xl font-semibold",
                    "border-b border-border/40 pb-2 focus:border-border focus:outline-none"
                  )}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Editing is live. Changes are saved to the canvas automatically.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {isGrouped ? `${documents.length} sources` : wordCount ? `${wordCount} words` : "Start drafting"}
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-1 min-h-0 flex-col px-6 py-4 overflow-hidden">
            {isGrouped ? (
              <Tabs value={activeDocId} onValueChange={setActiveDocId} className="flex flex-1 min-h-0 flex-col">
                <TabsList className="mb-4 w-fit shrink-0">
                  {documents.map((doc, index) => (
                    <TabsTrigger key={doc.id} value={doc.id}>
                      {doc.title ?? `Source ${index + 1}`}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {documents.map((doc) => (
                  <TabsContent key={doc.id} value={doc.id} className="flex-1 min-h-0">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <input
                        value={doc.title ?? ""}
                        onChange={(event) => {
                          const nextTitle = event.target.value;
                          updateDocumentEntry(doc.id, (entry) => ({
                            ...entry,
                            title: nextTitle,
                          }));
                        }}
                        placeholder="Source title"
                        className={cn(
                          "w-full max-w-[420px] bg-transparent text-sm font-semibold text-foreground",
                          "border-b border-border/40 pb-1 focus:border-border focus:outline-none"
                        )}
                      />
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground/70">
                        {doc.sourceNumber ? <span>Source #{doc.sourceNumber}</span> : null}
                        {doc.query ? <span>Query: {doc.query}</span> : null}
                      </div>
                    </div>
                    <RichTextEditor
                      value={doc.content ?? ""}
                      onChange={(nextValue) => {
                        updateDocumentEntry(doc.id, (entry) => ({
                          ...entry,
                          content: nextValue,
                          summary: nextValue.replace(/\s+/g, " ").trim().slice(0, 160),
                        }));
                      }}
                      size="lg"
                      className="flex-1 min-h-0"
                      showCharacterCount
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <RichTextEditor
                value={content}
                onChange={(nextValue) => {
                  updateNodeData(id, (current) => ({
                    ...current,
                    summary: nextValue.replace(/\s+/g, " ").trim().slice(0, 160),
                    payload: {
                      ...(current as any)?.payload,
                      content: nextValue,
                      format: "markdown",
                    },
                  }));
                }}
                size="lg"
                className="flex-1 min-h-0"
                showCharacterCount
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
