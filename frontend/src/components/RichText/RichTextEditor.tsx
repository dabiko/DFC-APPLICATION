/**
 * RichTextEditor
 *
 * TipTap-based rich-text editor used for procedure description, step
 * Instructions, and step example scenarios. Replaces plain <textarea> so
 * users can paste from Word/Google Docs/PDFs and keep their formatting.
 *
 * Storage: HTML string. Backend sanitizes via bleach before persisting; the
 * read-side <RichTextDisplay> sanitizes again with DOMPurify as defense in
 * depth.
 *
 * Toolbar v1: bold, italic, underline, H2/H3, bulleted/numbered lists, link.
 * Tables and images are intentionally out of scope — they multiply edge
 * cases (sanitization, print/PDF export, storage) and can be added later.
 */

import { useCallback, useEffect, type FC } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Quote,
  Code as CodeIcon,
  Undo2,
  Redo2,
  Eraser,
} from 'lucide-react'
import './richTextStyles.css'

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
  /** Tailwind classes appended to the editor surface. Use to set min/max height. */
  editorClassName?: string
  ariaLabel?: string
}

export const RichTextEditor: FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing or paste from Word/Google Docs…',
  readOnly = false,
  className = '',
  editorClassName = '',
  ariaLabel,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // We disable a couple of StarterKit defaults that aren't in our
        // sanitization allowlist or aren't useful for this app.
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder,
        showOnlyCurrent: false,
      }),
    ],
    content: value || '',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: `rich-text rich-text-editor-surface focus:outline-none px-3 py-2 ${editorClassName}`,
        'aria-label': ariaLabel || 'Rich text editor',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? '' : ed.getHTML()
      onChange(html)
    },
  })

  // Keep editor content in sync if `value` is changed externally
  // (e.g. by the "Use as Instructions" attachment action). We compare the
  // current HTML to avoid clobbering the user's caret on every keystroke.
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  // Toggle the editable state when readOnly changes (e.g. step-owner mode)
  useEffect(() => {
    if (!editor) return
    if (editor.isEditable === readOnly) {
      editor.setEditable(!readOnly)
    }
  }, [readOnly, editor])

  if (!editor) return null

  return (
    <div
      className={`rich-text-editor rounded-lg border-2 border-gray-200 bg-gray-50/50 transition-colors focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700/50 dark:focus-within:border-blue-400 dark:focus-within:bg-gray-700 ${className}`}
    >
      {!readOnly && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

const Toolbar: FC<{ editor: Editor }> = ({ editor }) => {
  // Ask for a URL when toggling a link. Empty input clears the link.
  const handleSetLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous || 'https://')
    if (url === null) return // cancelled
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-gray-700 px-1.5 py-1">
      <ToolbarButton
        icon={<BoldIcon className="h-3.5 w-3.5" />}
        label="Bold (Ctrl+B)"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<ItalicIcon className="h-3.5 w-3.5" />}
        label="Italic (Ctrl+I)"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={<UnderlineIcon className="h-3.5 w-3.5" />}
        label="Underline (Ctrl+U)"
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<Heading2 className="h-3.5 w-3.5" />}
        label="Heading 2"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        icon={<Heading3 className="h-3.5 w-3.5" />}
        label="Heading 3"
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<List className="h-3.5 w-3.5" />}
        label="Bulleted list"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={<ListOrdered className="h-3.5 w-3.5" />}
        label="Numbered list"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={<Quote className="h-3.5 w-3.5" />}
        label="Quote"
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        icon={<CodeIcon className="h-3.5 w-3.5" />}
        label="Code block"
        isActive={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<LinkIcon className="h-3.5 w-3.5" />}
        label="Link"
        isActive={editor.isActive('link')}
        onClick={handleSetLink}
      />
      <ToolbarButton
        icon={<Eraser className="h-3.5 w-3.5" />}
        label="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      />

      <div className="ml-auto flex items-center gap-0.5">
        <ToolbarButton
          icon={<Undo2 className="h-3.5 w-3.5" />}
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          icon={<Redo2 className="h-3.5 w-3.5" />}
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </div>
    </div>
  )
}

const ToolbarButton: FC<{
  icon: React.ReactNode
  label: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
}> = ({ icon, label, isActive, disabled, onClick }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault() /* don't steal focus from editor */}
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={`rounded p-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      isActive
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
    }`}
  >
    {icon}
  </button>
)

const ToolbarDivider: FC = () => <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
