/**
 * StepCommentForm — Add/reply to step comment.
 */

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface StepCommentFormProps {
  onSubmit: (body: string) => Promise<void>
  placeholder?: string
  compact?: boolean
}

export function StepCommentForm({
  onSubmit,
  placeholder = 'Add a comment...',
  compact = false,
}: StepCommentFormProps) {
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(body.trim())
      setBody('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={compact ? 1 : 2}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
      />
      <button
        type="submit"
        disabled={!body.trim() || submitting}
        className="self-end rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
        aria-label="Send comment"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </form>
  )
}
