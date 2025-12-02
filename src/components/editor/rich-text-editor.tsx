"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorToolbar } from "./editor-toolbar";
import { getExtensions } from "./extensions";
import "./styles/editor.css";

const editorVariants = cva(
  "border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex w-full flex-col rounded-md border bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden",
  {
    variants: {
      size: {
        sm: "[&_.ProseMirror]:min-h-[80px]",
        default: "[&_.ProseMirror]:min-h-[150px]",
        lg: "[&_.ProseMirror]:min-h-[300px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface RichTextEditorProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
    VariantProps<typeof editorVariants> {
  value?: string;
  onChange?: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  showToolbar?: boolean;
  showCharacterCount?: boolean;
}

export function RichTextEditor({
  value = "",
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  showToolbar = true,
  showCharacterCount = false,
  size,
  className,
  ...props
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: getExtensions(placeholder),
    content: value,
    editable: !disabled,
    immediatelyRender: false, // Required for React 19 + SSR
    onUpdate: ({ editor }) => {
      if (onChange) {
        // tiptap-markdown adds getMarkdown to storage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markdownStorage = (editor.storage as any).markdown as { getMarkdown?: () => string } | undefined;
        const markdown = markdownStorage?.getMarkdown?.() ?? editor.getText();
        onChange(markdown);
      }
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  // Sync external value changes
  React.useEffect(() => {
    if (editor && value !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdownStorage = (editor.storage as any).markdown as { getMarkdown?: () => string } | undefined;
      const currentContent = markdownStorage?.getMarkdown?.() ?? editor.getText();
      if (currentContent !== value) {
        editor.commands.setContent(value);
      }
    }
  }, [editor, value]);

  // Sync disabled state
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        data-slot="rich-text-editor"
        className={cn(
          editorVariants({ size }),
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        {...props}
      >
        {showToolbar && !disabled && <EditorToolbar editor={editor} />}
        <EditorContent
          editor={editor}
          className="flex-1 overflow-y-auto"
        />
        {showCharacterCount && (
          <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
            {characterCount.toLocaleString()} characters
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
