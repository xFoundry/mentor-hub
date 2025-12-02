"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { getExtensions } from "./extensions";
import "./styles/editor.css";

export interface EditorViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
}

export function EditorViewer({
  content,
  className,
  ...props
}: EditorViewerProps) {
  const editor = useEditor({
    extensions: getExtensions(),
    content,
    editable: false,
    immediatelyRender: false, // Required for React 19 + SSR
  });

  // Sync content changes
  React.useEffect(() => {
    if (editor && content !== undefined) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!content) {
    return null;
  }

  return (
    <div
      data-slot="editor-viewer"
      className={cn(
        "[&_.ProseMirror]:outline-none [&_.ProseMirror]:p-0",
        className
      )}
      {...props}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
