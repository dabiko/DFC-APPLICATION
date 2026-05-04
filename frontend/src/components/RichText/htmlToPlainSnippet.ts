/**
 * Strip HTML and collapse whitespace, returning a plain-text excerpt suitable
 * for cards and list previews. Optionally truncated with an ellipsis.
 *
 * Use this for card-style descriptions where rendering full HTML would break
 * the layout (line-clamp, fixed-height tiles, etc.).
 */

import DOMPurify from 'dompurify'

export function htmlToPlainSnippet(html: string, maxLength = 200): string {
  if (!html) return ''
  // Sanitize first so we strip any script/iframe content along with tags.
  const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  // DOMPurify with empty ALLOWED_TAGS returns text content with tags removed,
  // but still includes whitespace from block-level boundaries. Collapse it.
  const text = sanitized.replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}
