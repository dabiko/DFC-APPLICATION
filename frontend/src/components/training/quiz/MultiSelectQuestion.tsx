/**
 * MultiSelectQuestion — Checkbox-style multi-select options.
 */

import { CheckCircle } from 'lucide-react'
import type { VersionOption } from '../types'
import { cn } from '@/utils/cn'

interface MultiSelectQuestionProps {
  options: VersionOption[]
  selectedOptionIds: string[]
  onToggle: (optionId: string) => void
}

export function MultiSelectQuestion({
  options,
  selectedOptionIds,
  onToggle,
}: MultiSelectQuestionProps) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isSelected = selectedOptionIds.includes(opt.id)
        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            className={cn(
              'w-full text-left rounded-lg border p-3 text-sm transition-colors flex items-center gap-2',
              isSelected
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center',
                isSelected
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 dark:border-gray-600'
              )}
            >
              {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
            </div>
            <span className="text-gray-700 dark:text-gray-300">{opt.text}</span>
          </button>
        )
      })}
    </div>
  )
}
