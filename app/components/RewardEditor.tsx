"use client";

import { useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  initialHtml: string;
  onChange: (html: string) => void;
};

function allowedLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function ToolButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active ?? false}
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
        active
          ? "border-[#b8ff3d] bg-[#b8ff3d] text-black"
          : "border-[#1c1f26] text-[#8b93a1] hover:border-[#3a3f4b] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function RewardEditor({ initialHtml, onChange }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: "https",
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
          isAllowedUri: (url, { defaultValidate }) =>
            defaultValidate(url) && allowedLink(url),
        },
      }),
    ],
    content: initialHtml || "",
    editorProps: {
      attributes: {
        class: "reward-editor-body",
        "aria-label": "Reward body",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  function openLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href;
    setLinkDraft(typeof previous === "string" && previous ? previous : "https://");
    setLinkError("");
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const href = linkDraft.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      setLinkError("");
      return;
    }
    if (!allowedLink(href)) {
      setLinkError("Link must start with http:// or https://");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
    setLinkError("");
  }

  return (
    <div className="reward-editor rounded-xl border border-[#1c1f26] bg-[#101215]">
      <div className="flex flex-wrap gap-1.5 border-b border-[#1c1f26] p-2">
        <ToolButton
          label="Heading"
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolButton>
        <ToolButton
          label="Subheading"
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolButton>
        <ToolButton
          label="Bold"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Bold
        </ToolButton>
        <ToolButton
          label="Italic"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          Italic
        </ToolButton>
        <ToolButton
          label="Bulleted list"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </ToolButton>
        <ToolButton
          label="Link"
          active={editor?.isActive("link") || linkOpen}
          onClick={openLink}
        >
          Link
        </ToolButton>
      </div>

      {linkOpen && (
        <div className="flex flex-col gap-2 border-b border-[#1c1f26] p-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="reward-link-url">
            Link URL
          </label>
          <input
            id="reward-link-url"
            value={linkDraft}
            onChange={(event) => setLinkDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://"
            className="min-w-0 flex-1 rounded-lg border border-[#1c1f26] bg-[#0c0d10] px-3 py-1.5 text-sm focus:border-[#3a3f4b] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyLink}
              className="rounded-lg bg-[#b8ff3d] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#a3e635]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                setLinkOpen(false);
                setLinkError("");
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-[#8b93a1] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {linkError ? (
        <p className="px-3 pt-2 text-xs text-red-400" role="alert">
          {linkError}
        </p>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
}
