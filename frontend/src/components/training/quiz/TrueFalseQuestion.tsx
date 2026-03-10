/**
 * TrueFalseQuestion — True/False radio buttons.
 */

import type { VersionOption } from '../types'
import { cn } from '@/utils/cn'

interface TrueFalseQuestionProps {
  options: VersionOption[]
  selectedOptionIds: string[]
  onSelect: (optionId: string) => void
}

export function TrueFalseQuestion({
  options,
  selectedOptionIds,
  onSelect,
}: TrueFalseQuestionProps) {
  return (
    <div className="flex gap-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={cn(
            'flex-1 rounded-lg border p-4 text-sm font-medium text-center transition-colors',
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
