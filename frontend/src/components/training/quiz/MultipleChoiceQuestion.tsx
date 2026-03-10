/**
 * MultipleChoiceQuestion — Radio-style single-select options.
 */

import type { VersionOption } from '../types'
import { cn } from '@/utils/cn'

interface MultipleChoiceQuestionProps {
  options: VersionOption[]
  selectedOptionIds: string[]
  onSelect: (optionId: string) => void
}

export function MultipleChoiceQuestion({
  options,
  selectedOptionIds,
  onSelect,
}: MultipleChoiceQuestionProps) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={cn(
            'w-full text-left rounded-lg border p-3 text-sm transition-colors',
            selectedOptionIds.includes(opt.id)
              ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
          )}
        >
          {opt.text}
        </button>
      ))}
    </div>
  )
}
