"use client";

/**
 * Artifact viewer panel for viewing and editing document artifacts.
 * Displays as a resizable panel to the right of the chat.
 */

import { useState } from "react";
import { X, Save, Sparkles, FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownContent } from "@/components/simple-ai/markdown-content";
import type { ArtifactData } from "@/types/chat";

interface ChatArtifactViewerProps {
  artifact: ArtifactData;
  onClose: () => void;
  onRequestEdit: (instruction: string) => void;
  onSave: () => void;
}

export function ChatArtifactViewer({
  artifact,
  onClose,
  onRequestEdit,
  onSave,
}: ChatArtifactViewerProps) {
  const [editInstruction, setEditInstruction] = useState("");
  const [copied, setCopied] = useState(false);

  const payload = artifact.payload as {
    path?: string;
    content?: string;
    action?: string;
    saved?: boolean;
  } | undefined;

  const content = payload?.content || "";
  const isSaved = payload?.saved || artifact.id.includes("/saved/");
  const path = payload?.path || artifact.id;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editInstruction.trim()) {
      onRequestEdit(editInstruction.trim());
      setEditInstruction("");
    }
  };

  return (
    <div className="flex h-full flex-col bg-card/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
            <FileText className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{artifact.title}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {path} · {content.length.toLocaleString()} chars
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSaved ? (
            <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
              Saved
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              className="h-7 text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={content} />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No content</p>
          )}
        </div>
      </ScrollArea>

      {/* Edit with AI */}
      <div className="border-t p-4">
        <form onSubmit={handleEditSubmit} className="flex gap-2">
          <Input
            placeholder="Ask AI to edit this document..."
            value={editInstruction}
            onChange={(e) => setEditInstruction(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!editInstruction.trim()}
            className="h-9"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        </form>
      </div>
    </div>
  );
}
