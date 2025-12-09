import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";

export function getExtensions(placeholder?: string) {
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
    Markdown.configure({
      html: false,
      tightLists: true,
      linkify: true,
      transformPastedText: true,
      transformCopiedText: false,
    }),
  ];
}
