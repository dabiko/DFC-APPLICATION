/**
 * OrderingEditor — Drag-and-drop correct order editor.
 */

import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import type { AnswerOption } from '@/types/procedure'

interface OrderingEditorProps {
  options: AnswerOption[]
  onChange: (options: AnswerOption[]) => void
}

export function OrderingEditor({ options, onChange }: OrderingEditorProps) {
  const addItem = () => {
    const newOption: AnswerOption = {
      id: `temp-${Date.now()}`,
      question: '',
      text: '',
      is_correct: true,
      correct_order: options.length + 1,
      order: options.length,
    }
    onChange([...options, newOption])
  }

  const updateItem = (index: number, text: string) => {
    onChange(options.map((opt, i) => (i === index ? { ...opt, text } : opt)))
  }

  const removeItem = (index: number) => {
    const updated = options
      .filter((_, i) => i !== index)
      .map((opt, i) => ({ ...opt, correct_order: i + 1, order: i }))
    onChange(updated)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...options]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onChange(updated.map((opt, i) => ({ ...opt, correct_order: i + 1, order: i })))
  }

  const moveDown = (index: number) => {
    if (index >= options.length - 1) return
    const updated = [...options]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onChange(updated.map((opt, i) => ({ ...opt, correct_order: i + 1, order: i })))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">
        Arrange items in the correct order. Trainees will see them shuffled.
      </p>
      {options.map((opt, idx) => (
        <div
          key={opt.id}
          className="flex items-center gap-2 rounded-md bg-gray-50 p-2 dark:bg-gray-700/50"
        >
          <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}</span>
          <input
            type="text"
            value={opt.text}
            onChange={(e) => updateItem(idx, e.target.value)}
            placeholder={`Item ${idx + 1}`}
            className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <button
            onClick={() => moveUp(idx)}
            disabled={idx === 0}
            className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30"
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => moveDown(idx)}
            disabled={idx >= options.length - 1}
            className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30"
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          {options.length > 2 && (
            <button
              onClick={() => removeItem(idx)}
              className="p-1 text-gray-400 hover:text-red-500"
              aria-label="Remove item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        <Plus className="h-3 w-3" />
        Add Item
      </button>
    </div>
  )
}
