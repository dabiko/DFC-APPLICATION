/**
 * MultiSelectEditor — Checkbox-style option editor for multi-select questions.
 */

import { Plus, Trash2, CheckSquare, Square } from 'lucide-react'
import type { AnswerOption } from '@/types/procedure'
import { cn } from '@/utils/cn'

interface MultiSelectEditorProps {
  options: AnswerOption[]
  onChange: (options: AnswerOption[]) => void
}

export function MultiSelectEditor({ options, onChange }: MultiSelectEditorProps) {
  const addOption = () => {
    const newOption: AnswerOption = {
      id: `temp-${Date.now()}`,
      question: '',
      text: '',
      is_correct: false,
      correct_order: null,
      order: options.length,
    }
    onChange([...options, newOption])
  }

  const updateOption = (index: number, data: Partial<AnswerOption>) => {
    onChange(options.map((opt, i) => (i === index ? { ...opt, ...data } : opt)))
  }

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  const optionLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const correctCount = options.filter((o) => o.is_correct).length

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Click options to mark as correct — multiple answers allowed
        {correctCount > 0 && (
          <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
            ({correctCount} selected)
          </span>
        )}
      </p>
      {options.map((opt, idx) => (
        <div
          key={opt.id}
          onClick={() => updateOption(idx, { is_correct: !opt.is_correct })}
          className={cn(
            'group flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all',
            opt.is_correct
              ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/15 ring-1 ring-purple-200 dark:ring-purple-800'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
          )}
        >
          {/* Option letter badge */}
          <div
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0 transition-colors',
              opt.is_correct
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            )}
          >
            {optionLabels[idx] || idx + 1}
          </div>

          {/* Correct indicator */}
          {opt.is_correct ? (
            <CheckSquare className="h-5 w-5 text-purple-500 flex-shrink-0" />
          ) : (
            <Square className="h-5 w-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
          )}

          {/* Option text input */}
          <input
            type="text"
            value={opt.text}
            onChange={(e) => {
              e.stopPropagation()
              updateOption(idx, { text: e.target.value })
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder={`Option ${optionLabels[idx] || idx + 1}`}
            className="flex-1 bg-transparent border-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-0 p-0"
          />

          {/* Remove button */}
          {options.length > 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeOption(idx)
              }}
              className="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              aria-label="Remove option"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-2.5 text-xs font-medium text-gray-500 hover:border-purple-400 hover:text-purple-600 dark:text-gray-400 dark:hover:border-purple-500 dark:hover:text-purple-400 transition-colors w-full justify-center"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Option
      </button>
    </div>
  )
}
