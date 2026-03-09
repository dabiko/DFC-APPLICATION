/**
 * MultiSelectEditor — Checkbox-style option editor for multi-select questions.
 */

import { Plus, Trash2 } from 'lucide-react'
import type { AnswerOption } from '@/types/procedure'

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

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">Check all correct answers</p>
      {options.map((opt, idx) => (
        <div key={opt.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={opt.is_correct}
            onChange={(e) => updateOption(idx, { is_correct: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
            aria-label={`Mark option ${idx + 1} as correct`}
          />
          <input
            type="text"
            value={opt.text}
            onChange={(e) => updateOption(idx, { text: e.target.value })}
            placeholder={`Option ${idx + 1}`}
            className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          {options.length > 2 && (
            <button
              onClick={() => removeOption(idx)}
              className="p-1 text-gray-400 hover:text-red-500"
              aria-label="Remove option"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addOption}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        <Plus className="h-3 w-3" />
        Add Option
      </button>
    </div>
  )
}
