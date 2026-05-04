/**
 * RichTextDisplay
 *
 * Read-only renderer for HTML produced by RichTextEditor. Sanitizes with
 * DOMPurify (defense-in-depth — the backend already sanitized with bleach
 * on save).
 *
 * Use this on detail pages, the trainee training view, and review screens.
 * For card-style truncated previews, prefer `htmlToPlainSnippet` so cards
 * never render raw HTML or break their layout with editor markup.
 */

import { useMemo, type FC } from 'react'
import DOMPurify from 'dompurify'
import './richTextStyles.css'

export interface RichTextDisplayProps {
  html: string
  className?: string
}

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'a',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'hr',
]

const ALLOWED_ATTR = ['href', 'target', 'rel']

export const RichTextDisplay: FC<RichTextDisplayProps> = ({ html, className = '' }) => {
  const safe = useMemo(
    () =>
      DOMPurify.sanitize(html || '', {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
      }),
    [html]
  )

  if (!safe.trim()) return null

  return (
    <div
      className={`rich-text ${className}`}
      // The string has just been sanitized by DOMPurify against the same
      // allowlist the backend uses with bleach. Safe to inject.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
