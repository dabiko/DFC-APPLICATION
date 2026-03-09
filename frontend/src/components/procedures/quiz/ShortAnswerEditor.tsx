/**
 * ShortAnswerEditor — Text input + keyword auto-grade config.
 */

import { Plus, X } from 'lucide-react'
import { useState } from 'react'

interface ShortAnswerEditorProps {
  keywords: string[] | null
  onChange: (keywords: string[] | null) => void
}

export function ShortAnswerEditor({ keywords, onChange }: ShortAnswerEditorProps) {
  const [input, setInput] = useState('')

  const addKeyword = () => {
    const kw = input.trim().toLowerCase()
    if (kw && !(keywords || []).includes(kw)) {
      onChange([...(keywords || []), kw])
    }
    setInput('')
  }

  const removeKeyword = (kw: string) => {
    const updated = (keywords || []).filter((k) => k !== kw)
    onChange(updated.length > 0 ? updated : null)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Add keywords for auto-grading. If empty, manual grading is required.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {(keywords || []).map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300"
          >
            {kw}
            <button onClick={() => removeKeyword(kw)} className="hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addKeyword()
            }
          }}
          placeholder="Add keyword..."
          className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <button
          onClick={addKeyword}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700/50">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Preview: Trainee will see a text input field.{' '}
          {keywords && keywords.length > 0
            ? `Auto-graded if answer contains: ${keywords.join(', ')}`
            : 'Requires manual grading.'}
        </p>
      </div>
    </div>
  )
}
