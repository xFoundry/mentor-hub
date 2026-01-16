import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Markdown } from "tiptap-markdown";
import { CitationNode } from "./citation-node";

export function getExtensions(placeholder?: string, includeCitations = false) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Placeholder.configure({
      placeholder: placeholder || "Start typing or paste markdown content...",
    }),
    CharacterCount,
    Link.configure({
      openOnClick: true,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: "https",
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer",
      },
    }),
    // Table support for markdown tables
    Table.configure({
      resizable: false,
      HTMLAttributes: {
        class: "prose-table",
      },
    }),
    TableRow,
    TableCell,
    TableHeader,
    Markdown.configure({
      html: true, // Enable HTML for citation nodes
      tightLists: true,
      linkify: true,
      transformPastedText: true,
      transformCopiedText: false,
    }),
    // Conditionally include citation support
    ...(includeCitations ? [CitationNode] : []),
  ];
}
