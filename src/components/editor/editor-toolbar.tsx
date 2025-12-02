"use client";

import type { Editor } from "@tiptap/react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolbarButton({
  icon: Icon,
  label,
  shortcut,
  isActive,
  onClick,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={isActive}
          onPressedChange={onClick}
          disabled={disabled}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <span className="text-xs text-muted-foreground">{shortcut}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1.5">
      {/* Text formatting */}
      <ToolbarButton
        icon={Bold}
        label="Bold"
        shortcut="Ctrl+B"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={Italic}
        label="Italic"
        shortcut="Ctrl+I"
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={Strikethrough}
        label="Strikethrough"
        shortcut="Ctrl+Shift+S"
        isActive={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        icon={Code}
        label="Inline Code"
        shortcut="Ctrl+E"
        isActive={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
      />

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Headings */}
      <ToolbarButton
        icon={Heading1}
        label="Heading 1"
        shortcut="Ctrl+Alt+1"
        isActive={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        icon={Heading2}
        label="Heading 2"
        shortcut="Ctrl+Alt+2"
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        icon={Heading3}
        label="Heading 3"
        shortcut="Ctrl+Alt+3"
        isActive={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists & Blockquote */}
      <ToolbarButton
        icon={List}
        label="Bullet List"
        shortcut="Ctrl+Shift+8"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="Numbered List"
        shortcut="Ctrl+Shift+7"
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={Quote}
        label="Blockquote"
        shortcut="Ctrl+Shift+B"
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* History */}
      <ToolbarButton
        icon={Undo}
        label="Undo"
        shortcut="Ctrl+Z"
        isActive={false}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      />
      <ToolbarButton
        icon={Redo}
        label="Redo"
        shortcut="Ctrl+Y"
        isActive={false}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      />
    </div>
  );
}
