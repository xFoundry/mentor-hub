"use client";

/**
 * Chat message content with inline citation support and data tables.
 *
 * Uses a custom Tiptap extension to render [source:N] markers as
 * interactive citation badges with tooltips. This preserves all
 * markdown formatting while adding rich citation interactivity.
 *
 * Also parses JSON code blocks containing arrays and renders them
 * as interactive data tables.
 *
 * During streaming, uses a lightweight renderer to avoid performance issues.
 */

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { getExtensions } from "@/components/editor/extensions";
import {
  setCitationContext,
  clearCitationContext,
  transformCitationsInContent,
} from "@/components/editor/extensions/citation-node";
import { ChatDataTable, parseDataTables } from "./chat-data-table";
import type { RichCitationData } from "@/types/chat";
import { cn } from "@/lib/utils";
import "@/components/editor/styles/editor.css";

interface ChatMessageContentProps {
  content: string;
  citations?: RichCitationData[];
  className?: string;
  isStreaming?: boolean;
}

/**
 * Lightweight streaming content renderer.
 * Used during streaming to avoid expensive Tiptap re-renders.
 */
function StreamingContent({ content }: { content: string }) {
  // Simple markdown-like rendering for streaming
  // Just preserve line breaks and basic formatting
  return (
    <div className="whitespace-pre-wrap break-words">
      {content}
      <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
    </div>
  );
}

/**
 * Full Tiptap renderer for completed messages.
 * Only mounts when message is complete to avoid re-creation during streaming.
 * Also extracts and renders JSON data tables.
 */
function TiptapContent({
  content,
  citations,
}: {
  content: string;
  citations: RichCitationData[];
}) {
  // Set citation context before rendering
  React.useEffect(() => {
    setCitationContext(citations);
    return () => clearCitationContext();
  }, [citations]);

  // Parse data tables from JSON code blocks
  const { tables, cleanContent } = React.useMemo(
    () => parseDataTables(content),
    [content]
  );

  // Check if content has citations
  const hasCitations = /\[source:\d+\]/i.test(cleanContent);

  // Transform content to include citation HTML nodes
  const processedContent = React.useMemo(() => {
    if (!hasCitations) return cleanContent;
    return transformCitationsInContent(cleanContent);
  }, [cleanContent, hasCitations]);

  // Create editor once - don't recreate on content changes
  const editor = useEditor({
    extensions: getExtensions(undefined, hasCitations),
    content: processedContent,
    editable: false,
    immediatelyRender: false,
  });

  // Update content when it changes (for any post-streaming updates)
  React.useEffect(() => {
    if (editor && processedContent) {
      // Use queueMicrotask to avoid synchronous state updates
      queueMicrotask(() => {
        if (!editor.isDestroyed) {
          editor.commands.setContent(processedContent);
        }
      });
    }
  }, [editor, processedContent]);

  // Render data tables and text content
  return (
    <>
      {/* Render extracted data tables */}
      {tables.map((table, i) => (
        <ChatDataTable key={i} data={table.data} title={table.title} />
      ))}

      {/* Render text content */}
      {cleanContent && (
        editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="whitespace-pre-wrap break-words">{cleanContent}</div>
        )
      )}
    </>
  );
}

/**
 * Render message content with inline citations.
 *
 * This component:
 * - Uses lightweight renderer during streaming for performance
 * - Switches to Tiptap with citations once streaming completes
 */
export function ChatMessageContent({
  content,
  citations = [],
  className,
  isStreaming = false,
}: ChatMessageContentProps) {
  if (!content) {
    return null;
  }

  return (
    <div
      data-slot="chat-message-content"
      className={cn(
        "[&_.ProseMirror]:outline-none [&_.ProseMirror]:p-0",
        "text-sm break-words",
        className
      )}
    >
      {isStreaming ? (
        <StreamingContent content={content} />
      ) : (
        <TiptapContent content={content} citations={citations} />
      )}
    </div>
  );
}
