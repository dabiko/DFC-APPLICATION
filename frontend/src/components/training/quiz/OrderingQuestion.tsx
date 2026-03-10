/**
 * OrderingQuestion — Ordered items with move up/down buttons.
 */

import { ChevronUp, ChevronDown } from 'lucide-react'
import type { VersionOption } from '../types'

interface OrderingQuestionProps {
  options: VersionOption[]
  ordering: string[]
  onReorder: (fromIndex: number, toIndex: number) => void
}

export function OrderingQuestion({ options, ordering, onReorder }: OrderingQuestionProps) {
  return (
    <div className="space-y-2">
      {ordering.map((optId, idx) => {
        const opt = options.find((o) => o.id === optId)
        if (!opt) return null
        return (
          <div
            key={optId}
            className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
          >
            <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}.</span>
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{opt.text}</span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => onReorder(idx, idx - 1)}
                disabled={idx === 0}
                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => onReorder(idx, idx + 1)}
                disabled={idx === ordering.length - 1}
                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
